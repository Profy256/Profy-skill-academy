package com.profy256.profy.modules.progress.controller;

import com.profy256.profy.modules.progress.dto.CertRequests.CertificateDefinitionRequest;
import com.profy256.profy.modules.progress.dto.CertRequests.CertificateSettingsRequest;
import com.profy256.profy.modules.progress.dto.CertRequests.FinalTestRequest;
import com.profy256.profy.modules.progress.dto.CertRequests.ManualIssueRequest;
import com.profy256.profy.modules.progress.dto.CertResponses.*;
import com.profy256.profy.modules.progress.service.CertificateService;
import com.profy256.profy.modules.progress.service.CertificateSettingsService;
import com.profy256.profy.modules.progress.service.FinalTestAuthoringService;
import com.profy256.profy.platform.audit.Audited;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin surface for the whole certificate feature:
 * pricing, the redesignable template, credential definitions and issued rows.
 */
@RestController
@RequestMapping("/api/v1/admin/certificates")
public class AdminCertificateController {

    private final CertificateSettingsService settingsService;
    private final CertificateService certificateService;
    private final FinalTestAuthoringService finalTestAuthoringService;

    public AdminCertificateController(CertificateSettingsService settingsService,
                                      CertificateService certificateService,
                                      FinalTestAuthoringService finalTestAuthoringService) {
        this.settingsService = settingsService;
        this.certificateService = certificateService;
        this.finalTestAuthoringService = finalTestAuthoringService;
    }

    // ─── Settings: pricing + certificate wording/colours ────────────

    @GetMapping("/settings")
    public ResponseEntity<CertificateSettingsResponse> getSettings() {
        return ResponseEntity.ok(settingsService.getResponse());
    }

    @PutMapping("/settings")
    @Audited
    public ResponseEntity<CertificateSettingsResponse> updateSettings(
            @Valid @RequestBody CertificateSettingsRequest request, Authentication authentication) {
        return ResponseEntity.ok(
                settingsService.update(request, UUID.fromString(authentication.getName())));
    }

    // ─── Credential definitions (create/name/require/retire) ────────

    @GetMapping("/definitions")
    public ResponseEntity<List<CertificateDefinitionResponse>> listDefinitions() {
        return ResponseEntity.ok(certificateService.listDefinitions());
    }

    @PostMapping("/definitions")
    @Audited
    public ResponseEntity<CertificateDefinitionResponse> createDefinition(
            @Valid @RequestBody CertificateDefinitionRequest request, Authentication authentication) {
        return ResponseEntity.ok(certificateService.createDefinition(
                request, UUID.fromString(authentication.getName())));
    }

    @PutMapping("/definitions/{id}")
    @Audited
    public ResponseEntity<CertificateDefinitionResponse> updateDefinition(
            @PathVariable UUID id,
            @Valid @RequestBody CertificateDefinitionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(certificateService.updateDefinition(
                id, request, UUID.fromString(authentication.getName())));
    }

    @DeleteMapping("/definitions/{id}")
    @Audited
    public ResponseEntity<Map<String, Object>> deleteDefinition(@PathVariable UUID id) {
        return ResponseEntity.ok(certificateService.deleteDefinition(id));
    }

    /** Manually award a credential (standalone awards / catch-up grants). */
    @PostMapping("/definitions/{id}/issue")
    @Audited
    public ResponseEntity<CertificateResponse> manualIssue(
            @PathVariable UUID id,
            @Valid @RequestBody ManualIssueRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(certificateService.manualIssue(
                UUID.fromString(authentication.getName()), id.toString(), request));
    }

    // ─── Issued credentials ─────────────────────────────────────────

    @GetMapping("/issued")
    public ResponseEntity<Page<IssuedCertificateResponse>> listIssued(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(certificateService.listIssued(status, pageable));
    }

    @PostMapping("/issued/{id}/revoke")
    @Audited
    public ResponseEntity<IssuedCertificateResponse> revoke(@PathVariable UUID id) {
        return ResponseEntity.ok(certificateService.revoke(id));
    }

    @PostMapping("/issued/{id}/reinstate")
    @Audited
    public ResponseEntity<IssuedCertificateResponse> reinstate(@PathVariable UUID id) {
        return ResponseEntity.ok(certificateService.reinstate(id));
    }

    // ─── Course final tests ─────────────────────────────────────────

    @GetMapping("/final-tests/{courseId}")
    public ResponseEntity<Map<String, Object>> getFinalTest(@PathVariable UUID courseId) {
        return ResponseEntity.ok(finalTestAuthoringService.get(courseId));
    }

    @PutMapping("/final-tests/{courseId}")
    @Audited
    public ResponseEntity<Map<String, Object>> saveFinalTest(
            @PathVariable UUID courseId,
            @Valid @RequestBody FinalTestRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(finalTestAuthoringService.save(
                courseId, request, UUID.fromString(authentication.getName())));
    }
}
