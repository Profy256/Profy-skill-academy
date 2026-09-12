package com.profy256.profy.modules.progress.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "lesson_progress")
@IdClass(LessonProgress.LessonProgressId.class)
public class LessonProgress {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(nullable = false)
    private String status;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (this.updatedAt == null) this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public LessonProgress() {}

    public LessonProgress(UUID userId, UUID lessonId, String status) {
        this.userId = userId;
        this.lessonId = lessonId;
        this.status = status;
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static class LessonProgressId implements Serializable {
        private UUID userId;
        private UUID lessonId;

        public LessonProgressId() {}

        public LessonProgressId(UUID userId, UUID lessonId) {
            this.userId = userId;
            this.lessonId = lessonId;
        }

        public UUID getUserId() { return userId; }
        public UUID getLessonId() { return lessonId; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            LessonProgressId that = (LessonProgressId) o;
            return Objects.equals(userId, that.userId) && Objects.equals(lessonId, that.lessonId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, lessonId);
        }
    }
}
