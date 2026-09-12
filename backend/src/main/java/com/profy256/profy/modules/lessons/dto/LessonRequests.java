package com.profy256.profy.modules.lessons.dto;

import java.util.List;

public class LessonRequests {

    public record CreateLessonRequest(
            String nodeId,
            String title,
            String slug,
            String description,
            String explanation,
            List<String> objectives,
            List<String> examples,
            List<String> exercises,
            List<QuizInput> quizzes,
            String level,
            String status,
            Integer sortOrder
    ) {}

    public record QuizInput(
            String question,
            List<String> options,
            Integer answerIndex
    ) {}

    public record VideoInput(
            String youtubeUrl,
            String youtubeVideoId,
            String title,
            String channel,
            Boolean isPrimary,
            String curatorStatus,
            String notes
    ) {}
}
