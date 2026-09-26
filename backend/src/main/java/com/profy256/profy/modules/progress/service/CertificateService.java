package com.profy256.profy.modules.progress.service;

import com.profy256.profy.modules.auth.entity.User;
import com.profy256.profy.modules.auth.repository.UserRepository;
import com.profy256.profy.modules.progress.dto.CertRequests.CertificateDefinitionRequest;
import com.profy256.profy.modules.progress.dto.CertRequests.ManualIssueRequest;
import com.profy256.profy.modules.progress.dto.CertResponses.*;
import com.profy256.profy.modules.progress.entity.Certificate;
import com.profy256.profy.modules.progress.entity.CertificateDefinition;
import com.profy256.profy.modules.progress.entity.CertificateSettings;
import com.profy256.profy.modules.progress.repository.CertificateDefinitionRepository;
import com.profy256.profy.modules.progress.repository.CertificateRepository;
import com.profy256.profy.modules.progress.repository.CertificateSettingsRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.modules.progress.event.CertificateIssuedEvent;
import com.profy256.profy.platform.config.AppConfig;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Certificate lifecycle: definitions (what can be earned), issuance,
 * verification and PDF/PNG delivery.
 *
 * Email delivery is deliberately NOT here: this service only announces
 * {@link CertificateIssuedEvent} after a successful commit, and a separate
 * listener/notifier handles the message. All wording/colours come from
 * {@link CertificateSettings} with optional per-definition overrides
 * (see {@link CertificateTemplate}), so admins redesign a certificate from
 * the panel without touching code.
 */
@Service
public class CertificateService {

    private static final Logger log = LoggerFactory.getLogger(CertificateService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

    private final CertificateRepository certificateRepository;
    private final CertificateDefinitionRepository definitionRepository;
    private final CertificateSettingsRepository settingsRepository;
    private final TaxonomyNodeRepository taxonomyNodeRepository;
    private final UserRepository userRepository;
    private final CertificateSettingsService settingsService;
    private final CertificateTemplate template;
    private final CertificatePdfRenderer renderer;
    private final ApplicationEventPublisher eventPublisher;
    private final AppConfig appConfig;

    public CertificateService(CertificateRepository certificateRepository,
                              CertificateDefinitionRepository definitionRepository,
                              CertificateSettingsRepository settingsRepository,
                              TaxonomyNodeRepository taxonomyNodeRepository,
                              UserRepository userRepository,
                              CertificateSettingsService settingsService,
                              CertificateTemplate template,
                              CertificatePdfRenderer renderer,
                              ApplicationEventPublisher eventPublisher,
                              AppConfig appConfig) {
        this.certificateRepository = certificateRepository;
        this.definitionRepository = definitionRepository;
        this.settingsRepository = settingsRepository;
        this.taxonomyNodeRepository = taxonomyNodeRepository;
        this.userRepository = userRepository;
        this.settingsService = settingsService;
        this.template = template;
        this.renderer = renderer;
        this.eventPublisher = eventPublisher;
        this.appConfig = appConfig;
    }

    // ═══════════════════════════════════════════════════════════════
    //  Issuance
    // ═══════════════════════════════════════════════════════════════

    /**
     * Called after a learner passes a course final test. Awards every enabled,
     * auto-issue definition attached to that course whose criteria the pass
     * satisfies. Returns the certificates that now exist (earned earlier
     * definitions are returned unchanged rather than duplicated).
     */
    @Transactional
    public List<Certificate> issueForPassedTest(UUID userId, User user, TaxonomyNode course,
                                                int score, int total, int passPercent,
                                                int progressPercent, String printedName) {
        List<Certificate> issued = new ArrayList<>();

        List<CertificateDefinition> definitions = definitionRepository.findByCourseNodeIdAndIsEnabledTrue(course.getId());
        // Courses with no authored definitions still earn the built-in credential.
        if (definitions.isEmpty()) {
            Certificate legacy = upsertCertificate(userId, course, null, score, total, passPercent, printedName);
            issued.add(legacy);
            announce(legacy, user);
            return issued;
        }

        for (CertificateDefinition def : definitions) {
            if (!Boolean.TRUE.equals(def.getAutoIssue())) continue;
            if (Boolean.TRUE.equals(def.getRequireFinalTest()) && passPercent < safe(def.getPassPercent())) continue;
            if (progressPercent < safe(def.getMinProgressPercent())) continue;

            Certificate cert = upsertCertificate(userId, course, def.getId(), score, total,
                    safe(def.getPassPercent()), printedName);
            issued.add(cert);
            announce(cert, user);
        }
        return issued;
    }

    /**
     * Called when a learner completes a lesson — re-evaluates completion-only
     * definitions (those that don't need a final test).
     */
    @Transactional
    public void autoIssueOnProgress(UUID userId, UUID courseNodeId, int progressPercent) {
        if (!Boolean.TRUE.equals(settingsService.get().getCertEnabled())) return;

        Optional<TaxonomyNode> courseOpt = taxonomyNodeRepository.findById(courseNodeId);
        if (courseOpt.isEmpty()) return;
        TaxonomyNode course = courseOpt.get();

        List<CertificateDefinition> definitions = definitionRepository.findByCourseNodeIdAndIsEnabledTrue(courseNodeId);
        if (definitions.isEmpty()) return;

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        for (CertificateDefinition def : definitions) {
            if (!Boolean.TRUE.equals(def.getAutoIssue())) continue;
            if (Boolean.TRUE.equals(def.getRequireFinalTest())) continue;   // needs a test pass
            if (!Boolean.TRUE.equals(def.getRequireCourseComplete())) continue;
            if (progressPercent < 100) continue;
            if (progressPercent < safe(def.getMinProgressPercent())) continue;

            Certificate cert = upsertCertificate(userId, course, def.getId(), null, null,
                    safe(def.getPassPercent()), user.getName());
            announce(cert, user);
        }
    }

    /** Admin manually awards a credential (standalone definitions, catch-up grants). */
    @Transactional
    public CertificateResponse manualIssue(UUID adminUserId, String definitionId, ManualIssueRequest request) {
        CertificateDefinition def = definitionRepository.findById(UUID.fromString(definitionId))
                .orElseThrow(() -> new ResourceNotFoundException("Certificate definition not found"));

        User user = userRepository.findByEmail(request.userEmail().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("No user with that email: " + request.userEmail()));

        TaxonomyNode course = def.getCourseNodeId() != null
                ? taxonomyNodeRepository.findById(def.getCourseNodeId()).orElse(null)
                : null;
        if (course == null) {
            // Standalone (non-course) credential: prefer the "general" course
            // row so the certificate has real metadata to display.
            course = taxonomyNodeRepository.findBySlug("general").orElse(null);
            if (course == null) {
                log.warn("Standalone credential {} issued with a placeholder course", def.getSlug());
            }
        }

        String printedName = (request.recipientName() != null && !request.recipientName().isBlank())
                ? request.recipientName().trim() : user.getName();

        Certificate cert = new Certificate(user.getId(),
                course != null ? course.getId() : UUID.fromString("00000000-0000-0000-0000-000000000000"),
                def.getId(), newCertCode());
        cert.setRecipientName(printedName);
        cert.setCourseName(course != null ? course.getName() : def.getName());
        cert.setPassPercent(safe(def.getPassPercent()));
        cert.setIdentityVerifiedAt(Instant.now());

        Certificate saved = certificateRepository.save(cert);
        log.info("Certificate manually issued: def={}, user={}, admin={}", def.getSlug(), user.getEmail(), adminUserId);
        announce(saved, user);
        return toResponse(saved, course, def);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Definition CRUD (admin)
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<CertificateDefinitionResponse> listDefinitions() {
        List<CertificateDefinitionResponse> out = new ArrayList<>();
        for (CertificateDefinition def : definitionRepository.findAllByOrderBySortOrderAscNameAsc()) {
            out.add(toDefinitionResponse(def));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<CertificateDefinitionResponse> listEnabledDefinitions() {
        List<CertificateDefinitionResponse> out = new ArrayList<>();
        for (CertificateDefinition def : definitionRepository.findByIsEnabledTrueOrderBySortOrderAscNameAsc()) {
            out.add(toDefinitionResponse(def));
        }
        return out;
    }

    @Transactional
    public CertificateDefinitionResponse createDefinition(CertificateDefinitionRequest req, UUID adminUserId) {
        String slug = slugify(req.slug() != null && !req.slug().isBlank() ? req.slug() : req.name());
        if (definitionRepository.existsBySlug(slug)) {
            throw new BadRequestException("A certificate with that slug already exists");
        }
        CertificateDefinition def = new CertificateDefinition();
        applyDefinition(def, req);
        def.setSlug(slug);
        def.setCreatedBy(adminUserId);
        return toDefinitionResponse(definitionRepository.save(def));
    }

    @Transactional
    public CertificateDefinitionResponse updateDefinition(UUID id, CertificateDefinitionRequest req, UUID adminUserId) {
        CertificateDefinition def = definitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate definition not found"));

        if (req.slug() != null && !req.slug().isBlank()) {
            String slug = slugify(req.slug());
            if (!slug.equals(def.getSlug()) && definitionRepository.existsBySlug(slug)) {
                throw new BadRequestException("A certificate with that slug already exists");
            }
            def.setSlug(slug);
        }
        applyDefinition(def, req);
        def.setCreatedBy(adminUserId);
        return toDefinitionResponse(definitionRepository.save(def));
    }

    @Transactional
    public Map<String, Object> deleteDefinition(UUID id) {
        CertificateDefinition def = definitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate definition not found"));
        definitionRepository.delete(def);
        return Map.of("status", "deleted", "id", id.toString());
    }

    private void applyDefinition(CertificateDefinition def, CertificateDefinitionRequest req) {
        if (req.name() == null || req.name().isBlank()) throw new BadRequestException("name is required");
        def.setName(req.name().trim());
        if (req.shortName() != null) def.setShortName(req.shortName().trim());
        if (req.description() != null) def.setDescription(req.description());
        if (req.badgeColor() != null) def.setBadgeColor(req.badgeColor().trim());
        if (req.requireFinalTest() != null) def.setRequireFinalTest(req.requireFinalTest());
        if (req.requireCourseComplete() != null) def.setRequireCourseComplete(req.requireCourseComplete());
        if (req.passPercent() != null) def.setPassPercent(req.passPercent());
        if (req.minProgressPercent() != null) def.setMinProgressPercent(req.minProgressPercent());
        if (req.autoIssue() != null) def.setAutoIssue(req.autoIssue());
        if (req.certHeadingOverride() != null) def.setCertHeadingOverride(trimOrNull(req.certHeadingOverride()));
        if (req.certIntroOverride() != null) def.setCertIntroOverride(trimOrNull(req.certIntroOverride()));
        if (req.certAchievedOverride() != null) def.setCertAchievedOverride(trimOrNull(req.certAchievedOverride()));
        if (req.accentColorOverride() != null) def.setAccentColorOverride(trimOrNull(req.accentColorOverride()));
        if (req.isEnabled() != null) def.setIsEnabled(req.isEnabled());
        if (req.sortOrder() != null) def.setSortOrder(req.sortOrder());

        if (req.courseNodeId() != null) {
            if (req.courseNodeId().isBlank()) {
                def.setCourseNodeId(null);
            } else {
                UUID courseId = UUID.fromString(req.courseNodeId());
                taxonomyNodeRepository.findById(courseId)
                        .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + req.courseNodeId()));
                def.setCourseNodeId(courseId);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  Issued credentials (admin)
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<IssuedCertificateResponse> listIssued(String status, Pageable pageable) {
        Page<Certificate> page = "active".equalsIgnoreCase(status)
                ? certificateRepository.findByRevokedAtIsNullOrderByIssuedAtDesc(pageable)
                : certificateRepository.findAllByOrderByIssuedAtDesc(pageable);
        return page.map(this::toIssuedResponse);
    }

    @Transactional
    public IssuedCertificateResponse revoke(UUID id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found"));
        cert.setRevokedAt(Instant.now());
        return toIssuedResponse(certificateRepository.save(cert));
    }

    @Transactional
    public IssuedCertificateResponse reinstate(UUID id) {
        Certificate cert = certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found"));
        cert.setRevokedAt(null);
        return toIssuedResponse(certificateRepository.save(cert));
    }

    // ═══════════════════════════════════════════════════════════════
    //  Learner-facing reads
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<CertificateResponse> listForUser(UUID userId) {
        List<Certificate> certs = certificateRepository.findByUserIdOrderByIssuedAtDesc(userId);
        List<CertificateResponse> out = new ArrayList<>();
        for (Certificate c : certs) out.add(toResponse(c, courseOf(c), definitionOf(c)));
        return out;
    }

    @Transactional(readOnly = true)
    public List<CertificateResponse> responsesForUser(UUID userId, TaxonomyNode course) {
        List<CertificateResponse> out = new ArrayList<>();
        for (Certificate c : certificateRepository.findByUserIdOrderByIssuedAtDesc(userId)) {
            if (c.getCourseNodeId().equals(course.getId())) {
                out.add(toResponse(c, course, definitionOf(c)));
            }
        }
        return out;
    }

    public List<CertificateResponse> responses(List<Certificate> certs, TaxonomyNode course) {
        List<CertificateResponse> out = new ArrayList<>();
        for (Certificate c : certs) out.add(toResponse(c, course, definitionOf(c)));
        return out;
    }

    // ═══════════════════════════════════════════════════════════════
    //  Public verification
    // ═══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Map<String, Object> verify(String code) {
        Certificate cert = certificateRepository.findByCertCode(code.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("No certificate with that code"));

        boolean revoked = cert.getRevokedAt() != null;
        TaxonomyNode course = courseOf(cert);
        CertificateDefinition def = definitionOf(cert);
        User user = userRepository.findById(cert.getUserId()).orElse(null);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("code", cert.getCertCode());
        out.put("valid", !revoked);
        out.put("revoked", revoked);
        out.put("recipientName", cert.getRecipientName());
        out.put("courseName", cert.getCourseName());
        out.put("definitionName", def != null ? def.getName() : "Certificate of Completion");
        out.put("badgeColor", def != null ? def.getBadgeColor() : settingsService.get().getCertPrimaryColor());
        out.put("score", cert.getScore());
        out.put("total", cert.getTotal());
        out.put("passPercent", cert.getPassPercent());
        out.put("issuedAt", cert.getIssuedAt() != null ? cert.getIssuedAt().toString() : null);
        out.put("revokedAt", cert.getRevokedAt() != null ? cert.getRevokedAt().toString() : null);
        out.put("courseSlug", course != null ? course.getSlug() : null);
        out.put("organization", settingsService.get().getCertOrgName());
        out.put("holderEmailHint", maskEmail(user != null ? user.getEmail() : null));
        return out;
    }

    public byte[] pdf(String code) {
        Certificate cert = requireLive(code);
        try {
            return renderer.renderPdf(cert, effectiveSettings(cert), verifyUrl(cert.getCertCode()));
        } catch (Exception e) {
            throw new RuntimeException("Could not render certificate PDF: " + e.getMessage(), e);
        }
    }

    public byte[] png(String code) {
        Certificate cert = requireLive(code);
        try {
            return renderer.renderPng(cert, effectiveSettings(cert), verifyUrl(cert.getCertCode()));
        } catch (Exception e) {
            throw new RuntimeException("Could not render certificate image: " + e.getMessage(), e);
        }
    }

    private Certificate requireLive(String code) {
        return certificateRepository.findByCertCode(code.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("No certificate with that code"));
    }

    // ═══════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════

    public CertificateSettings effectiveSettings(Certificate cert) {
        return template.applyOverrides(settingsService.get(), definitionOf(cert));
    }

    private Certificate upsertCertificate(UUID userId, TaxonomyNode course, UUID definitionId,
                                          Integer score, Integer total, int passPercent,
                                          String printedName) {
        Certificate cert = definitionId != null
                ? certificateRepository.findByUserIdAndCourseNodeIdAndDefinitionId(userId, course.getId(), definitionId)
                        .orElse(null)
                : certificateRepository.findByUserIdAndCourseNodeId(userId, course.getId()).orElse(null);

        boolean fresh = cert == null;
        if (fresh) cert = new Certificate(userId, course.getId(), newCertCode());
        cert.setDefinitionId(definitionId);
        cert.setRecipientName(printedName);
        cert.setCourseName(course.getName());
        if (score != null) {
            cert.setScore(score);
            cert.setTotal(total);
        }
        cert.setPassPercent(passPercent);
        if (fresh) cert.setIdentityVerifiedAt(Instant.now());
        cert.setRevokedAt(null);
        return certificateRepository.save(cert);
    }

    /**
     * Announce the credential. Publishing (rather than emailing inline) keeps
     * issuance independent from delivery: if the email subsystem is down,
     * issuing still succeeds and the listener simply records the failure.
     */
    private void announce(Certificate cert, User user) {
        if (user == null) return;
        try {
            eventPublisher.publishEvent(new CertificateIssuedEvent(cert.getId(), user.getId(), cert.getCourseNodeId()));
        } catch (Exception e) {
            log.warn("Could not announce certificate {}: {}", cert.getCertCode(), e.getMessage());
        }
    }

    public CertificateResponse toResponse(Certificate cert, TaxonomyNode course, CertificateDefinition def) {
        return new CertificateResponse(
                cert.getId() != null ? cert.getId().toString() : null,
                cert.getCertCode(),
                verifyUrl(cert.getCertCode()),
                cert.getCourseNodeId() != null ? cert.getCourseNodeId().toString() : null,
                course != null ? course.getSlug() : null,
                cert.getCourseName(),
                def != null ? def.getId().toString() : null,
                def != null ? def.getName() : "Certificate of Completion",
                cert.getRecipientName(),
                cert.getScore(),
                cert.getTotal(),
                cert.getPassPercent(),
                cert.getIssuedAt(),
                cert.getRevokedAt(),
                cert.getIdentityVerifiedAt(),
                cert.getEmailSentAt(),
                cert.getRevokedAt() != null
        );
    }

    private CertificateDefinitionResponse toDefinitionResponse(CertificateDefinition def) {
        TaxonomyNode course = def.getCourseNodeId() != null
                ? taxonomyNodeRepository.findById(def.getCourseNodeId()).orElse(null) : null;
        long issued = certificateRepository.countByDefinitionId(def.getId());

        return new CertificateDefinitionResponse(
                def.getId().toString(),
                def.getName(),
                def.getSlug(),
                def.getShortName(),
                def.getDescription(),
                def.getBadgeColor(),
                course != null ? course.getId().toString() : null,
                course != null ? course.getSlug() : null,
                course != null ? course.getName() : null,
                def.getRequireFinalTest(),
                def.getRequireCourseComplete(),
                def.getPassPercent(),
                def.getMinProgressPercent(),
                def.getAutoIssue(),
                def.getCertHeadingOverride(),
                def.getCertIntroOverride(),
                def.getCertAchievedOverride(),
                def.getAccentColorOverride(),
                def.getIsEnabled(),
                def.getSortOrder(),
                issued,
                def.getCreatedAt(),
                def.getUpdatedAt()
        );
    }

    private IssuedCertificateResponse toIssuedResponse(Certificate cert) {
        User user = userRepository.findById(cert.getUserId()).orElse(null);
        CertificateDefinition def = definitionOf(cert);
        TaxonomyNode course = courseOf(cert);
        return new IssuedCertificateResponse(
                cert.getId().toString(),
                cert.getCertCode(),
                verifyUrl(cert.getCertCode()),
                cert.getRecipientName(),
                user != null ? user.getEmail() : null,
                cert.getCourseName(),
                def != null ? def.getName() : "Certificate of Completion",
                cert.getScore(), cert.getTotal(), cert.getPassPercent(),
                cert.getIssuedAt(), cert.getRevokedAt(), cert.getEmailError(),
                cert.getRevokedAt() != null
        );
    }

    private TaxonomyNode courseOf(Certificate cert) {
        return cert.getCourseNodeId() != null
                ? taxonomyNodeRepository.findById(cert.getCourseNodeId()).orElse(null)
                : null;
    }

    private CertificateDefinition definitionOf(Certificate cert) {
        return cert.getDefinitionId() != null
                ? definitionRepository.findById(cert.getDefinitionId()).orElse(null)
                : null;
    }

    public String verifyUrl(String code) {
        return appConfig.getSiteUrl().replaceAll("/+$", "") + "/verify/" + code;
    }

    private String newCertCode() {
        for (int i = 0; i < 8; i++) {
            StringBuilder sb = new StringBuilder(10);
            for (int j = 0; j < 10; j++) sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            String code = sb.toString();
            if (!certificateRepository.existsByCertCode(code)) return code;
        }
        return "X" + UUID.randomUUID().toString().replace("-", "").substring(0, 9).toUpperCase(Locale.ROOT);
    }

    private String slugify(String value) {
        String slug = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (slug.isEmpty()) throw new BadRequestException("Could not derive a slug from: " + value);
        return slug;
    }

    private String trimOrNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return null;
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String visible = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return visible + "*".repeat(Math.max(1, local.length() - 2)) + email.substring(at);
    }

    private String nullSafe(String v) { return v == null ? "" : v; }

    private int safe(Integer v) { return v == null ? 0 : v; }
}
