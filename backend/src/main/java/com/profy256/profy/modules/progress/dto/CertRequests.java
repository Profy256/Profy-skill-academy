package com.profy256.profy.modules.progress.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class CertRequests {

    /** Learner submits their answers; the server owns the answer key. */
    public record SubmitFinalTestRequest(
            @NotNull List<Integer> answers,
            /** Learner confirms the name printed on the certificate (= name verification). */
            Boolean confirmName,
            /** Optional: override the printed name. Blank keeps the profile name. */
            String recipientName
    ) {}

    /** Admin edit of the single certificate_settings row. */
    public record CertificateSettingsRequest(
            Integer testPriceCents,
            Integer testPriceUgx,
            @Min(0) @Max(100) Integer freeAttemptProgressPercent,
            @Min(1) @Max(100) Integer defaultPassPercent,
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
            Boolean certEnabled
    ) {}

    /** Admin creates/edits a credential definition (name, criteria, overrides). */
    public record CertificateDefinitionRequest(
            @NotBlank String name,
            String slug,
            String shortName,
            String description,
            String badgeColor,
            String courseNodeId,
            Boolean requireFinalTest,
            Boolean requireCourseComplete,
            @Min(1) @Max(100) Integer passPercent,
            @Min(0) @Max(100) Integer minProgressPercent,
            Boolean autoIssue,
            String certHeadingOverride,
            String certIntroOverride,
            String certAchievedOverride,
            String accentColorOverride,
            Boolean isEnabled,
            Integer sortOrder
    ) {}

    /** Admin manually awards a credential (standalone or catch-up grants). */
    public record ManualIssueRequest(
            @NotBlank String userEmail,
            String recipientName
    ) {}

    /** Admin-authored course-level final test. */
    public record FinalTestRequest(
            @NotNull List<FinalTestQuestion> questions,
            @Min(1) @Max(100) Integer passPercent
    ) {}

    public record FinalTestQuestion(
            @NotBlank String question,
            @NotNull @Min(2) List<String> options,
            @NotNull @Min(0) Integer answerIndex
    ) {}
}
