package com.profy256.profy.modules.progress.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * A purchased final-test attempt. One credit == one attempt.
 * Created as 'pending' at checkout, flipped to 'unused' when the payment
 * settles (Stripe webhook / MarzPay webhook or poll), then 'consumed'
 * when the user actually sits the test.
 */
@Entity
@Table(name = "test_credits")
public class TestCredit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "course_node_id", nullable = false)
    private UUID courseNodeId;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "provider_ref", nullable = false)
    private String providerRef;

    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false, length = 8)
    private String currency = "usd";

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() { this.updatedAt = Instant.now(); }

    public TestCredit() {}

    public TestCredit(UUID userId, UUID courseNodeId, String provider, String providerRef,
                      Integer amount, String currency) {
        this.userId = userId;
        this.courseNodeId = courseNodeId;
        this.provider = provider;
        this.providerRef = providerRef;
        this.amount = amount;
        this.currency = currency;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getCourseNodeId() { return courseNodeId; }
    public void setCourseNodeId(UUID courseNodeId) { this.courseNodeId = courseNodeId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getProviderRef() { return providerRef; }
    public void setProviderRef(String providerRef) { this.providerRef = providerRef; }
    public Integer getAmount() { return amount; }
    public void setAmount(Integer amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public Instant getConsumedAt() { return consumedAt; }
    public void setConsumedAt(Instant consumedAt) { this.consumedAt = consumedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
