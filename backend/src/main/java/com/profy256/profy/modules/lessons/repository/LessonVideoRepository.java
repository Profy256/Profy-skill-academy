package com.profy256.profy.modules.lessons.repository;

import com.profy256.profy.modules.lessons.entity.LessonVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonVideoRepository extends JpaRepository<LessonVideo, UUID> {

    List<LessonVideo> findByLessonId(UUID lessonId);

    Optional<LessonVideo> findByLessonIdAndIsPrimaryTrue(UUID lessonId);

    List<LessonVideo> findByLessonIdAndCuratorStatus(UUID lessonId, String status);

    @Query(value = """
            SELECT lv.* FROM lesson_videos lv
            LEFT JOIN video_checks vc ON vc.lesson_video_id = lv.id
              AND vc.checked_at = (
                SELECT MAX(vc2.checked_at) FROM video_checks vc2
                WHERE vc2.lesson_video_id = lv.id
              )
            WHERE lv.curator_status IN ('flagged', 'unavailable')
            ORDER BY lv.updated_at DESC
            """, nativeQuery = true)
    List<LessonVideo> findReviewQueue();
}
