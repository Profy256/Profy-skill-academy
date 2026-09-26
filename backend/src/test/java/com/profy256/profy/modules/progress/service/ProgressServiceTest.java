package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.progress.entity.Bookmark;
import com.profy256.profy.modules.progress.entity.LessonProgress;
import com.profy256.profy.modules.progress.repository.BookmarkRepository;
import com.profy256.profy.modules.progress.repository.LessonProgressRepository;
import com.profy256.profy.modules.progress.repository.QuizAttemptRepository;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProgressServiceTest {

    private LessonProgressRepository lessonProgressRepository;
    private BookmarkRepository bookmarkRepository;
    private LessonRepository lessonRepository;
    private ProgressService service;

    @BeforeEach
    void setUp() {
        lessonProgressRepository = mock(LessonProgressRepository.class);
        bookmarkRepository = mock(BookmarkRepository.class);
        lessonRepository = mock(LessonRepository.class);
        service = new ProgressService(
                lessonProgressRepository,
                mock(QuizAttemptRepository.class),
                bookmarkRepository,
                lessonRepository,
                mock(TaxonomyNodeRepository.class),
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
        verify(bookmarkRepository, never()).save(any());
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
}
