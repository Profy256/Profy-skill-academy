package com.profy256.profy.modules.billing.event;

import java.util.Map;
import java.util.UUID;

/**
 * Published by the billing module when a payment provider confirms money moved.
 *
 * Billing has no idea what the money was for — it only reports facts. Modules
 * that care (subscriptions, certificate credits, …) subscribe and decide what
 * to do. This keeps billing decoupled from every feature that charges money.
 *
 * @param provider   "stripe" | "marzpay" | "revenuecat"
 * @param reference  provider-side identifier (session id / collection reference)
 * @param userId     paying user, when known
 * @param metadata   free-form session/collection metadata, e.g.
 *                   {@code purpose=cert_test_credit, courseNodeId=…}
 */
public record PaymentSucceededEvent(
        String provider,
        String reference,
        UUID userId,
        Map<String, String> metadata
) {
    public static final String PURPOSE_CERT_TEST_CREDIT = "cert_test_credit";

    public String purpose() {
        return metadata == null ? null : metadata.get("purpose");
    }

    public String metadata(String key) {
        return metadata == null ? null : metadata.get(key);
    }
}
