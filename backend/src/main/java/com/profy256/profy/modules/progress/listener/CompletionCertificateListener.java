package com.profy256.profy.modules.progress.listener;

import com.profy256.profy.modules.progress.event.CourseProgressUpdatedEvent;
import com.profy256.profy.modules.progress.service.CertificateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Completion-driven credential issuance.
 *
 * Progress writing and credential issuance are separate concerns: this listener
 * keeps the progress service free of certificate logic, and runs after commit
 * so a bug in the credential engine can never lose a learner's lesson progress.
 */
@Component
public class CompletionCertificateListener {

    private static final Logger log = LoggerFactory.getLogger(CompletionCertificateListener.class);

    private final CertificateService certificateService;

    public CompletionCertificateListener(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProgressUpdated(CourseProgressUpdatedEvent event) {
        if (!"completed".equals(event.status())) return;
        try {
            certificateService.autoIssueOnProgress(event.userId(), event.courseNodeId(), event.progressPercent());
        } catch (Exception e) {
            log.error("Completion credential issuance failed for user {} / course {}: {}",
                    event.userId(), event.courseNodeId(), e.getMessage());
        }
    }
}
