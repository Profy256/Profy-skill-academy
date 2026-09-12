package com.profy256.profy.modules.progress.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "bookmarks")
@IdClass(Bookmark.BookmarkId.class)
public class Bookmark {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public Bookmark() {}

    public Bookmark(UUID userId, UUID lessonId) {
        this.userId = userId;
        this.lessonId = lessonId;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public static class BookmarkId implements Serializable {
        private UUID userId;
        private UUID lessonId;

        public BookmarkId() {}

        public BookmarkId(UUID userId, UUID lessonId) {
            this.userId = userId;
            this.lessonId = lessonId;
        }

        public UUID getUserId() { return userId; }
        public UUID getLessonId() { return lessonId; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            BookmarkId that = (BookmarkId) o;
            return Objects.equals(userId, that.userId) && Objects.equals(lessonId, that.lessonId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, lessonId);
        }
    }
}
