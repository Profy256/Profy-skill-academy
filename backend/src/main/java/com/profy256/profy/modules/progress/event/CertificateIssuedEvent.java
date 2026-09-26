package com.profy256.profy.modules.progress.event;

import java.util.UUID;

/**
 * Published after a certificate has been durably persisted.
 *
 * Subscribers (email delivery, analytics, future badge sync) live outside the
 * issuing service, so a broken notifier can never fail the issuance itself.
 *
 * @param certificateId database id of the issued credential
 * @param userId        holder of the credential
 * @param courseId      course the credential belongs to (may be null)
 */
public record CertificateIssuedEvent(
        UUID certificateId,
        UUID userId,
        UUID courseId
) {}
