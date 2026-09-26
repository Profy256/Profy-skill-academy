package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.progress.dto.ProgressResponses.ProfileStatsResponse;
import com.profy256.profy.modules.progress.entity.Bookmark;
import com.profy256.profy.modules.progress.entity.LessonProgress;
import com.profy256.profy.modules.progress.repository.BookmarkRepository;
import com.profy256.profy.modules.progress.repository.LessonProgressRepository;
import com.profy256.profy.modules.progress.repository.QuizAttemptRepository;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProgressServiceTest {

    private LessonProgressRepository lessonProgressRepository;
    private QuizAttemptRepository quizAttemptRepository;
    private BookmarkRepository bookmarkRepository;
    private LessonRepository lessonRepository;
    private TaxonomyNodeRepository taxonomyNodeRepository;
    private ProgressService service;

    @BeforeEach
    void setUp() {
        lessonProgressRepository = mock(LessonProgressRepository.class);
        quizAttemptRepository = mock(QuizAttemptRepository.class);
        bookmarkRepository = mock(BookmarkRepository.class);
        lessonRepository = mock(LessonRepository.class);
        taxonomyNodeRepository = mock(TaxonomyNodeRepository.class);
        service = new ProgressService(
                lessonProgressRepository,
                quizAttemptRepository,
                bookmarkRepository,
                lessonRepository,
                taxonomyNodeRepository,
                mock(ApplicationEventPublisher.class));
    }

    @Test
    void addBookmarkIsIdempotent() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        Bookmark existing = new Bookmark(userId, lessonId);
        when(bookmarkRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.of(existing));

        Bookmark result = service.addBookmark(userId, lessonId);

        assertThat(result).isSameAs(existing);
        verify(bookmarkRepository, never()).saveAndFlush(any());
    }

    @Test
    void addBookmarkPropagatesInsertRaceSoTheCallerCanRetry() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        when(bookmarkRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(new Lesson()));
        when(bookmarkRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        assertThatThrownBy(() -> service.addBookmark(userId, lessonId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void removeBookmarkOfMissingLessonIsANoOp() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        when(bookmarkRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());

        service.removeBookmark(userId, lessonId);

        verify(bookmarkRepository, never()).delete(any());
    }

    @Test
    void clearingCompletedAtWhenReopened() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(new Lesson()));
        LessonProgress progress = new LessonProgress(userId, lessonId, "completed");
        progress.setCompletedAt(Instant.now());
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.of(progress));
        when(lessonProgressRepository.save(any())).thenReturn(progress);

        LessonProgress saved = service.updateProgress(userId, lessonId, "in_progress");

        assertThat(saved.getStatus()).isEqualTo("in_progress");
        assertThat(saved.getCompletedAt()).isNull();
    }

    @Test
    void recordQuizAttemptRejectsScoreAboveTotal() {
        assertThatThrownBy(() -> service.recordQuizAttempt(UUID.randomUUID(), UUID.randomUUID(), 5, 4))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("score cannot exceed total");
    }

    @Test
    void recordQuizAttemptRejectsNegativeScore() {
        assertThatThrownBy(() -> service.recordQuizAttempt(UUID.randomUUID(), UUID.randomUUID(), -1, 5))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("score must be 0 or more");
    }

    @Test
    void recordQuizAttemptRejectsZeroTotal() {
        assertThatThrownBy(() -> service.recordQuizAttempt(UUID.randomUUID(), UUID.randomUUID(), 0, 0))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("total must be at least 1");
    }

    @Test
    void profileStatsKeepNullAverageWhenNoQuizzesTaken() {
        UUID userId = UUID.randomUUID();
        when(taxonomyNodeRepository.findByNodeTypeAndIsActiveTrue("course")).thenReturn(List.of());
        when(quizAttemptRepository.averageScoreByUserId(userId)).thenReturn(null);

        ProfileStatsResponse stats = service.getProfileStats(userId);

        assertThat(stats.quizzesTaken()).isZero();
        assertThat(stats.avgQuizScore()).isNull();
    }

    @Test
    void profileStatsRoundAverageToTwoDecimalFraction() {
        UUID userId = UUID.randomUUID();
        when(taxonomyNodeRepository.findByNodeTypeAndIsActiveTrue("course")).thenReturn(List.of());
        when(quizAttemptRepository.countByUserId(userId)).thenReturn(3L);
        when(quizAttemptRepository.averageScoreByUserId(userId)).thenReturn(0.83333);

        ProfileStatsResponse stats = service.getProfileStats(userId);

        assertThat(stats.avgQuizScore()).isEqualTo(0.83);
    }

    @Test
    void courseIsCompleteOnlyWhenEveryPublishedLessonIsCompleted() {
        UUID userId = UUID.randomUUID();
        UUID courseNodeId = UUID.randomUUID();
        when(lessonProgressRepository.countPublishedLessons(courseNodeId)).thenReturn(3L);
        when(lessonProgressRepository.countCompletedLessonsInCourse(userId, courseNodeId)).thenReturn(2L);

        assertThat(service.isCourseComplete(userId, courseNodeId)).isFalse();

        when(lessonProgressRepository.countCompletedLessonsInCourse(userId, courseNodeId)).thenReturn(3L);

        assertThat(service.isCourseComplete(userId, courseNodeId)).isTrue();
    }

    @Test
    void courseWithoutPublishedLessonsIsNeverComplete() {
        UUID userId = UUID.randomUUID();
        UUID courseNodeId = UUID.randomUUID();
        when(lessonProgressRepository.countPublishedLessons(courseNodeId)).thenReturn(0L);

        assertThat(service.isCourseComplete(userId, courseNodeId)).isFalse();
    }
}
