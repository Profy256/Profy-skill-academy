package com.profy256.profy.platform.email;

import java.util.List;

/**
 * Outbound email message — a plain value object with no transport knowledge.
 */
public record EmailMessage(
        String to,
        String subject,
        String html,
        String attachmentName,
        byte[] attachmentBytes
) {
    public EmailMessage(String to, String subject, String html) {
        this(to, subject, html, null, null);
    }

    public List<String> recipients() {
        return List.of(to);
    }
}
