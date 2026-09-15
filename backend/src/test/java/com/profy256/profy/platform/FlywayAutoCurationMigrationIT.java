package com.profy256.profy.platform;

import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.repository.LessonVideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Boots the real Spring context against a real PostgreSQL (Testcontainers) so Flyway
 * migrations V1–V9 actually run. Verifies the V9 auto-curation schema:
 * the `source` column (+ DB default), nullable `added_by`, the one-auto-video-per-lesson
 * partial unique index, and the review-queue query.
 *
 * Requires Docker (skipped automatically when no Docker daemon is available).
 *
 * NOTE: intentionally NOT @Transactional — the unique-index test expects a constraint
 * violation, which aborts a surrounding PostgreSQL transaction ("current transaction is
 * aborted"). Each statement instead runs in its own transaction; fixtures are UUID-unique
 * per test, so leftover rows never interfere with assertions.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class FlywayAutoCurationMigrationIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void overrideProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        // No Redis for this test — the full context boot needs a reachable factory.
        registry.add("spring.data.redis.url", () -> "redis://localhost:6390/0");
        // JwtTokenProvider requires a >= 256-bit secret; the dev default is shorter.
        registry.add("profy.jwt-secret", () -> "test-only-secret-key-with-at-least-32-bytes!!");
    }

    @Autowired
    private LessonVideoRepository lessonVideoRepository;

    @Autowired
    private JdbcTemplate jdbc;

    private UUID lessonId;
    private UUID adminId;
    private UUID nodeId;

    @BeforeEach
    void createLessonFixture() {
        adminId = UUID.randomUUID();
        nodeId = UUID.randomUUID();
        lessonId = UUID.randomUUID();

        jdbc.update("INSERT INTO admin_users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
                adminId, "it-" + adminId + "@profy.test", "hash", "IT Fixture");
        jdbc.update("INSERT INTO taxonomy_nodes (id, node_type, name, slug, depth) VALUES (?, 'course', ?, ?, 0)",
                nodeId, "IT Course " + nodeId, "it-course-" + nodeId);
        jdbc.update("""
                INSERT INTO lessons (id, node_id, title, slug, level, status, sort_order, created_by)
                VALUES (?, ?, ?, ?, 'beginner', 'published', 0, ?)
                """, lessonId, nodeId, "IT Lesson " + lessonId, "it-lesson-" + lessonId, adminId);
    }

    private LessonVideo newVideo(UUID lesson, String source, String status, UUID addedBy, boolean primary) {
        LessonVideo v = new LessonVideo();
        v.setId(UUID.randomUUID());
        v.setLessonId(lesson);
        v.setYoutubeVideoId("dQw4w9WgXcQ");
        v.setTitle("Test Video");
        if (source != null) v.setSource(source);
        v.setCuratorStatus(status);
        v.setAddedBy(addedBy);
        v.setIsPrimary(primary);
        return v;
    }

    @Test
    void v9Migration_sourceColumnDefaultsToCurated() {
        // Raw insert omitting the `source` column — exercises the actual DB default from V9.
        UUID videoId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO lesson_videos (id, lesson_id, youtube_video_id, title, is_primary, curator_status, added_by)
                VALUES (?, ?, 'dQw4w9WgXcQ', 'Legacy Curated Video', true, 'approved', ?)
                """, videoId, lessonId, adminId);

        LessonVideo reloaded = lessonVideoRepository.findById(videoId).orElseThrow();
        assertThat(reloaded.getSource()).isEqualTo("curated");
        assertThat(reloaded.getAddedBy()).isEqualTo(adminId);
    }

    @Test
    void v9Migration_addedByIsNullable_autoVideoPersistsWithoutAuthor() {
        LessonVideo saved = lessonVideoRepository.saveAndFlush(
                newVideo(lessonId, "auto", "pending", null, true));

        LessonVideo reloaded = lessonVideoRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getSource()).isEqualTo("auto");
        assertThat(reloaded.getCuratorStatus()).isEqualTo("pending");
        assertThat(reloaded.getAddedBy()).isNull();
    }

    @Test
    void v9Migration_oneAutoVideoPerLesson_enforcedByPartialUniqueIndex() {
        // First auto video persists fine...
        lessonVideoRepository.saveAndFlush(newVideo(lessonId, "auto", "pending", null, true));

        // ...a second auto video for the SAME lesson violates the partial unique index.
        assertThatThrownBy(() -> lessonVideoRepository.saveAndFlush(newVideo(lessonId, "auto", "pending", null, true)))
                .isInstanceOf(DataIntegrityViolationException.class);

        // ...but a DIFFERENT lesson can have its own auto video.
        UUID otherLesson = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO lessons (id, node_id, title, slug, level, status, sort_order, created_by)
                VALUES (?, ?, ?, ?, 'beginner', 'published', 0, ?)
                """, otherLesson, nodeId, "IT Lesson " + otherLesson, "it-lesson-" + otherLesson, adminId);
        lessonVideoRepository.saveAndFlush(newVideo(otherLesson, "auto", "pending", null, true));

        // ...and multiple CURATED videos per lesson remain fine (index is partial).
        lessonVideoRepository.saveAndFlush(newVideo(lessonId, "curated", "approved", adminId, false));
        lessonVideoRepository.saveAndFlush(newVideo(lessonId, "curated", "approved", adminId, false));
    }

    @Test
    void reviewQueue_includesPendingAutoVideos_andBrokenVideos() {
        LessonVideo pendingAuto = newVideo(lessonId, "auto", "pending", null, true);
        lessonVideoRepository.saveAndFlush(pendingAuto);

        // Curated+pending is NOT a queue item — finishing that review is the curator's in-flight job.
        LessonVideo pendingCurated = newVideo(lessonId, "curated", "pending", adminId, false);
        lessonVideoRepository.saveAndFlush(pendingCurated);

        LessonVideo flagged = newVideo(lessonId, "curated", "flagged", adminId, false);
        lessonVideoRepository.saveAndFlush(flagged);

        LessonVideo unavailable = newVideo(lessonId, "curated", "unavailable", adminId, false);
        lessonVideoRepository.saveAndFlush(unavailable);

        LessonVideo approved = newVideo(lessonId, "curated", "approved", adminId, false);
        lessonVideoRepository.saveAndFlush(approved);

        Set<UUID> ids = lessonVideoRepository.findReviewQueue().stream()
                .map(LessonVideo::getId)
                .collect(Collectors.toSet());

        assertThat(ids).contains(pendingAuto.getId(), flagged.getId(), unavailable.getId());
        assertThat(ids).doesNotContain(pendingCurated.getId(), approved.getId());
    }

    @Test
    void v9Migration_existingCuratedRowsBackfilledAsCurated() {
        // Simulates a pre-V9 row: inserted with defaults, source column NOT set.
        Map<String, Object> countBefore = jdbc.queryForMap(
                "SELECT count(*) AS n FROM lesson_videos WHERE lesson_id = ?", lessonId);
        assertThat(((Number) countBefore.get("n")).intValue()).isZero();

        lessonVideoRepository.saveAndFlush(newVideo(lessonId, "curated", "approved", adminId, true));

        Map<String, Object> bySource = jdbc.queryForMap(
                "SELECT source, count(*) AS n FROM lesson_videos WHERE lesson_id = ? GROUP BY source", lessonId);
        assertThat(bySource.get("source")).isEqualTo("curated");
    }
}
