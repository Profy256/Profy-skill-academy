package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    List<QuizAttempt> findByUserIdAndLessonIdOrderByCreatedAtDesc(UUID userId, UUID lessonId);

    long countByUserId(UUID userId);

    long countByUserIdAndLessonId(UUID userId, UUID lessonId);

    /** Average score per attempt as a fraction 0..1; NULL when the user has no attempts. */
    @Query("SELECT AVG(CAST(qa.score AS double) / CAST(NULLIF(qa.total, 0) AS double)) FROM QuizAttempt qa WHERE qa.userId = :userId")
    Double averageScoreByUserId(@Param("userId") UUID userId);
}
