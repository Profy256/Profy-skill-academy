package com.profy256.profy.modules.progress.dto;

import java.time.Instant;
import java.util.List;

public class CertResponses {

    /** Everything the web app needs to render the certificate tab of a course. */
    public record FinalTestStateResponse(
            String courseId,
            String courseSlug,
            String courseName,
            Integer progressPercent,
            Integer progressThresholdPercent,
            Integer attemptsUsed,
            Boolean freeAttemptAvailable,
            Integer creditsAvailable,
            Boolean readyToAttempt,
            Boolean featureEnabled,
            String testTitle,
            String testInstructions,
            Integer passPercent,
            Pricing pricing,
            List<TestQuestion> questions,
            CertificateResponse certificate,
            List<CertificateResponse> certificates,
            Integer lessonCompleted,
            Integer lessonTotal
    ) {}

    public record Pricing(
            Integer stripeAmountCents,
            String stripeCurrency,
            Integer marzpayAmountUgx,
            String marzpayCurrency
    ) {}

    /** Deliberately omits answerIndex — the answer key never leaves the server. */
    public record TestQuestion(
            Integer index,
            String question,
            List<String> options
    ) {}

    public record SubmitResponse(
            Integer score,
            Integer total,
            Integer percent,
            Boolean passed,
            Integer attemptNumber,
            Boolean freeAttempt,
            Integer creditsRemaining,
            List<CertificateResponse> certificates
    ) {}

    public record CertificateResponse(
            String id,
            String code,
            String verifyUrl,
            String courseId,
            String courseSlug,
            String courseName,
            String definitionId,
            String definitionName,
            String recipientName,
            Integer score,
            Integer total,
            Integer passPercent,
            Instant issuedAt,
            Instant revokedAt,
            Instant identityVerifiedAt,
            Instant emailSentAt,
            Boolean revoked
    ) {}

    /** One admin-authored credential type. */
    public record CertificateDefinitionResponse(
            String id,
            String name,
            String slug,
            String shortName,
            String description,
            String badgeColor,
            String courseId,
            String courseSlug,
            String courseName,
            Boolean requireFinalTest,
            Boolean requireCourseComplete,
            Integer passPercent,
            Integer minProgressPercent,
            Boolean autoIssue,
            String certHeadingOverride,
            String certIntroOverride,
            String certAchievedOverride,
            String accentColorOverride,
            Boolean isEnabled,
            Integer sortOrder,
            Long issuedCount,
            Instant createdAt,
            Instant updatedAt
    ) {}

    /** Admin view of an issued credential. */
    public record IssuedCertificateResponse(
            String id,
            String code,
            String verifyUrl,
            String recipientName,
            String userEmail,
            String courseName,
            String definitionName,
            Integer score,
            Integer total,
            Integer passPercent,
            Instant issuedAt,
            Instant revokedAt,
            String emailError,
            Boolean revoked
    ) {}

    public record CertificateSettingsResponse(
            Integer testPriceCents,
            Integer testPriceUgx,
            Integer freeAttemptProgressPercent,
            Integer defaultPassPercent,
            String testTitle,
            String testInstructions,
            String certHeading,
            String certIntro,
            String certAchieved,
            String certCourseLabel,
            String certScoreLabel,
            String certDateLabel,
            String certCodeLabel,
            String certSignatureName,
            String certSignatureTitle,
            String certFooter,
            String certOrgName,
            String certPrimaryColor,
            String certAccentColor,
            String certPaperSize,
            Boolean certShowQr,
            Boolean certEnabled,
            Instant updatedAt
    ) {}
}
