package com.profy256.profy.modules.billing;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping("/entitlement")
    public ResponseEntity<Map<String, Object>> getEntitlement() {
        return ResponseEntity.ok(Map.of("status", "stub"));
    }

    @PostMapping("/billing/checkout")
    public ResponseEntity<Map<String, Object>> checkout(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("status", "stub"));
    }
}
