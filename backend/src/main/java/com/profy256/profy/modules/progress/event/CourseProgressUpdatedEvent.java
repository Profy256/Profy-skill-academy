package com.profy256.profy.modules.progress.event;

import java.util.UUID;

/**
 * Published whenever a learner's lesson progress changes.
 *
 * Progress writing stays a single-purpose operation; anything derived from it
 * (completion credentials, streaks, leaderboards) subscribes here instead of
 * being wired into the progress service.
 *
 * @param userId          learner
 * @param courseNodeId    course the lesson belongs to
 * @param progressPercent course completion percentage after this change
 * @param status          lesson status that triggered the event
 */
public record CourseProgressUpdatedEvent(
        UUID userId,
        UUID courseNodeId,
        int progressPercent,
        String status
) {}
