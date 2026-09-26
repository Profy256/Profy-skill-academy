package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.TestAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestAttemptRepository extends JpaRepository<TestAttempt, UUID> {

    List<TestAttempt> findByUserIdAndCourseNodeIdOrderByCreatedAtDesc(UUID userId, UUID courseNodeId);

    @Query("SELECT COALESCE(MAX(t.attemptNumber), 0) FROM TestAttempt t " +
           "WHERE t.userId = :userId AND t.courseNodeId = :courseNodeId")
    int maxAttemptNumber(@Param("userId") UUID userId, @Param("courseNodeId") UUID courseNodeId);

    @Query("SELECT t FROM TestAttempt t " +
           "JOIN com.profy256.profy.modules.taxonomy.entity.TaxonomyNode n ON t.courseNodeId = n.id " +
           "ORDER BY t.createdAt DESC")
    List<TestAttempt> findAllRecent();
}
