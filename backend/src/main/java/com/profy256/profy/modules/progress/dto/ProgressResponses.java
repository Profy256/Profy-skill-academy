package com.profy256.profy.modules.progress.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ProgressResponses {

    public record LessonSummary(
            UUID id,
            String title,
            String slug,
            String level,
            Integer sortOrder
    ) {}

    public record ContinueLearningItem(
            LessonSummary lesson,
            String courseSlug,
            String courseName,
            String status,
            Instant updatedAt
    ) {}

    public record ContinueLearningResponse(
            List<ContinueLearningItem> items
    ) {}

    public record BookmarkResponse(
            UUID lessonId,
            String lessonSlug,
            String lessonTitle,
            String courseSlug,
            String courseName,
            Instant createdAt
    ) {}

    public record BookmarkListResponse(
            List<BookmarkResponse> items
    ) {}

    public record QuizAttemptResponse(
            UUID id,
            Integer score,
            Integer total,
            Boolean passed,
            Integer attemptNumber
    ) {}

    public record ProfileStatsResponse(
            Integer coursesCompleted,
            Integer lessonsCompleted,
            Integer lessonsInProgress,
            Integer bookmarksCount,
            Integer quizzesTaken,
            Double avgQuizScore
    ) {}
}
