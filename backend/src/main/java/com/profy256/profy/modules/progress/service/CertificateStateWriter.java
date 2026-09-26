package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.progress.entity.Certificate;
import com.profy256.profy.modules.progress.repository.CertificateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Tiny write port used by the notifier to record delivery outcome.
 * Isolated so notification bookkeeping cannot leak into issuing logic.
 */
@Component
public class CertificateStateWriter {

    private static final Logger log = LoggerFactory.getLogger(CertificateStateWriter.class);

    private final CertificateRepository certificateRepository;

    public CertificateStateWriter(CertificateRepository certificateRepository) {
        this.certificateRepository = certificateRepository;
    }

    public void recordEmailResult(UUID certificateId, String error) {
        try {
            Optional<Certificate> opt = certificateRepository.findById(certificateId);
            if (opt.isEmpty()) return;
            Certificate cert = opt.get();
            if (error == null) {
                cert.setEmailSentAt(Instant.now());
                cert.setEmailError(null);
            } else {
                cert.setEmailError(error);
            }
            certificateRepository.save(cert);
        } catch (Exception e) {
            log.warn("Could not record certificate email status: {}", e.getMessage());
        }
    }
}
