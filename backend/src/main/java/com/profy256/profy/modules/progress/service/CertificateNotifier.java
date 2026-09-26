package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.auth.entity.User;
import com.profy256.profy.modules.progress.entity.Certificate;
import com.profy256.profy.modules.progress.entity.CertificateSettings;
import com.profy256.profy.modules.progress.entity.CertificateDefinition;
import com.profy256.profy.modules.progress.repository.CertificateDefinitionRepository;
import com.profy256.profy.platform.config.AppConfig;
import com.profy256.profy.platform.email.EmailMessage;
import com.profy256.profy.platform.email.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * Certificate notification delivery — a leaf component.
 *
 * It knows how to build the message and hand it to the {@link EmailSender} port,
 * but nothing depends on it: it is only reached from an AFTER_COMMIT listener,
 * so any failure here is logged and contained. Swapping Resend for another
 * provider only requires a new {@link EmailSender} bean.
 */
@Component
public class CertificateNotifier {

    private static final Logger log = LoggerFactory.getLogger(CertificateNotifier.class);
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("d MMMM yyyy").withZone(ZoneOffset.UTC);

    private final EmailSender emailSender;
    private final TaskExecutor taskExecutor;
    private final AppConfig appConfig;
    private final CertificatePdfRenderer renderer;
    private final CertificateSettingsService settingsService;
    private final CertificateDefinitionRepository definitionRepository;
    private final CertificateTemplate template;
    private final CertificateStateWriter stateWriter;

    public CertificateNotifier(EmailSender emailSender,
                               TaskExecutor taskExecutor,
                               AppConfig appConfig,
                               CertificatePdfRenderer renderer,
                               CertificateSettingsService settingsService,
                               CertificateDefinitionRepository definitionRepository,
                               CertificateTemplate template,
                               CertificateStateWriter stateWriter) {
        this.emailSender = emailSender;
        this.taskExecutor = taskExecutor;
        this.appConfig = appConfig;
        this.renderer = renderer;
        this.settingsService = settingsService;
        this.definitionRepository = definitionRepository;
        this.template = template;
        this.stateWriter = stateWriter;
    }

    /** Fire-and-forget: never throws, never blocks the caller. */
    public void notifyAsync(Certificate cert, User user) {
        try {
            taskExecutor.execute(() -> deliver(cert, user));
        } catch (Exception e) {
            log.warn("Could not schedule certificate email: {}", e.getMessage());
        }
    }

    private void deliver(Certificate cert, User user) {
        try {
            CertificateSettings settings = effectiveSettings(cert);
            String url = verifyUrl(cert.getCertCode());

            byte[] pdf = null;
            try {
                pdf = renderer.renderPdf(cert, settings, url);
            } catch (Exception e) {
                log.warn("Certificate PDF render failed for {}: {}", cert.getCertCode(), e.getMessage());
            }

            String html = buildHtml(cert, settings, url);
            String error = emailSender.send(new EmailMessage(
                    user.getEmail(),
                    "Your " + settings.getCertHeading() + " — " + nullSafe(cert.getCourseName()),
                    html,
                    pdf != null ? "certificate-" + cert.getCertCode() + ".pdf" : null,
                    pdf));

            stateWriter.recordEmailResult(cert.getId(), error);
        } catch (Exception e) {
            log.error("Certificate email delivery failed for {}: {}", cert.getCertCode(), e.getMessage());
            try {
                stateWriter.recordEmailResult(cert.getId(), e.getMessage());
            } catch (Exception ignored) {
                // Diagnostics must never escalate.
            }
        }
    }

    private CertificateSettings effectiveSettings(Certificate cert) {
        CertificateDefinition def = cert.getDefinitionId() != null
                ? definitionRepository.findById(cert.getDefinitionId()).orElse(null)
                : null;
        return template.applyOverrides(settingsService.get(), def);
    }

    private String buildHtml(Certificate cert, CertificateSettings s, String url) {
        String scoreLine = cert.getScore() != null && cert.getTotal() != null
                ? s.getCertScoreLabel() + ": " + cert.getScore() + " / " + cert.getTotal() + "."
                : "";
        String dateLine = cert.getIssuedAt() != null ? DATE_FORMAT.format(cert.getIssuedAt()) : "";

        return """
                <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
                  <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#666">%s</p>
                  <h1 style="font-size:26px;margin:4px 0 18px">%s</h1>
                  <p style="font-size:15px;line-height:1.7">
                    Congratulations, <strong>%s</strong>. You have earned a credential for
                    <strong>%s</strong>.
                  </p>
                  <p style="font-size:14px;color:#555">%s %s</p>
                  <p style="margin-top:22px">
                    <a href="%s" style="display:inline-block;background:%s;color:#fff;padding:11px 20px;
                       border-radius:8px;text-decoration:none;font-weight:bold">
                      View &amp; download your certificate
                    </a>
                  </p>
                  <p style="font-size:13px;color:#777;margin-top:20px">
                    %s: <code>%s</code><br/>
                    Anyone can verify it at <a href="%s">%s</a>
                  </p>
                </div>
                """.formatted(
                s.getCertOrgName(), s.getCertHeading(),
                nullSafe(cert.getRecipientName()), nullSafe(cert.getCourseName()),
                scoreLine, dateLine,
                url, s.getCertPrimaryColor(),
                s.getCertCodeLabel(), cert.getCertCode(),
                url, url);
    }

    private String verifyUrl(String code) {
        return appConfig.getSiteUrl().replaceAll("/+$", "") + "/verify/" + code;
    }

    private String nullSafe(String v) { return v == null ? "" : v; }
}
