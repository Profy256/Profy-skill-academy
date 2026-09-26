package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.progress.dto.ProgressResponses.*;
import com.profy256.profy.modules.progress.entity.Bookmark;
import com.profy256.profy.modules.progress.entity.LessonProgress;
import com.profy256.profy.modules.progress.entity.QuizAttempt;
import com.profy256.profy.modules.progress.repository.BookmarkRepository;
import com.profy256.profy.modules.progress.repository.LessonProgressRepository;
import com.profy256.profy.modules.progress.repository.QuizAttemptRepository;
import com.profy256.profy.modules.progress.event.CourseProgressUpdatedEvent;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import org.springframework.context.ApplicationEventPublisher;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProgressService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ProgressService.class);

    private final LessonProgressRepository lessonProgressRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final BookmarkRepository bookmarkRepository;
    private final LessonRepository lessonRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ProgressService(LessonProgressRepository lessonProgressRepository,
                           QuizAttemptRepository quizAttemptRepository,
                           BookmarkRepository bookmarkRepository,
                           LessonRepository lessonRepository,
                           TaxonomyNodeRepository taxonomyNodeRepository,
                           ApplicationEventPublisher eventPublisher) {
        this.lessonProgressRepository = lessonProgressRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.lessonRepository = lessonRepository;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public LessonProgress updateProgress(UUID userId, UUID lessonId, String status) {
        if (!"in_progress".equals(status) && !"completed".equals(status)) {
            throw new BadRequestException("status must be 'in_progress' or 'completed'");
        }

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("lesson not found"));

        LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)
                .orElse(new LessonProgress(userId, lessonId, status));

        progress.setStatus(status);
        if ("completed".equals(status)) {
            progress.setCompletedAt(Instant.now());
        } else {
            progress.setCompletedAt(null);
        }

        LessonProgress saved = lessonProgressRepository.save(progress);

        // Announce the change; credential issuance (and anything else derived
        // from progress) subscribes instead of being wired in here. Published
        // AFTER_COMMIT by listeners, so a failure downstream never rolls this back.
        if ("completed".equals(status)) {
            eventPublisher.publishEvent(new CourseProgressUpdatedEvent(
                    userId, lesson.getNodeId(), progressPercent(userId, lesson.getNodeId()), status));
        }
        return saved;
    }

    /** Percentage of published lessons of a course the user has completed. */
    private int progressPercent(UUID userId, UUID courseNodeId) {
        long total = lessonProgressRepository.countPublishedLessons(courseNodeId);
        if (total == 0) return 0;
        long completed = lessonProgressRepository.countCompletedLessonsInCourse(userId, courseNodeId);
        return (int) Math.round(completed * 100.0 / total);
    }

    @Transactional(readOnly = true)
    public ContinueLearningResponse getContinueLearning(UUID userId) {
        List<LessonProgress> inProgressItems =
                lessonProgressRepository.findProgressByStatusWithLessonInfo(userId, "in_progress");

        Map<UUID, Lesson> lessonsById = loadLessons(inProgressItems.stream()
                .map(LessonProgress::getLessonId)
                .toList());
        Map<UUID, TaxonomyNode> coursesById = loadCourses(lessonsById.values());

        List<ContinueLearningItem> items = new ArrayList<>();
        for (LessonProgress lp : inProgressItems) {
            Lesson lesson = lessonsById.get(lp.getLessonId());
            if (lesson == null) continue;

            TaxonomyNode courseNode = coursesById.get(lesson.getNodeId());
            if (courseNode == null) continue;

            LessonSummary summary = new LessonSummary(
                    lesson.getId(),
                    lesson.getTitle(),
                    lesson.getSlug(),
                    lesson.getLevel(),
                    lesson.getSortOrder()
            );

            items.add(new ContinueLearningItem(summary, courseNode.getSlug(), courseNode.getName(),
                    lp.getStatus(), lp.getUpdatedAt()));
        }

        return new ContinueLearningResponse(items);
    }

    private Map<UUID, Lesson> loadLessons(List<UUID> lessonIds) {
        if (lessonIds.isEmpty()) return Map.of();
        return lessonRepository.findAllById(lessonIds).stream()
                .collect(Collectors.toMap(Lesson::getId, l -> l));
    }

    private Map<UUID, TaxonomyNode> loadCourses(Iterable<Lesson> lessons) {
        List<UUID> courseIds = new ArrayList<>();
        for (Lesson lesson : lessons) {
            if (lesson.getNodeId() != null && !courseIds.contains(lesson.getNodeId())) {
                courseIds.add(lesson.getNodeId());
            }
        }
        if (courseIds.isEmpty()) return Map.of();
        return taxonomyNodeRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(TaxonomyNode::getId, t -> t));
    }

    @Transactional
    public Bookmark addBookmark(UUID userId, UUID lessonId) {
        // Idempotent per the API contract: saving twice keeps one bookmark.
        Optional<Bookmark> existing = bookmarkRepository.findByUserIdAndLessonId(userId, lessonId);
        if (existing.isPresent()) return existing.get();

        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("lesson not found"));

        Bookmark bookmark = new Bookmark(userId, lessonId);
        return bookmarkRepository.saveAndFlush(bookmark);
    }

    @Transactional
    public void removeBookmark(UUID userId, UUID lessonId) {
        bookmarkRepository.findByUserIdAndLessonId(userId, lessonId)
                .ifPresent(bookmarkRepository::delete);
    }

    @Transactional(readOnly = true)
    public BookmarkListResponse getBookmarks(UUID userId) {
        List<Bookmark> bookmarks = bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId);

        Map<UUID, Lesson> lessonsById = loadLessons(bookmarks.stream()
                .map(Bookmark::getLessonId)
                .toList());
        Map<UUID, TaxonomyNode> coursesById = loadCourses(lessonsById.values());

        List<BookmarkResponse> responses = new ArrayList<>();
        for (Bookmark b : bookmarks) {
            Lesson lesson = lessonsById.get(b.getLessonId());
            if (lesson == null) continue;

            TaxonomyNode courseNode = coursesById.get(lesson.getNodeId());
            String courseSlug = courseNode != null ? courseNode.getSlug() : "";
            String courseName = courseNode != null ? courseNode.getName() : "";

            responses.add(new BookmarkResponse(
                    lesson.getId(),
                    lesson.getSlug(),
                    lesson.getTitle(),
                    courseSlug,
                    courseName,
                    b.getCreatedAt()
            ));
        }

        return new BookmarkListResponse(responses);
    }

    @Transactional
    public QuizAttemptResponse recordQuizAttempt(UUID userId, UUID lessonId, Integer score, Integer total) {
        if (score == null || score < 0) {
            throw new BadRequestException("score must be 0 or more");
        }
        if (total == null || total < 1) {
            throw new BadRequestException("total must be at least 1");
        }
        if (score > total) {
            throw new BadRequestException("score cannot exceed total");
        }

        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("lesson not found"));

        boolean passed = score * 2 >= total;

        long previousAttempts = quizAttemptRepository.countByUserIdAndLessonId(userId, lessonId);

        QuizAttempt attempt = new QuizAttempt(userId, lessonId, score, total, passed, (int) previousAttempts + 1);
        QuizAttempt saved = quizAttemptRepository.save(attempt);

        return new QuizAttemptResponse(
                saved.getId(),
                saved.getScore(),
                saved.getTotal(),
                saved.getPassed(),
                saved.getAttemptNumber()
        );
    }

    @Transactional(readOnly = true)
    public ProfileStatsResponse getProfileStats(UUID userId) {
        long lessonsCompleted = lessonProgressRepository.countByUserIdAndStatus(userId, "completed");
        long lessonsInProgress = lessonProgressRepository.countByUserIdAndStatus(userId, "in_progress");
        long bookmarksCount = bookmarkRepository.countByUserId(userId);
        long quizzesTaken = quizAttemptRepository.countByUserId(userId);
        Double avgQuizScore = quizAttemptRepository.averageScoreByUserId(userId);

        int coursesCompleted = countCoursesCompleted(userId);

        return new ProfileStatsResponse(
                coursesCompleted,
                (int) lessonsCompleted,
                (int) lessonsInProgress,
                (int) bookmarksCount,
                (int) quizzesTaken,
                avgQuizScore == null ? null : Math.round(avgQuizScore * 100.0) / 100.0
        );
    }

    private int countCoursesCompleted(UUID userId) {
        List<TaxonomyNode> courseNodes = taxonomyNodeRepository.findByNodeTypeAndIsActiveTrue("course");

        int count = 0;
        for (TaxonomyNode course : courseNodes) {
            if (isCourseComplete(userId, course.getId())) {
                count++;
            }
        }
        return count;
    }

    @Transactional(readOnly = true)
    public boolean isCourseComplete(UUID userId, UUID courseNodeId) {
        long publishedLessons = lessonProgressRepository.countPublishedLessons(courseNodeId);
        if (publishedLessons == 0) return false;
        return lessonProgressRepository.countCompletedLessonsInCourse(userId, courseNodeId) == publishedLessons;
    }
}
