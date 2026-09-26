package com.profy256.profy.modules.progress.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "course_node_id", nullable = false)
    private UUID courseNodeId;

    /** Which admin-authored credential definition this row represents (V20). */
    @Column(name = "definition_id")
    private UUID definitionId;

    @Column(name = "cert_code", nullable = false, unique = true)
    private String certCode;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    // ── Issuance snapshot (V16): frozen at issue time ──────────────

    /** Name printed on the certificate — snapshotted from the user profile. */
    @Column(name = "recipient_name")
    private String recipientName;

    /** Course name printed on the certificate — snapshotted from taxonomy. */
    @Column(name = "course_name")
    private String courseName;

    @Column(name = "score")
    private Integer score;

    @Column(name = "total")
    private Integer total;

    @Column(name = "pass_percent")
    private Integer passPercent;

    /** When the learner confirmed their display name (= name verification). */
    @Column(name = "identity_verified_at")
    private Instant identityVerifiedAt;

    @Column(name = "email_sent_at")
    private Instant emailSentAt;

    @Column(name = "email_error")
    private String emailError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.issuedAt = now;
        this.createdAt = now;
    }

    public Certificate() {}

    public Certificate(UUID userId, UUID courseNodeId, String certCode) {
        this.userId = userId;
        this.courseNodeId = courseNodeId;
        this.certCode = certCode;
    }

    public Certificate(UUID userId, UUID courseNodeId, UUID definitionId, String certCode) {
        this.userId = userId;
        this.courseNodeId = courseNodeId;
        this.definitionId = definitionId;
        this.certCode = certCode;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getCourseNodeId() { return courseNodeId; }
    public void setCourseNodeId(UUID courseNodeId) { this.courseNodeId = courseNodeId; }
    public UUID getDefinitionId() { return definitionId; }
    public void setDefinitionId(UUID definitionId) { this.definitionId = definitionId; }
    public String getCertCode() { return certCode; }
    public void setCertCode(String certCode) { this.certCode = certCode; }
    public Instant getIssuedAt() { return issuedAt; }
    public void setIssuedAt(Instant issuedAt) { this.issuedAt = issuedAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }
    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }
    public Integer getPassPercent() { return passPercent; }
    public void setPassPercent(Integer passPercent) { this.passPercent = passPercent; }
    public Instant getIdentityVerifiedAt() { return identityVerifiedAt; }
    public void setIdentityVerifiedAt(Instant identityVerifiedAt) { this.identityVerifiedAt = identityVerifiedAt; }
    public Instant getEmailSentAt() { return emailSentAt; }
    public void setEmailSentAt(Instant emailSentAt) { this.emailSentAt = emailSentAt; }
    public String getEmailError() { return emailError; }
    public void setEmailError(String emailError) { this.emailError = emailError; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
