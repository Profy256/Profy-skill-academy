package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.progress.dto.CertRequests.CertificateSettingsRequest;
import com.profy256.profy.modules.progress.dto.CertResponses.CertificateSettingsResponse;
import com.profy256.profy.modules.progress.entity.CertificateSettings;
import com.profy256.profy.modules.progress.repository.CertificateSettingsRepository;
import com.profy256.profy.platform.error.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Read/update the single certificate_settings row (V19).
 * Every price and every word printed on a certificate is admin-editable here.
 */
@Service
public class CertificateSettingsService {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final CertificateSettingsRepository repository;

    public CertificateSettingsService(CertificateSettingsRepository repository) {
        this.repository = repository;
    }

    /** Never returns null — seeds the row if a fresh database skipped the insert. */
    @Transactional
    public CertificateSettings get() {
        return repository.findById(CertificateSettings.SINGLETON_ID)
                .orElseGet(() -> repository.save(new CertificateSettings()));
    }

    @Transactional
    public CertificateSettingsResponse update(CertificateSettingsRequest req, UUID adminUserId) {
        CertificateSettings s = get();

        if (req.testPriceCents() != null) {
            if (req.testPriceCents() < 0) throw new BadRequestException("testPriceCents cannot be negative");
            s.setTestPriceCents(req.testPriceCents());
        }
        if (req.testPriceUgx() != null) {
            if (req.testPriceUgx() < 0) throw new BadRequestException("testPriceUgx cannot be negative");
            s.setTestPriceUgx(req.testPriceUgx());
        }
        if (req.freeAttemptProgressPercent() != null) s.setFreeAttemptProgressPercent(req.freeAttemptProgressPercent());
        if (req.defaultPassPercent() != null) s.setDefaultPassPercent(req.defaultPassPercent());

        if (req.testTitle() != null) s.setTestTitle(req.testTitle().trim());
        if (req.testInstructions() != null) s.setTestInstructions(req.testInstructions());

        if (req.certHeading() != null) s.setCertHeading(req.certHeading().trim());
        if (req.certIntro() != null) s.setCertIntro(req.certIntro().trim());
        if (req.certAchieved() != null) s.setCertAchieved(req.certAchieved().trim());
        if (req.certCourseLabel() != null) s.setCertCourseLabel(req.certCourseLabel().trim());
        if (req.certScoreLabel() != null) s.setCertScoreLabel(req.certScoreLabel().trim());
        if (req.certDateLabel() != null) s.setCertDateLabel(req.certDateLabel().trim());
        if (req.certCodeLabel() != null) s.setCertCodeLabel(req.certCodeLabel().trim());
        if (req.certSignatureName() != null) s.setCertSignatureName(req.certSignatureName().trim());
        if (req.certSignatureTitle() != null) s.setCertSignatureTitle(req.certSignatureTitle().trim());
        if (req.certFooter() != null) s.setCertFooter(req.certFooter().trim());
        if (req.certOrgName() != null) s.setCertOrgName(req.certOrgName().trim());

        if (req.certPrimaryColor() != null) s.setCertPrimaryColor(requireHex(req.certPrimaryColor(), "certPrimaryColor"));
        if (req.certAccentColor() != null) s.setCertAccentColor(requireHex(req.certAccentColor(), "certAccentColor"));
        if (req.certPaperSize() != null) {
            String size = req.certPaperSize().trim().toLowerCase();
            if (!size.equals("landscape") && !size.equals("portrait")) {
                throw new BadRequestException("certPaperSize must be 'landscape' or 'portrait'");
            }
            s.setCertPaperSize(size);
        }
        if (req.certShowQr() != null) s.setCertShowQr(req.certShowQr());
        if (req.certEnabled() != null) s.setCertEnabled(req.certEnabled());

        if (s.getCertHeading().isEmpty()) throw new BadRequestException("certHeading cannot be empty");
        if (s.getTestTitle().isEmpty()) throw new BadRequestException("testTitle cannot be empty");

        s.setUpdatedBy(adminUserId);
        return toResponse(repository.save(s));
    }

    @Transactional(readOnly = true)
    public CertificateSettingsResponse getResponse() {
        return toResponse(get());
    }

    private String requireHex(String value, String field) {
        String v = value.trim();
        if (!HEX_COLOR.matcher(v).matches()) {
            throw new BadRequestException(field + " must be a hex colour like #1f3a8a");
        }
        return v;
    }

    public static CertificateSettingsResponse toResponse(CertificateSettings s) {
        return new CertificateSettingsResponse(
                s.getTestPriceCents(),
                s.getTestPriceUgx(),
                s.getFreeAttemptProgressPercent(),
                s.getDefaultPassPercent(),
                s.getTestTitle(),
                s.getTestInstructions(),
                s.getCertHeading(),
                s.getCertIntro(),
                s.getCertAchieved(),
                s.getCertCourseLabel(),
                s.getCertScoreLabel(),
                s.getCertDateLabel(),
                s.getCertCodeLabel(),
                s.getCertSignatureName(),
                s.getCertSignatureTitle(),
                s.getCertFooter(),
                s.getCertOrgName(),
                s.getCertPrimaryColor(),
                s.getCertAccentColor(),
                s.getCertPaperSize(),
                s.getCertShowQr(),
                s.getCertEnabled(),
                s.getUpdatedAt()
        );
    }
}
