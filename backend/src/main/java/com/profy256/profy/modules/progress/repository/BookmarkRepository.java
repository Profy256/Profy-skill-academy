package com.profy256.profy.modules.progress.repository;

import com.profy256.profy.modules.progress.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Bookmark.BookmarkId> {

    Optional<Bookmark> findByUserIdAndLessonId(UUID userId, UUID lessonId);

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
