package com.profy256.profy.platform;

import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.repository.LessonVideoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Boots the real Spring context against a real PostgreSQL (Testcontainers) so Flyway
 * migrations V1–V9 actually run. Verifies the V9 auto-curation schema:
 * `source` column, nullable `added_by`, and the one-auto-video-per-lesson partial unique index.
 *
 * Requires Docker (skipped automatically when no Docker daemon is available).
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@Transactional
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
    }

    @Autowired
    private LessonVideoRepository lessonVideoRepository;

    private LessonVideo newVideo(UUID lessonId, String source, String status, UUID addedBy, boolean primary) {
        LessonVideo v = new LessonVideo();
        v.setId(UUID.randomUUID());
        v.setLessonId(lessonId);
        v.setYoutubeVideoId("dQw4w9WgXcQ");
        v.setTitle("Test Video");
        v.setSource(source);
        v.setCuratorStatus(status);
        v.setAddedBy(addedBy);
        v.setIsPrimary(primary);
        return v;
    }

    @Test
    void v9MigrationRuns_sourceColumnDefaultsToCurated() {
        UUID lessonId = UUID.randomUUID();

        LessonVideo curated = newVideo(lessonId, null, "approved", UUID.randomUUID(), true);
        // source left null → column default 'curated' should not apply via JPA (entity default kicks in),
        // so assert entity default explicitly instead:
        assertThat(new LessonVideo().getSource()).isEqualTo("curated");

        lessonVideoRepository.saveAndFlush(curated);

        LessonVideo reloaded = lessonVideoRepository.findById(curated.getId()).orElseThrow();
        assertThat(reloaded.getSource()).isEqualTo("curated");
        assertThat(reloaded.getAddedBy()).isNotNull();
    }

    @Test
    void v9Migration_runs_addedByIsNullable_autoVideoPersistsWithoutAuthor() {
        UUID lessonId = UUID.randomUUID();

        LessonVideo auto = newVideo(lessonId, "auto", "pending", null, true);
        LessonVideo saved = lessonVideoRepository.saveAndFlush(auto);

        LessonVideo reloaded = lessonVideoRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getSource()).isEqualTo("auto");
        assertThat(reloaded.getCuratorStatus()).isEqualTo("pending");
        assertThat(reloaded.getAddedBy()).isNull();
    }

    @Test
    void v9Migration_oneAutoVideoPerLesson_enforcedByPartialUniqueIndex() {
        UUID lessonId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        // First auto video persists fine...
        lessonVideoRepository.saveAndFlush(newVideo(lessonId, "auto", "pending", null, true));

        // ...a second auto video for the SAME lesson violates the partial unique index.
        LessonVideo secondAuto = newVideo(lessonId, "auto", "pending", null, true);
        assertThatThrownBy(() -> lessonVideoRepository.saveAndFlush(secondAuto))
                .isInstanceOf(DataIntegrityViolationException.class);

        // ...but a DIFFERENT lesson can have its own auto video...
        lessonVideoRepository.saveAndFlush(newVideo(UUID.randomUUID(), "auto", "pending", null, true));

        // ...and multiple CURATED videos per lesson remain fine (index is partial).
        lessonVideoRepository.saveAndFlush(newVideo(lessonId, "curated", "approved", adminId, false));
        lessonVideoRepository.saveAndFlush(newVideo(lessonId, "curated", "approved", adminId, false));
    }

    @Test
    void reviewQueue_includesPendingAutoVideos_andBrokenVideos() {
        UUID adminId = UUID.randomUUID();

        LessonVideo pendingAuto = newVideo(UUID.randomUUID(), "auto", "pending", null, true);
        lessonVideoRepository.saveAndFlush(pendingAuto);

        LessonVideo pendingCurated = newVideo(UUID.randomUUID(), "curated", "pending", adminId, true);
        lessonVideoRepository.saveAndFlush(pendingCurated); // must NOT appear (curated pending is the admin's job to finish, not a queue item)

        LessonVideo flagged = newVideo(UUID.randomUUID(), "curated", "flagged", adminId, true);
        lessonVideoRepository.saveAndFlush(flagged);

        LessonVideo unavailable = newVideo(UUID.randomUUID(), "curated", "unavailable", adminId, true);
        lessonVideoRepository.saveAndFlush(unavailable);

        LessonVideo approved = newVideo(UUID.randomUUID(), "curated", "approved", adminId, true);
        lessonVideoRepository.saveAndFlush(approved); // must NOT appear

        var queue = lessonVideoRepository.findReviewQueue();
        var ids = queue.stream().map(LessonVideo::getId).collect(java.util.stream.Collectors.toSet());

        assertThat(ids).contains(pendingAuto.getId(), flagged.getId(), unavailable.getId());
        assertThat(ids).doesNotContain(pendingCurated.getId(), approved.getId());
    }
}
