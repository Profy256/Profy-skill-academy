package com.profy256.profy.modules.ai.controller;

import com.profy256.profy.modules.ai.dto.AiProviderDto.CreateProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.ProviderResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.SettingsResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.TestProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.TestProviderResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.UpdateProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.UpdateSettingsRequest;
import com.profy256.profy.modules.ai.service.AiProviderService;
import com.profy256.profy.platform.audit.Audited;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/ai-providers")
public class AiProviderController {

    private final AiProviderService providerService;

    public AiProviderController(AiProviderService providerService) {
        this.providerService = providerService;
    }

    @GetMapping
    public ResponseEntity<List<ProviderResponse>> list() {
        return ResponseEntity.ok(providerService.listProviders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProviderResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(providerService.getProvider(id));
    }

    @PostMapping
    @Audited
    public ResponseEntity<ProviderResponse> create(@Valid @RequestBody CreateProviderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(providerService.createProvider(request));
    }

    @PutMapping("/{id}")
    @Audited
    public ResponseEntity<ProviderResponse> update(
            @PathVariable UUID id,
            @RequestBody UpdateProviderRequest request) {
        return ResponseEntity.ok(providerService.updateProvider(id, request));
    }

    @DeleteMapping("/{id}")
    @Audited
    public ResponseEntity<Map<String, String>> delete(@PathVariable UUID id) {
        providerService.deleteProvider(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/settings")
    public ResponseEntity<SettingsResponse> getSettings() {
        return ResponseEntity.ok(providerService.getSettings());
    }

    @PutMapping("/settings")
    @Audited
    public ResponseEntity<SettingsResponse> updateSettings(@RequestBody UpdateSettingsRequest request) {
        return ResponseEntity.ok(providerService.updateSettings(request));
    }

    @PostMapping("/test")
    public ResponseEntity<TestProviderResponse> test(@Valid @RequestBody TestProviderRequest request) {
        return ResponseEntity.ok(providerService.testProvider(request));
    }
}
