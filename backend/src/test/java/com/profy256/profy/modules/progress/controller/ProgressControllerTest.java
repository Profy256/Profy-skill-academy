package com.profy256.profy.modules.progress.controller;

import com.profy256.profy.modules.progress.dto.ProgressRequests.ProgressRequest;
import com.profy256.profy.modules.progress.entity.LessonProgress;
import com.profy256.profy.modules.progress.service.ProgressService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProgressControllerTest {

    private final ProgressService progressService = mock(ProgressService.class);
    private final ProgressController controller = new ProgressController(progressService);

    private Authentication authFor(UUID userId) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(userId.toString());
        return authentication;
    }

    /** Regression: completedAt is null while in_progress and must serialize as null, not NPE. */
    @Test
    void updateProgressReturnsNullCompletedAtWhileInProgress() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        LessonProgress progress = new LessonProgress(userId, lessonId, "in_progress");
        when(progressService.updateProgress(eq(userId), eq(lessonId), eq("in_progress")))
                .thenReturn(progress);

        ResponseEntity<Map<String, Object>> response = controller.updateProgress(
                lessonId, new ProgressRequest("in_progress"), authFor(userId));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsEntry("status", "in_progress");
        assertThat(response.getBody()).containsEntry("lessonId", lessonId);
        assertThat(response.getBody()).containsKey("completedAt");
        assertThat(response.getBody().get("completedAt")).isNull();
    }

    @Test
    void updateProgressReturnsCompletedAtWhenCompleted() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        Instant completedAt = Instant.parse("2026-09-26T10:00:00Z");
        LessonProgress progress = new LessonProgress(userId, lessonId, "completed");
        progress.setCompletedAt(completedAt);
        when(progressService.updateProgress(any(), any(), any())).thenReturn(progress);

        ResponseEntity<Map<String, Object>> response = controller.updateProgress(
                lessonId, new ProgressRequest("completed"), authFor(userId));

        assertThat(response.getBody()).containsEntry("completedAt", completedAt.toString());
    }
}
