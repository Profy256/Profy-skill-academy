package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.progress.entity.CertificateSettings;
import com.profy256.profy.modules.progress.entity.TestCredit;
import com.profy256.profy.modules.progress.repository.CertificateSettingsRepository;
import com.profy256.profy.modules.progress.repository.TestCreditRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Single source of truth for turning a confirmed payment into a usable credit.
 *
 * Used by both settlement paths (webhook listener and client-driven poll), so
 * the rules can never diverge. Idempotent by construction — safe to call as
 * many times as a provider retries.
 */
@Component
public class TestCreditGranter {

    private static final Logger log = LoggerFactory.getLogger(TestCreditGranter.class);

    private final TestCreditRepository testCreditRepository;
    private final CertificateSettingsRepository settingsRepository;

    public TestCreditGranter(TestCreditRepository testCreditRepository,
                             CertificateSettingsRepository settingsRepository) {
        this.testCreditRepository = testCreditRepository;
        this.settingsRepository = settingsRepository;
    }

    @Transactional
    public Optional<TestCredit> grant(String provider, String reference,
                                      UUID userId, UUID courseNodeId) {
        if (reference == null || reference.isBlank()) return Optional.empty();
        if (userId == null || courseNodeId == null) {
            log.warn("Cannot grant credit for {} {}: missing user or course", provider, reference);
            return Optional.empty();
        }

        Optional<TestCredit> existing = testCreditRepository.findByProviderAndProviderRef(provider, reference);
        if (existing.isPresent()) {
            TestCredit credit = existing.get();
            if ("pending".equals(credit.getStatus())) {
                credit.setStatus("unused");
                testCreditRepository.save(credit);
            }
            return Optional.of(credit);
        }

        CertificateSettings settings = settingsRepository
                .findById(CertificateSettings.SINGLETON_ID)
                .orElseGet(CertificateSettings::new);
        boolean stripe = "stripe".equals(provider);

        TestCredit credit = new TestCredit(userId, courseNodeId, provider, reference,
                stripe ? settings.getTestPriceCents() : settings.getTestPriceUgx(),
                stripe ? "usd" : "UGX");
        credit.setStatus("unused");
        TestCredit saved = testCreditRepository.save(credit);
        log.info("Test credit granted: user={}, provider={}, ref={}", userId, provider, reference);
        return Optional.of(saved);
    }

    @Transactional
    public void markFailed(String provider, String reference) {
        testCreditRepository.findByProviderAndProviderRef(provider, reference).ifPresent(c -> {
            if ("pending".equals(c.getStatus())) {
                c.setStatus("failed");
                testCreditRepository.save(c);
            }
        });
    }

    /** Consume the oldest unused credit. Returns empty when none is available. */
    @Transactional
    public Optional<TestCredit> consume(UUID userId, UUID courseNodeId) {
        return testCreditRepository
                .findByUserIdAndCourseNodeIdAndStatusOrderByCreatedAtDesc(userId, courseNodeId, "unused")
                .stream()
                .findFirst()
                .map(credit -> {
                    credit.setStatus("consumed");
                    credit.setConsumedAt(Instant.now());
                    return testCreditRepository.save(credit);
                });
    }

    @Transactional(readOnly = true)
    public int availableCredits(UUID userId, UUID courseNodeId) {
        return (int) testCreditRepository
                .countByUserIdAndCourseNodeIdAndStatus(userId, courseNodeId, "unused");
    }
}
