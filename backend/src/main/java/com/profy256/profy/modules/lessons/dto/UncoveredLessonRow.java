package com.profy256.profy.modules.lessons.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Projection row for the uncovered-lessons report: published lessons that have no video
 * rows at all (auto-curation found nothing or was disabled), with their parent course name.
 */
public record UncoveredLessonRow(
        UUID id,
        String title,
        String slug,
        Instant createdAt,
        String courseName
) {}
