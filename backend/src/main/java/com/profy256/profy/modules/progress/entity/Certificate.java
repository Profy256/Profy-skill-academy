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

    @Column(name = "cert_code", nullable = false, unique = true)
    private String certCode;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @PrePersist
    protected void onCreate() {
        this.issuedAt = Instant.now();
    }

    public Certificate() {}

    public Certificate(UUID userId, UUID courseNodeId, String certCode) {
        this.userId = userId;
        this.courseNodeId = courseNodeId;
        this.certCode = certCode;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getCourseNodeId() { return courseNodeId; }
    public void setCourseNodeId(UUID courseNodeId) { this.courseNodeId = courseNodeId; }
    public String getCertCode() { return certCode; }
    public void setCertCode(String certCode) { this.certCode = certCode; }
    public Instant getIssuedAt() { return issuedAt; }
    public void setIssuedAt(Instant issuedAt) { this.issuedAt = issuedAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
}
