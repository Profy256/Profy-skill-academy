package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.progress.dto.ProgressResponses.*;
import com.profy256.profy.modules.progress.entity.Bookmark;
import com.profy256.profy.modules.progress.entity.LessonProgress;
import com.profy256.profy.modules.progress.entity.QuizAttempt;
import com.profy256.profy.modules.progress.repository.BookmarkRepository;
import com.profy256.profy.modules.progress.repository.CertificateRepository;
import com.profy256.profy.modules.progress.repository.LessonProgressRepository;
import com.profy256.profy.modules.progress.repository.QuizAttemptRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final BookmarkRepository bookmarkRepository;
    private final CertificateRepository certificateRepository;
    private final LessonRepository lessonRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;

    public ProgressService(LessonProgressRepository lessonProgressRepository,
                           QuizAttemptRepository quizAttemptRepository,
                           BookmarkRepository bookmarkRepository,
                           CertificateRepository certificateRepository,
                           LessonRepository lessonRepository,
                           TaxonomyNodeRepository taxonomyNodeRepository) {
        this.lessonProgressRepository = lessonProgressRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.certificateRepository = certificateRepository;
        this.lessonRepository = lessonRepository;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
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
        }

        return lessonProgressRepository.save(progress);
    }

    @Transactional(readOnly = true)
    public ContinueLearningResponse getContinueLearning(UUID userId) {
        List<LessonProgress> inProgressItems =
                lessonProgressRepository.findProgressByStatusWithLessonInfo(userId, "in_progress");

        List<ContinueLearningItem> items = new ArrayList<>();
        for (LessonProgress lp : inProgressItems) {
            Lesson lesson = lessonRepository.findById(lp.getLessonId()).orElse(null);
            if (lesson == null) continue;

            TaxonomyNode courseNode = taxonomyNodeRepository.findById(lesson.getNodeId()).orElse(null);
            String courseSlug = courseNode != null ? courseNode.getSlug() : "";
            String courseName = courseNode != null ? courseNode.getName() : "";

            LessonSummary summary = new LessonSummary(
                    lesson.getId(),
                    lesson.getTitle(),
                    lesson.getSlug(),
                    lesson.getLevel(),
                    lesson.getSortOrder()
            );

            items.add(new ContinueLearningItem(summary, courseSlug, courseName, lp.getStatus(), lp.getUpdatedAt()));
        }

        return new ContinueLearningResponse(items);
    }

    @Transactional
    public Bookmark addBookmark(UUID userId, UUID lessonId) {
        bookmarkRepository.findByUserIdAndLessonId(userId, lessonId).ifPresent(b -> {
            throw new BadRequestException("lesson is already bookmarked");
        });

        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("lesson not found"));

        Bookmark bookmark = new Bookmark(userId, lessonId);
        return bookmarkRepository.save(bookmark);
    }

    @Transactional
    public void removeBookmark(UUID userId, UUID lessonId) {
        Bookmark bookmark = bookmarkRepository.findByUserIdAndLessonId(userId, lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("bookmark not found"));
        bookmarkRepository.delete(bookmark);
    }

    @Transactional(readOnly = true)
    public BookmarkListResponse getBookmarks(UUID userId) {
        List<Bookmark> bookmarks = bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<BookmarkResponse> responses = new ArrayList<>();
        for (Bookmark b : bookmarks) {
            Lesson lesson = lessonRepository.findById(b.getLessonId()).orElse(null);
            if (lesson == null) continue;

            TaxonomyNode courseNode = taxonomyNodeRepository.findById(lesson.getNodeId()).orElse(null);
            String courseSlug = courseNode != null ? courseNode.getSlug() : "";
            String courseName = courseNode != null ? courseNode.getName() : "";

            responses.add(new BookmarkResponse(
                    lesson.getId(),
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
        lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("lesson not found"));

        boolean passed = score * 2 >= total;

        long previousAttempts = quizAttemptRepository
                .findByUserIdAndLessonIdOrderByCreatedAtDesc(userId, lessonId).size();

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
        long bookmarksCount = bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId).size();
        long quizzesTaken = quizAttemptRepository.countByUserId(userId);
        Double avgQuizScore = quizAttemptRepository.averageScoreByUserId(userId);
        if (avgQuizScore == null) avgQuizScore = 0.0;

        int coursesCompleted = countCoursesCompleted(userId);

        return new ProfileStatsResponse(
                coursesCompleted,
                (int) lessonsCompleted,
                (int) lessonsInProgress,
                (int) bookmarksCount,
                (int) quizzesTaken,
                Math.round(avgQuizScore * 10.0) / 10.0
        );
    }

    private int countCoursesCompleted(UUID userId) {
        List<TaxonomyNode> courseNodes = taxonomyNodeRepository.findAll().stream()
                .filter(n -> "course".equals(n.getNodeType()))
                .filter(TaxonomyNode::getIsActive)
                .toList();

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
        List<Lesson> publishedLessons = lessonRepository.findByStatusAndNodeId("published", courseNodeId);
        if (publishedLessons.isEmpty()) return false;

        for (Lesson lesson : publishedLessons) {
            LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId()).orElse(null);
            if (progress == null || !"completed".equals(progress.getStatus())) {
                return false;
            }
        }
        return true;
    }
}
