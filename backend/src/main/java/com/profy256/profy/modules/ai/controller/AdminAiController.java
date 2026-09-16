package com.profy256.profy.modules.ai.controller;

import com.profy256.profy.modules.ai.dto.AiProviderDto.TestProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.TestProviderResponse;
import com.profy256.profy.modules.ai.service.AdminAiService;
import com.profy256.profy.modules.ai.service.AdminAiService.AdminChatResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/ai-assistant")
public class AdminAiController {

    private final AdminAiService adminAiService;

    public AdminAiController(AdminAiService adminAiService) {
        this.adminAiService = adminAiService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AdminChatResponse> chat(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        UUID adminUserId = UUID.fromString(authentication.getName());
        String message = body.get("message");
        AdminChatResponse response = adminAiService.chat(adminUserId, message);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/test")
    public ResponseEntity<TestProviderResponse> testProvider(
            @Valid @RequestBody TestProviderRequest request) {
        return ResponseEntity.ok(adminAiService.testProvider(request));
    }
}
