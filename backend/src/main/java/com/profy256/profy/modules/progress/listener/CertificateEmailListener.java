package com.profy256.profy.modules.progress.listener;

import com.profy256.profy.modules.auth.entity.User;
import com.profy256.profy.modules.auth.repository.UserRepository;
import com.profy256.profy.modules.progress.entity.Certificate;
import com.profy256.profy.modules.progress.event.CertificateIssuedEvent;
import com.profy256.profy.modules.progress.repository.CertificateRepository;
import com.profy256.profy.modules.progress.service.CertificateNotifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Delivers a certificate email AFTER the issuing transaction commits.
 *
 * Isolation guarantees:
 *  - runs only once the credential is durable, so an email never references a
 *    certificate that was later rolled back;
 *  - every step is wrapped so a broken notifier (network, template, PDF) can
 *    never fail or roll back an issuance;
 *  - the work itself is handed to the task executor, so the request thread
 *    (and the learner waiting on the test result) is never blocked.
 */
@Component
public class CertificateEmailListener {

    private static final Logger log = LoggerFactory.getLogger(CertificateEmailListener.class);

    private final CertificateRepository certificateRepository;
    private final UserRepository userRepository;
    private final CertificateNotifier notifier;

    public CertificateEmailListener(CertificateRepository certificateRepository,
                                    UserRepository userRepository,
                                    CertificateNotifier notifier) {
        this.certificateRepository = certificateRepository;
        this.userRepository = userRepository;
        this.notifier = notifier;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCertificateIssued(CertificateIssuedEvent event) {
        try {
            Certificate cert = certificateRepository.findById(event.certificateId()).orElse(null);
            User user = userRepository.findById(event.userId()).orElse(null);
            if (cert == null || user == null || user.getEmail() == null || user.getEmail().isBlank()) {
                return;
            }
            notifier.notifyAsync(cert, user);
        } catch (Exception e) {
            // Deliberately swallowed: email is a side effect, never a blocker.
            log.error("Certificate email scheduling failed for {}: {}", event.certificateId(), e.getMessage());
        }
    }
}
