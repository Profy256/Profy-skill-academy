package com.profy256.profy.modules.progress.listener;

import com.profy256.profy.modules.billing.event.PaymentSucceededEvent;
import com.profy256.profy.modules.progress.service.TestCreditGranter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Turns confirmed payments into certificate-test credits.
 *
 * Lives in the progress module because only this module knows what a credit is;
 * the billing module stays entirely unaware that certificates exist.
 *
 * Runs synchronously inside the publisher's transaction: if granting a credit
 * fails, the webhook fails and the provider retries — the learner is never
 * charged without receiving what they paid for. Idempotency comes from the
 * (provider, provider_ref) unique index, so provider retries are safe.
 */
@Component
public class PaymentCreditListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentCreditListener.class);

    private final TestCreditGranter granter;

    public PaymentCreditListener(TestCreditGranter granter) {
        this.granter = granter;
    }

    @EventListener
    @Transactional
    public void onPaymentSucceeded(PaymentSucceededEvent event) {
        if (!PaymentSucceededEvent.PURPOSE_CERT_TEST_CREDIT.equals(event.purpose())) return;

        String courseNodeId = event.metadata("courseNodeId");
        UUID courseId = null;
        try {
            courseId = (courseNodeId == null || courseNodeId.isBlank()) ? null : UUID.fromString(courseNodeId);
        } catch (IllegalArgumentException e) {
            log.warn("Payment {} carried a malformed courseNodeId", event.reference());
        }

        granter.grant(event.provider(), event.reference(), event.userId(), courseId);
    }
}
