package com.profy256.profy.modules.progress.controller;

import com.profy256.profy.modules.progress.dto.CertRequests.SubmitFinalTestRequest;
import com.profy256.profy.modules.progress.dto.CertResponses.FinalTestStateResponse;
import com.profy256.profy.modules.progress.dto.CertResponses.SubmitResponse;
import com.profy256.profy.modules.progress.service.CertTestService;
import com.profy256.profy.modules.progress.service.TestCreditCheckoutService;
import com.profy256.profy.platform.error.UnauthorizedException;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CertTestController {

    private final CertTestService certTestService;
    private final TestCreditCheckoutService creditCheckoutService;

    public CertTestController(CertTestService certTestService,
                              TestCreditCheckoutService creditCheckoutService) {
        this.certTestService = certTestService;
        this.creditCheckoutService = creditCheckoutService;
    }

    /** Everything the Certificate tab needs: eligibility, pricing, questions (no answers). */
    @GetMapping("/courses/{slug}/final-test")
    public ResponseEntity<FinalTestStateResponse> getState(
            @PathVariable String slug, Authentication authentication) {
        UUID userId = userId(authentication);
        return ResponseEntity.ok(certTestService.getState(userId, slug));
    }

    /** Submit answers — graded server-side. 402 payment_required when locked. */
    @PostMapping("/courses/{slug}/final-test/attempts")
    public ResponseEntity<SubmitResponse> submit(
            @PathVariable String slug,
            @Valid @RequestBody SubmitFinalTestRequest request,
            Authentication authentication) {
        UUID userId = userId(authentication);
        return ResponseEntity.ok(certTestService.submit(userId, slug, request));
    }

    // ─── Buying a retake / sub-50% unlock credit ────────────────────

    @PostMapping("/billing/cert-test/checkout/stripe")
    public ResponseEntity<Map<String, Object>> stripeCheckout(
            @RequestBody Map<String, String> body, Authentication authentication) {
        UUID userId = userId(authentication);
        UUID courseNodeId = UUID.fromString(required(body, "courseNodeId"));
        try {
            return ResponseEntity.ok(creditCheckoutService.startStripeCheckout(
                    userId, courseNodeId,
                    body.getOrDefault("successUrl", "https://deraskul.com/library?credit=purchased"),
                    body.getOrDefault("cancelUrl", "https://deraskul.com")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/billing/cert-test/checkout/marzpay")
    public ResponseEntity<Map<String, Object>> marzpayCheckout(
            @RequestBody Map<String, String> body, Authentication authentication) {
        UUID userId = userId(authentication);
        UUID courseNodeId = UUID.fromString(required(body, "courseNodeId"));
        String phone = required(body, "phoneNumber");
        try {
            return ResponseEntity.ok(creditCheckoutService.startMarzPayCheckout(
                    userId, courseNodeId, phone, body.getOrDefault("country", "UG")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Poll after returning from checkout — confirms payment without a webhook. */
    @GetMapping("/billing/cert-test/status")
    public ResponseEntity<Map<String, Object>> creditStatus(
            @RequestParam String provider, @RequestParam String reference) {
        return ResponseEntity.ok(creditCheckoutService.confirmPayment(provider, reference));
    }

    /**
     * Null-safe subject resolution. SecurityConfig already marks these routes
     * authenticated, so this only fires if a route is ever re-mapped — a clear
     * 401 instead of an NPE-turned-500.
     */
    private static UUID userId(Authentication authentication) {
        String name = authentication == null ? null : authentication.getName();
        if (name == null || name.isBlank()) {
            throw new UnauthorizedException("Sign in to continue");
        }
        try {
            return UUID.fromString(name);
        } catch (IllegalArgumentException e) {
            throw new UnauthorizedException("Sign in to continue");
        }
    }

    private String required(Map<String, String> body, String key) {
        String v = body.get(key);
        if (v == null || v.isBlank()) {
            throw new com.profy256.profy.platform.error.BadRequestException(key + " is required");
        }
        return v;
    }
}
