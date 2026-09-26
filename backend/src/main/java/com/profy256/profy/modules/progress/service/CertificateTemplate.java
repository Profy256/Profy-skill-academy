package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.progress.entity.CertificateDefinition;
import com.profy256.profy.modules.progress.entity.CertificateSettings;
import org.springframework.stereotype.Component;

/**
 * Pure function object: applies a credential definition's optional wording and
 * colour overrides onto a copy of the global certificate settings.
 *
 * Kept side-effect free so the exact same template rules are used by the PDF
 * renderer, the PNG renderer and the email body — they can never drift apart.
 */
@Component
public class CertificateTemplate {

    public static CertificateSettings applyOverrides(CertificateSettings base, CertificateDefinition def) {
        if (def == null) return base;
        CertificateSettings s = base.copy();
        if (notBlank(def.getCertHeadingOverride())) s.setCertHeading(def.getCertHeadingOverride().trim());
        if (notBlank(def.getCertIntroOverride())) s.setCertIntro(def.getCertIntroOverride().trim());
        if (notBlank(def.getCertAchievedOverride())) s.setCertAchieved(def.getCertAchievedOverride().trim());
        if (notBlank(def.getAccentColorOverride())) s.setCertAccentColor(def.getAccentColorOverride().trim());
        return s;
    }

    private static boolean notBlank(String v) {
        return v != null && !v.isBlank();
    }
}
