package com.profy256.profy.modules.ai.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_admin_settings")
public class AiAdminSettings {

    @Id
    private UUID id;

    @Column(name = "active_provider_id")
    private UUID activeProviderId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getActiveProviderId() { return activeProviderId; }
    public void setActiveProviderId(UUID activeProviderId) { this.activeProviderId = activeProviderId; }
    public Instant getUpdatedAt() { return updatedAt; }
}
