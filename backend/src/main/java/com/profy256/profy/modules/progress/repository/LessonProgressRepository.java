package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, LessonProgress.LessonProgressId> {

    Optional<LessonProgress> findByUserIdAndLessonId(UUID userId, UUID lessonId);

    List<LessonProgress> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    long countByUserIdAndStatus(UUID userId, String status);

    @Query("SELECT COUNT(DISTINCT lp.lessonId) FROM LessonProgress lp WHERE lp.userId = :userId AND lp.status = 'completed'")
    long countDistinctCompletedLessons(@Param("userId") UUID userId);

    @Query("SELECT COUNT(l) FROM Lesson l WHERE l.status = 'published' AND l.nodeId = :courseNodeId")
    long countPublishedLessons(@Param("courseNodeId") UUID courseNodeId);

    @Query("SELECT COUNT(DISTINCT lp.lessonId) FROM LessonProgress lp " +
           "JOIN com.profy256.profy.modules.lessons.entity.Lesson l ON lp.lessonId = l.id " +
           "WHERE lp.userId = :userId AND lp.status = 'completed' AND l.nodeId = :courseNodeId")
    long countCompletedLessonsInCourse(
            @Param("userId") UUID userId,
            @Param("courseNodeId") UUID courseNodeId);

    @Query("SELECT lp FROM LessonProgress lp " +
           "JOIN com.profy256.profy.modules.lessons.entity.Lesson l ON lp.lessonId = l.id " +
           "JOIN com.profy256.profy.modules.taxonomy.entity.TaxonomyNode t ON l.nodeId = t.id " +
           "WHERE lp.userId = :userId AND lp.status = :status " +
           "ORDER BY lp.updatedAt DESC")
    List<LessonProgress> findProgressByStatusWithLessonInfo(
            @Param("userId") UUID userId,
            @Param("status") String status);
}
