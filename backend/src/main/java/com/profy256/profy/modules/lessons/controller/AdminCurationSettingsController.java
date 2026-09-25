package com.profy256.profy.modules.lessons.controller;

import com.profy256.profy.modules.lessons.service.AutoCurationService;
import com.profy256.profy.platform.audit.Audited;
import com.profy256.profy.platform.error.BadRequestException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/settings")
public class AdminCurationSettingsController {

    public record UpdateAutoCurationRequest(Boolean enabled) {}

    private final AutoCurationService autoCurationService;

    public AdminCurationSettingsController(AutoCurationService autoCurationService) {
        this.autoCurationService = autoCurationService;
    }

    @GetMapping("/auto-curation")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(autoCurationService.getSettingsMap());
    }

    @PutMapping("/auto-curation")
    @Audited
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody UpdateAutoCurationRequest request) {
        if (request.enabled() == null) {
            throw new BadRequestException("enabled is required");
        }
        autoCurationService.setSettingEnabled(request.enabled());
        return ResponseEntity.ok(autoCurationService.getSettingsMap());
    }
}
