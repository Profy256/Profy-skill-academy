package com.profy256.profy.modules.lessons.service;

import com.profy256.profy.modules.lessons.entity.AutoCurationSettings;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.repository.AutoCurationSettingsRepository;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.lessons.repository.LessonVideoRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Automatically sources a fallback video for lessons that have none.
 *
 * Product rule (2026-09-15): admin-curated videos always take priority. Auto videos are
 * created only for lessons with zero videos, are marked {@code source='auto'} with
 * {@code curator_status='pending'} (so they surface in the review queue), and are limited
 * to one per lesson by a partial unique index — races on the index are handled by
 * re-reading the winner's row instead of failing.
 *
 * Everything here is best-effort: if the YouTube API key is missing or the search fails,
 * the methods return without side effects and lesson reads are unaffected.
 */
@Component
public class AutoCurationService {

    private static final Logger log = LoggerFactory.getLogger(AutoCurationService.class);

    /** Fixed single-row id for the admin toggle (mirrors ai_admin_settings convention). */
    private static final UUID SETTINGS_ID = UUID.fromString("00000000-0000-0000-0000-000000000010");

    private final LessonRepository lessonRepository;
    private final LessonVideoRepository lessonVideoRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final YouTubeSearchService youTubeSearchService;
    private final AutoCurationSettingsRepository settingsRepository;

    public AutoCurationService(LessonRepository lessonRepository,
                               LessonVideoRepository lessonVideoRepository,
                               TaxonomyNodeRepository taxonomyNodeRepository,
                               YouTubeSearchService youTubeSearchService,
                               AutoCurationSettingsRepository settingsRepository) {
        this.lessonRepository = lessonRepository;
        this.lessonVideoRepository = lessonVideoRepository;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
        this.youTubeSearchService = youTubeSearchService;
        this.settingsRepository = settingsRepository;
    }

    /** True when the feature is on in admin settings AND a YouTube API key is configured. */
    public boolean isEnabled() {
        return isConfigured() && isSettingEnabled();
    }

    /** True when {@code YOUTUBE_API_KEY} is present. */
    public boolean isConfigured() {
        return youTubeSearchService.isConfigured();
    }

    /** True when the admin toggle is on (defaults to on if the settings row is missing). */
    public boolean isSettingEnabled() {
        return settingsRepository.findById(SETTINGS_ID)
                .map(AutoCurationSettings::isEnabled)
                .orElse(true);
    }

    @Transactional
    public void setSettingEnabled(boolean enabled) {
        AutoCurationSettings settings = settingsRepository.findById(SETTINGS_ID)
                .orElseGet(() -> {
                    AutoCurationSettings created = new AutoCurationSettings();
                    created.setId(SETTINGS_ID);
                    created.setEnabled(true);
                    return created;
                });
        settings.setEnabled(enabled);
        settingsRepository.save(settings);
        log.info("Auto-curation {}", enabled ? "enabled" : "disabled");
    }

    public Map<String, Object> getSettingsMap() {
        return Map.of("enabled", isSettingEnabled(), "keyConfigured", isConfigured());
    }

    /**
     * Auto-source a video for the given lesson if it has no videos yet.
     *
     * @return the persisted auto video, the pre-existing auto video (concurrent creation),
     *         or {@code null} when nothing could be sourced (disabled, already covered, no results).
     */
    @Transactional
    public LessonVideo autoCurateForLesson(UUID lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) {
            return null;
        }
        return autoCurateForLesson(lesson);
    }

    private LessonVideo autoCurateForLesson(Lesson lesson) {
        // One auto video per lesson, ever. Curated rows don't count — but if any video
        // (curated or auto) exists, the lesson is not "uncovered" and we leave it alone.
        if (lessonVideoRepository.findByLessonIdAndSource(lesson.getId(), "auto").isPresent()) {
            return null;
        }
        if (!lessonVideoRepository.findByLessonId(lesson.getId()).isEmpty()) {
            return null;
        }
        if (!youTubeSearchService.isConfigured()) {
            return null;
        }

        String query = buildQuery(lesson);
        List<YouTubeSearchService.VideoCandidate> candidates = youTubeSearchService.search(query);
        if (candidates.isEmpty()) {
            log.info("Auto-curation found no candidates for lesson '{}' (query: '{}')", lesson.getTitle(), query);
            return null;
        }

        Set<String> existingIds = lessonVideoRepository.findByLessonId(lesson.getId()).stream()
                .map(LessonVideo::getYoutubeVideoId)
                .collect(Collectors.toSet());

        for (YouTubeSearchService.VideoCandidate candidate : candidates) {
            if (existingIds.contains(candidate.videoId())) {
                continue;
            }
            return persistAutoVideo(lesson, query, candidate);
        }

        log.info("Auto-curation candidates for lesson '{}' were all already attached", lesson.getTitle());
        return null;
    }

    private LessonVideo persistAutoVideo(Lesson lesson, String query, YouTubeSearchService.VideoCandidate candidate) {
        LessonVideo video = new LessonVideo();
        video.setId(UUID.randomUUID());
        video.setLessonId(lesson.getId());
        video.setYoutubeVideoId(candidate.videoId());
        video.setTitle(candidate.title());
        video.setChannel(candidate.channel());
        video.setIsPrimary(true);
        video.setCuratorStatus("pending");
        video.setSource("auto");
        video.setNotes("Auto-sourced from YouTube search for \"" + query + "\". Pending curator review.");
        video.setAddedBy(null);

        try {
            LessonVideo saved = lessonVideoRepository.save(video);
            log.info("Auto-curated video {} for lesson '{}' (query: '{}')",
                    candidate.videoId(), lesson.getTitle(), query);
            return saved;
        } catch (DataIntegrityViolationException e) {
            // Lost a race against the one-auto-per-lesson unique index — keep the winner's row.
            log.info("Auto-curation race detected for lesson '{}', keeping existing auto video", lesson.getTitle());
            return lessonVideoRepository.findByLessonIdAndSource(lesson.getId(), "auto").orElse(null);
        }
    }

    /**
     * Search query from the lesson topic: full taxonomy path + lesson title.
     * Walks up the taxonomy tree to include category context, preventing
     * cross-contamination (e.g., "Gin" returning Go web framework instead of
     * Spanish language content).
     *
     * Example: "Spanish > Spanish from Zero > Basic greetings and phrases"
     * Falls back to "courseName lessonTitle" if ancestors are missing.
     */
    private String buildQuery(Lesson lesson) {
        String title = lesson.getTitle();
        String courseName = "";
        String categoryName = "";

        var courseNode = taxonomyNodeRepository.findById(lesson.getNodeId()).orElse(null);
        if (courseNode != null) {
            courseName = courseNode.getName();
            // Walk up to find the category (depth=0) for context
            UUID parentId = courseNode.getParentId();
            while (parentId != null) {
                var parentNode = taxonomyNodeRepository.findById(parentId).orElse(null);
                if (parentNode == null) break;
                if (parentNode.getDepth() == 0) {
                    categoryName = parentNode.getName();
                    break;
                }
                parentId = parentNode.getParentId();
            }
        }

        // Build query with category context to disambiguate similar terms
        String query;
        if (!categoryName.isEmpty() && !courseName.isEmpty()) {
            query = categoryName + " " + courseName + " " + title;
        } else if (!courseName.isEmpty()) {
            query = courseName + " " + title;
        } else {
            query = title;
        }

        query = query.replaceAll("\\s+", " ").trim();
        if (query.length() > 80) {
            query = query.substring(0, 80);
        }
        return query;
    }

    /**
     * Daily sweep: auto-fill published lessons that have no videos at all
     * (e.g. freshly imported course batches nobody has visited yet).
     *
     * @return the number of lessons that received an auto video.
     */
    @Transactional
    public int sweepUncoveredLessons(int maxLessons) {
        if (!youTubeSearchService.isConfigured()) {
            return 0;
        }

        List<Lesson> uncovered = lessonRepository.findPublishedLessonsWithoutVideos();
        if (uncovered.isEmpty()) {
            return 0;
        }
        if (uncovered.size() > maxLessons) {
            uncovered = uncovered.subList(0, maxLessons);
        }

        int filled = 0;
        for (Lesson lesson : uncovered) {
            if (autoCurateForLesson(lesson) != null) {
                filled++;
            }
        }
        if (filled > 0) {
            log.info("Auto-curation sweep filled {}/{} uncovered lessons", filled, uncovered.size());
        }
        return filled;
    }
}
