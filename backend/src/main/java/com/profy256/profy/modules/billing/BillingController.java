package com.profy256.profy.modules.billing;

import com.profy256.profy.modules.billing.payment.StripeClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

    private final BillingService billingService;
    private final StripeClient stripeClient;

    public BillingController(BillingService billingService, StripeClient stripeClient) {
        this.billingService = billingService;
        this.stripeClient = stripeClient;
    }

    // ─── Entitlement ─────────────────────────────────────────────

    @GetMapping("/entitlement")
    public ResponseEntity<Map<String, Object>> getEntitlement(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(billingService.getEntitlement(userId));
    }

    // ─── Stripe checkout (international cards) ───────────────────

    @PostMapping("/billing/checkout/stripe")
    public ResponseEntity<Map<String, Object>> createStripeCheckout(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        String plan = body.getOrDefault("plan", "premium");
        String successUrl = body.getOrDefault("successUrl", "https://profyacademy.com/library?upgraded=true");
        String cancelUrl = body.getOrDefault("cancelUrl", "https://profyacademy.com/pricing");

        try {
            Map<String, Object> result = billingService.createStripeCheckout(userId, plan, successUrl, cancelUrl);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Stripe checkout error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─── MarzPay checkout (local mobile money — UG/KE) ───────────

    @PostMapping("/billing/checkout/marzpay")
    public ResponseEntity<Map<String, Object>> createMarzPayCheckout(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        String plan = body.getOrDefault("plan", "premium");
        String phoneNumber = body.get("phoneNumber");
        String country = body.getOrDefault("country", "UG");

        if (phoneNumber == null || phoneNumber.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "phoneNumber is required"));
        }

        try {
            Map<String, Object> result = billingService.createMarzPayCheckout(userId, plan, phoneNumber, country);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("MarzPay checkout error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─── Stripe webhook ──────────────────────────────────────────

    @PostMapping("/webhooks/stripe")
    public ResponseEntity<Map<String, Object>> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            com.stripe.model.Event event = stripeClient.constructWebhookEvent(payload, sigHeader);
            billingService.handleStripeWebhook(event);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (com.stripe.exception.SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(400).body(Map.of("error", "Invalid signature"));
        } catch (Exception e) {
            log.error("Stripe webhook error: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Webhook processing failed"));
        }
    }

    // ─── MarzPay webhook ─────────────────────────────────────────

    @PostMapping("/webhooks/marzpay")
    public ResponseEntity<Map<String, Object>> handleMarzPayWebhook(@RequestBody Map<String, Object> payload) {
        try {
            billingService.handleMarzPayWebhook(payload);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (Exception e) {
            log.error("MarzPay webhook error: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Webhook processing failed"));
        }
    }

    // ─── Cancel subscription ─────────────────────────────────────

    @PostMapping("/billing/cancel")
    public ResponseEntity<Map<String, Object>> cancelSubscription(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        billingService.cancelSubscription(userId);
        return ResponseEntity.ok(Map.of("status", "cancelled"));
    }
}
