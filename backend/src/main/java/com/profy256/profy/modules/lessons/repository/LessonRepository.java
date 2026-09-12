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

    @Query("SELECT l FROM Lesson l WHERE LOWER(l.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(l.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Lesson> searchByTitleOrDescription(@Param("query") String query);
}
