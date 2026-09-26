package com.profy256.profy.platform.email;

/**
 * Outbound email port (Dependency Inversion).
 *
 * Business code depends on this interface only. Resend is one adapter; adding
 * SES/SMTP later means writing another {@code EmailSender} bean — no change to
 * certificate or notification logic.
 *
 * Contract: implementations must NEVER throw. Transport problems are returned
 * as a short description (or null on success) so a failed email can never
 * roll back the operation that triggered it.
 */
public interface EmailSender {

    /**
     * @return {@code null} on success, otherwise a short error description the
     *         caller may persist for diagnostics.
     */
    String send(EmailMessage message);
}
