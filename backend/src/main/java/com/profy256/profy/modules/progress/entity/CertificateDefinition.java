package com.profy256.profy.modules.progress.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * An admin-authored credential. Multiple definitions may point at the same
 * course (e.g. "Course Completion" + "Distinction"), and definitions with no
 * course are issued manually from the admin panel.
 */
@Entity
@Table(name = "certificate_definitions")
public class CertificateDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "text")
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "short_name", columnDefinition = "text")
    private String shortName;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "badge_color", nullable = false, length = 20)
    private String badgeColor = "#1f3a8a";

    /** NULL = standalone credential, granted manually by an admin. */
    @Column(name = "course_node_id")
    private UUID courseNodeId;

    @Column(name = "require_final_test", nullable = false)
    private Boolean requireFinalTest = true;

    @Column(name = "require_course_complete", nullable = false)
    private Boolean requireCourseComplete = false;

    @Column(name = "pass_percent", nullable = false)
    private Integer passPercent = 70;

    @Column(name = "min_progress_percent", nullable = false)
    private Integer minProgressPercent = 0;

    @Column(name = "auto_issue", nullable = false)
    private Boolean autoIssue = true;

    @Column(name = "cert_heading_override", columnDefinition = "text")
    private String certHeadingOverride;

    @Column(name = "cert_intro_override", columnDefinition = "text")
    private String certIntroOverride;

    @Column(name = "cert_achieved_override", columnDefinition = "text")
    private String certAchievedOverride;

    @Column(name = "accent_color_override", length = 20)
    private String accentColorOverride;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled = true;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_by")
    private UUID createdBy;

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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getShortName() { return shortName; }
    public void setShortName(String shortName) { this.shortName = shortName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBadgeColor() { return badgeColor; }
    public void setBadgeColor(String badgeColor) { this.badgeColor = badgeColor; }
    public UUID getCourseNodeId() { return courseNodeId; }
    public void setCourseNodeId(UUID courseNodeId) { this.courseNodeId = courseNodeId; }
    public Boolean getRequireFinalTest() { return requireFinalTest; }
    public void setRequireFinalTest(Boolean v) { this.requireFinalTest = v; }
    public Boolean getRequireCourseComplete() { return requireCourseComplete; }
    public void setRequireCourseComplete(Boolean v) { this.requireCourseComplete = v; }
    public Integer getPassPercent() { return passPercent; }
    public void setPassPercent(Integer passPercent) { this.passPercent = passPercent; }
    public Integer getMinProgressPercent() { return minProgressPercent; }
    public void setMinProgressPercent(Integer v) { this.minProgressPercent = v; }
    public Boolean getAutoIssue() { return autoIssue; }
    public void setAutoIssue(Boolean autoIssue) { this.autoIssue = autoIssue; }
    public String getCertHeadingOverride() { return certHeadingOverride; }
    public void setCertHeadingOverride(String v) { this.certHeadingOverride = v; }
    public String getCertIntroOverride() { return certIntroOverride; }
    public void setCertIntroOverride(String v) { this.certIntroOverride = v; }
    public String getCertAchievedOverride() { return certAchievedOverride; }
    public void setCertAchievedOverride(String v) { this.certAchievedOverride = v; }
    public String getAccentColorOverride() { return accentColorOverride; }
    public void setAccentColorOverride(String v) { this.accentColorOverride = v; }
    public Boolean getIsEnabled() { return isEnabled; }
    public void setIsEnabled(Boolean isEnabled) { this.isEnabled = isEnabled; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
