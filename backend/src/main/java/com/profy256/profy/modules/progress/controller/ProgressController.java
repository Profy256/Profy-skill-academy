package com.profy256.profy.modules.progress.controller;

import com.profy256.profy.modules.progress.dto.ProgressRequests.ProgressRequest;
import com.profy256.profy.modules.progress.dto.ProgressRequests.QuizAttemptRequest;
import com.profy256.profy.modules.progress.dto.ProgressResponses.*;
import com.profy256.profy.modules.progress.entity.Bookmark;
import com.profy256.profy.modules.progress.entity.LessonProgress;
import com.profy256.profy.modules.progress.service.ProgressService;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    @PutMapping("/lessons/{lessonId}/progress")
    public ResponseEntity<Map<String, Object>> updateProgress(
            @PathVariable UUID lessonId,
            @Valid @RequestBody ProgressRequest request,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        LessonProgress progress = progressService.updateProgress(userId, lessonId, request.status());
        // LinkedHashMap: Map.of rejects null values, and completedAt is null
        // while a lesson is still in_progress.
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", progress.getStatus());
        body.put("lessonId", progress.getLessonId());
        body.put("completedAt", progress.getCompletedAt() != null ? progress.getCompletedAt().toString() : null);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/progress/continue")
    public ResponseEntity<ContinueLearningResponse> getContinueLearning(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        ContinueLearningResponse response = progressService.getContinueLearning(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/library/bookmarks")
    public ResponseEntity<BookmarkListResponse> getBookmarks(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        BookmarkListResponse response = progressService.getBookmarks(userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/library/bookmarks/{lessonId}")
    public ResponseEntity<Map<String, Object>> addBookmark(
            @PathVariable UUID lessonId,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        Bookmark bookmark;
        try {
            bookmark = progressService.addBookmark(userId, lessonId);
        } catch (DataIntegrityViolationException race) {
            // Lost a concurrent double-save: the bookmark row now exists, read it in a fresh transaction.
            bookmark = progressService.addBookmark(userId, lessonId);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "lessonId", bookmark.getLessonId(),
                "createdAt", bookmark.getCreatedAt().toString()
        ));
    }

    @DeleteMapping("/library/bookmarks/{lessonId}")
    public ResponseEntity<Map<String, Object>> removeBookmark(
            @PathVariable UUID lessonId,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        progressService.removeBookmark(userId, lessonId);
        return ResponseEntity.ok(Map.of("message", "bookmark removed"));
    }

    @PostMapping("/lessons/{lessonId}/quiz-attempts")
    public ResponseEntity<QuizAttemptResponse> recordQuizAttempt(
            @PathVariable UUID lessonId,
            @Valid @RequestBody QuizAttemptRequest request,
            Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        QuizAttemptResponse response = progressService.recordQuizAttempt(userId, lessonId, request.score(), request.total());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/profile/stats")
    public ResponseEntity<ProfileStatsResponse> getProfileStats(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        ProfileStatsResponse response = progressService.getProfileStats(userId);
        return ResponseEntity.ok(response);
    }
}
