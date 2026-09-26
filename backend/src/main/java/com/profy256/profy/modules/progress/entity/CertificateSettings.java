package com.profy256.profy.modules.progress.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Single-row settings table (seeded by V19) holding everything an admin can
 * tune about the certificate feature: the price of a paid test attempt and
 * the wording/colours printed on the certificate itself.
 */
@Entity
@Table(name = "certificate_settings")
public class CertificateSettings {

    public static final UUID SINGLETON_ID = UUID.fromString("00000000-0000-0000-0000-000000000011");

    @Id
    private UUID id = SINGLETON_ID;

    // ── Pricing / access ────────────────────────────────────────────
    @Column(name = "test_price_cents", nullable = false)
    private Integer testPriceCents = 200;

    @Column(name = "test_price_ugx", nullable = false)
    private Integer testPriceUgx = 7500;

    @Column(name = "free_attempt_progress_percent", nullable = false)
    private Integer freeAttemptProgressPercent = 50;

    @Column(name = "default_pass_percent", nullable = false)
    private Integer defaultPassPercent = 70;

    // ── Test wording ────────────────────────────────────────────────
    @Column(name = "test_title", nullable = false, columnDefinition = "text")
    private String testTitle = "Final Certification Test";

    @Column(name = "test_instructions", nullable = false, columnDefinition = "text")
    private String testInstructions =
            "Answer every question. A score of {passPercent}% or higher earns your certificate.";

    // ── Certificate wording ─────────────────────────────────────────
    @Column(name = "cert_heading", nullable = false, columnDefinition = "text")
    private String certHeading = "Certificate of Completion";

    @Column(name = "cert_intro", nullable = false, columnDefinition = "text")
    private String certIntro = "This is to certify that";

    @Column(name = "cert_achieved", nullable = false, columnDefinition = "text")
    private String certAchieved = "has successfully completed the course";

    @Column(name = "cert_course_label", nullable = false, columnDefinition = "text")
    private String certCourseLabel = "Course";

    @Column(name = "cert_score_label", nullable = false, columnDefinition = "text")
    private String certScoreLabel = "Final Test Score";

    @Column(name = "cert_date_label", nullable = false, columnDefinition = "text")
    private String certDateLabel = "Date Issued";

    @Column(name = "cert_code_label", nullable = false, columnDefinition = "text")
    private String certCodeLabel = "Credential ID";

    @Column(name = "cert_signature_name", nullable = false, columnDefinition = "text")
    private String certSignatureName = "Dera Skul Academy";

    @Column(name = "cert_signature_title", nullable = false, columnDefinition = "text")
    private String certSignatureTitle = "Issuing Authority";

    @Column(name = "cert_footer", nullable = false, columnDefinition = "text")
    private String certFooter = "This credential can be verified at";

    @Column(name = "cert_org_name", nullable = false, columnDefinition = "text")
    private String certOrgName = "Dera Skul";

    // ── Certificate look ────────────────────────────────────────────
    @Column(name = "cert_primary_color", nullable = false, length = 20)
    private String certPrimaryColor = "#1f3a8a";

    @Column(name = "cert_accent_color", nullable = false, length = 20)
    private String certAccentColor = "#c9a227";

    @Column(name = "cert_paper_size", nullable = false, length = 20)
    private String certPaperSize = "landscape";

    @Column(name = "cert_show_qr", nullable = false)
    private Boolean certShowQr = true;

    @Column(name = "cert_enabled", nullable = false)
    private Boolean certEnabled = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @PrePersist
    protected void onCreate() { this.updatedAt = Instant.now(); }

    @PreUpdate
    protected void onUpdate() { this.updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Integer getTestPriceCents() { return testPriceCents; }
    public void setTestPriceCents(Integer v) { this.testPriceCents = v; }

    public Integer getTestPriceUgx() { return testPriceUgx; }
    public void setTestPriceUgx(Integer v) { this.testPriceUgx = v; }

    public Integer getFreeAttemptProgressPercent() { return freeAttemptProgressPercent; }
    public void setFreeAttemptProgressPercent(Integer v) { this.freeAttemptProgressPercent = v; }

    public Integer getDefaultPassPercent() { return defaultPassPercent; }
    public void setDefaultPassPercent(Integer v) { this.defaultPassPercent = v; }

    public String getTestTitle() { return testTitle; }
    public void setTestTitle(String v) { this.testTitle = v; }

    public String getTestInstructions() { return testInstructions; }
    public void setTestInstructions(String v) { this.testInstructions = v; }

    public String getCertHeading() { return certHeading; }
    public void setCertHeading(String v) { this.certHeading = v; }

    public String getCertIntro() { return certIntro; }
    public void setCertIntro(String v) { this.certIntro = v; }

    public String getCertAchieved() { return certAchieved; }
    public void setCertAchieved(String v) { this.certAchieved = v; }

    public String getCertCourseLabel() { return certCourseLabel; }
    public void setCertCourseLabel(String v) { this.certCourseLabel = v; }

    public String getCertScoreLabel() { return certScoreLabel; }
    public void setCertScoreLabel(String v) { this.certScoreLabel = v; }

    public String getCertDateLabel() { return certDateLabel; }
    public void setCertDateLabel(String v) { this.certDateLabel = v; }

    public String getCertCodeLabel() { return certCodeLabel; }
    public void setCertCodeLabel(String v) { this.certCodeLabel = v; }

    public String getCertSignatureName() { return certSignatureName; }
    public void setCertSignatureName(String v) { this.certSignatureName = v; }

    public String getCertSignatureTitle() { return certSignatureTitle; }
    public void setCertSignatureTitle(String v) { this.certSignatureTitle = v; }

    public String getCertFooter() { return certFooter; }
    public void setCertFooter(String v) { this.certFooter = v; }

    public String getCertOrgName() { return certOrgName; }
    public void setCertOrgName(String v) { this.certOrgName = v; }

    public String getCertPrimaryColor() { return certPrimaryColor; }
    public void setCertPrimaryColor(String v) { this.certPrimaryColor = v; }

    public String getCertAccentColor() { return certAccentColor; }
    public void setCertAccentColor(String v) { this.certAccentColor = v; }

    public String getCertPaperSize() { return certPaperSize; }
    public void setCertPaperSize(String v) { this.certPaperSize = v; }

    public Boolean getCertShowQr() { return certShowQr; }
    public void setCertShowQr(Boolean v) { this.certShowQr = v; }

    public Boolean getCertEnabled() { return certEnabled; }
    public void setCertEnabled(Boolean v) { this.certEnabled = v; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant v) { this.updatedAt = v; }

    public UUID getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(UUID v) { this.updatedBy = v; }

    /**
     * Detached clone. Lets a certificate definition override the heading or
     * accent colour for one credential without mutating the shared settings row.
     */
    public CertificateSettings copy() {
        CertificateSettings c = new CertificateSettings();
        c.testPriceCents = this.testPriceCents;
        c.testPriceUgx = this.testPriceUgx;
        c.freeAttemptProgressPercent = this.freeAttemptProgressPercent;
        c.defaultPassPercent = this.defaultPassPercent;
        c.testTitle = this.testTitle;
        c.testInstructions = this.testInstructions;
        c.certHeading = this.certHeading;
        c.certIntro = this.certIntro;
        c.certAchieved = this.certAchieved;
        c.certCourseLabel = this.certCourseLabel;
        c.certScoreLabel = this.certScoreLabel;
        c.certDateLabel = this.certDateLabel;
        c.certCodeLabel = this.certCodeLabel;
        c.certSignatureName = this.certSignatureName;
        c.certSignatureTitle = this.certSignatureTitle;
        c.certFooter = this.certFooter;
        c.certOrgName = this.certOrgName;
        c.certPrimaryColor = this.certPrimaryColor;
        c.certAccentColor = this.certAccentColor;
        c.certPaperSize = this.certPaperSize;
        c.certShowQr = this.certShowQr;
        c.certEnabled = this.certEnabled;
        c.updatedAt = this.updatedAt;
        return c;
    }
}
