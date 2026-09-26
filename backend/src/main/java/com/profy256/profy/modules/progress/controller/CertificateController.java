package com.profy256.profy.modules.progress.controller;

import com.profy256.profy.modules.progress.dto.CertResponses.CertificateDefinitionResponse;
import com.profy256.profy.modules.progress.dto.CertResponses.CertificateResponse;
import com.profy256.profy.modules.progress.service.CertificateService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CertificateController {

    private final CertificateService certificateService;

    public CertificateController(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    /** Credentials this learner has earned. */
    @GetMapping("/certificates")
    public ResponseEntity<List<CertificateResponse>> myCertificates(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(certificateService.listForUser(userId));
    }

    /** Public catalogue of credentials an academy offers (auth optional). */
    @GetMapping("/certificates/definitions")
    public ResponseEntity<List<CertificateDefinitionResponse>> definitions() {
        return ResponseEntity.ok(certificateService.listEnabledDefinitions());
    }

    // ─── Public verification (capability URL — no auth) ─────────────

    @GetMapping("/verify/{code}")
    public ResponseEntity<Map<String, Object>> verify(@PathVariable String code) {
        return ResponseEntity.ok(certificateService.verify(code));
    }

    @GetMapping(value = "/verify/{code}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdf(@PathVariable String code) {
        byte[] data = certificateService.pdf(code);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"certificate-" + code.toUpperCase() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    @GetMapping(value = "/verify/{code}/png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> png(@PathVariable String code) {
        byte[] data = certificateService.png(code);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"certificate-" + code.toUpperCase() + ".png\"")
                .contentType(MediaType.IMAGE_PNG)
                .body(data);
    }
}
