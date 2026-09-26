package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.billing.BillingService;
import com.profy256.profy.modules.billing.event.PaymentSucceededEvent;
import com.profy256.profy.modules.progress.entity.CertificateSettings;
import com.profy256.profy.modules.progress.entity.TestCredit;
import com.profy256.profy.modules.progress.repository.TestCreditRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Checkout + settlement for paid certificate-test attempts.
 *
 * Progress -> Billing is a one-way dependency: this service asks billing to
 * move money and to report whether it moved, and owns everything about what
 * the money buys. Billing never learns that certificates exist.
 */
@Service
public class TestCreditCheckoutService {

    public static final String PURPOSE = PaymentSucceededEvent.PURPOSE_CERT_TEST_CREDIT;

    private final BillingService billingService;
    private final CertificateSettingsService settingsService;
    private final TestCreditRepository testCreditRepository;
    private final TestCreditGranter granter;
    private final ApplicationEventPublisher eventPublisher;

    public TestCreditCheckoutService(BillingService billingService,
                                     CertificateSettingsService settingsService,
                                     TestCreditRepository testCreditRepository,
                                     TestCreditGranter granter,
                                     ApplicationEventPublisher eventPublisher) {
        this.billingService = billingService;
        this.settingsService = settingsService;
        this.testCreditRepository = testCreditRepository;
        this.granter = granter;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Map<String, Object> startStripeCheckout(UUID userId, UUID courseNodeId,
                                                   String successUrl, String cancelUrl) {
        CertificateSettings s = settingsService.get();
        return billingService.createOneOffStripeCheckout(
                userId, s.getTestPriceCents(), "usd",
                "Dera Skul — certificate test attempt",
                baseMetadata(courseNodeId, "stripe", successUrl),
                successUrl, cancelUrl);
    }

    @Transactional
    public Map<String, Object> startMarzPayCheckout(UUID userId, UUID courseNodeId,
                                                    String phoneNumber, String country) {
        CertificateSettings s = settingsService.get();
        Map<String, Object> result = billingService.createOneOffMarzPayCollection(
                userId, s.getTestPriceUgx(), "UGX", phoneNumber, country,
                "Dera Skul - certificate test attempt",
                baseMetadata(courseNodeId, "marzpay", null));

        // Reserve the credit as pending so the poll/webhook can settle it.
        String reference = String.valueOf(result.get("reference"));
        if (!testCreditRepository.findByProviderAndProviderRef("marzpay", reference).isPresent()) {
            TestCredit pending = new TestCredit(userId, courseNodeId, "marzpay", reference,
                    s.getTestPriceUgx(), "UGX");
            pending.setStatus("pending");
            testCreditRepository.save(pending);
        }
        return result;
    }

    /**
     * Confirm settlement without a webhook, then return the current credit
     * status. Publishes the same event the webhook does so both paths run the
     * identical grant logic.
     */
    @Transactional
    public Map<String, Object> confirmPayment(String provider, String reference) {
        Optional<TestCredit> known = testCreditRepository.findByProviderAndProviderRef(provider, reference);
        String knownStatus = known.map(TestCredit::getStatus).orElse(null);

        if ("unused".equals(knownStatus) || "consumed".equals(knownStatus)) {
            return Map.of("status", knownStatus, "provider", provider, "reference", reference);
        }

        Map<String, String> providerState = billingService.queryPaymentStatus(provider, reference);
        String status = providerState.getOrDefault("status", "pending");

        if ("paid".equals(status)) {
            UUID userId = known.map(TestCredit::getUserId)
                    .orElseGet(() -> parseUuid(providerState.get("userId")));
            UUID courseNodeId = known.map(TestCredit::getCourseNodeId)
                    .orElseGet(() -> parseUuid(providerState.get("courseNodeId")));

            // Same event the webhook publishes → one code path for granting.
            Map<String, String> metadata = new LinkedHashMap<>();
            metadata.put("purpose", PURPOSE);
            metadata.put("courseNodeId", courseNodeId != null ? courseNodeId.toString() : "");
            metadata.putAll(providerState);
            eventPublisher.publishEvent(new PaymentSucceededEvent(provider, reference, userId, metadata));

            return Map.of("status", "unused", "provider", provider, "reference", reference);
        }
        if ("failed".equals(status)) granter.markFailed(provider, reference);

        return Map.of("status", status, "provider", provider, "reference", reference);
    }

    private Map<String, String> baseMetadata(UUID courseNodeId, String provider, String successUrl) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("purpose", PURPOSE);
        m.put("courseNodeId", courseNodeId.toString());
        m.put("provider", provider);
        return m;
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
