package com.profy256.profy.modules.progress.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * One attempt at a course-level final certification test.
 * Lesson-level quizzes are practice only and are NOT recorded here.
 */
@Entity
@Table(name = "test_attempts")
public class TestAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "course_node_id", nullable = false)
    private UUID courseNodeId;

    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Integer total;

    @Column(nullable = false)
    private Boolean passed;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    /** True when this attempt was covered by the free allowance rather than a paid credit. */
    @Column(name = "free_attempt", nullable = false)
    private Boolean freeAttempt = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = Instant.now(); }

    public TestAttempt() {}

    public TestAttempt(UUID userId, UUID courseNodeId, Integer score, Integer total,
                       Boolean passed, Integer attemptNumber, Boolean freeAttempt) {
        this.userId = userId;
        this.courseNodeId = courseNodeId;
        this.score = score;
        this.total = total;
        this.passed = passed;
        this.attemptNumber = attemptNumber;
        this.freeAttempt = freeAttempt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getCourseNodeId() { return courseNodeId; }
    public void setCourseNodeId(UUID courseNodeId) { this.courseNodeId = courseNodeId; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }
    public Boolean getPassed() { return passed; }
    public void setPassed(Boolean passed) { this.passed = passed; }
    public Integer getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(Integer attemptNumber) { this.attemptNumber = attemptNumber; }
    public Boolean getFreeAttempt() { return freeAttempt; }
    public void setFreeAttempt(Boolean freeAttempt) { this.freeAttempt = freeAttempt; }
    public Instant getCreatedAt() { return createdAt; }
}
