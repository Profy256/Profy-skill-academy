package com.profy256.profy.modules.lessons.repository;

import com.profy256.profy.modules.lessons.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    Optional<Lesson> findBySlug(String slug);

    List<Lesson> findByStatusAndNodeId(String status, UUID nodeId);

    List<Lesson> findByNodeId(UUID nodeId);

    @Query("SELECT l FROM Lesson l WHERE LOWER(l.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(l.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Lesson> searchByTitleOrDescription(@Param("query") String query);

    /**
     * Published lessons that have no video rows at all — candidates for auto-curation.
     * (Ordering by created_at keeps the sweep deterministic and lets the job process
     * the oldest uncovered lessons first.)
     */
    @Query("""
            SELECT l FROM Lesson l
            WHERE l.status = 'published'
              AND NOT EXISTS (SELECT 1 FROM LessonVideo v WHERE v.lessonId = l.id)
            ORDER BY l.createdAt ASC
            """)
    List<Lesson> findPublishedLessonsWithoutVideos();
}
