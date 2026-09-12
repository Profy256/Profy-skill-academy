package com.profy256.profy.platform.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthCheckController {

    private final HealthCheckIndicator healthCheckIndicator;

    public HealthCheckController(HealthCheckIndicator healthCheckIndicator) {
        this.healthCheckIndicator = healthCheckIndicator;
    }

    @GetMapping("/healthz")
    public ResponseEntity<Map<String, Object>> healthz() {
        Health health = healthCheckIndicator.health();
        if ("UP".equals(health.getStatus().getCode())) {
            return ResponseEntity.ok(Map.of("status", "ok", "details", health.getDetails()));
        }
        return ResponseEntity.status(503).body(Map.of("status", "down", "details", health.getDetails()));
    }
}
