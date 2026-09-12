package com.profy256.profy.modules.ai.controller;

import com.profy256.profy.modules.ai.dto.AiRequests.AIChatRequest;
import com.profy256.profy.modules.ai.dto.AiResponses.AIChatResponse;
import com.profy256.profy.modules.ai.dto.AiResponses.ChatHistoryResponse;
import com.profy256.profy.modules.ai.service.AiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lessons/{lessonId}/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AIChatResponse> chat(
            @PathVariable UUID lessonId,
            @Valid @RequestBody AIChatRequest request,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        AIChatResponse response = aiService.chat(userId, lessonId, request.message());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/messages")
    public ResponseEntity<ChatHistoryResponse> getMessages(
            @PathVariable UUID lessonId,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        ChatHistoryResponse response = aiService.getHistory(userId, lessonId);
        return ResponseEntity.ok(response);
    }
}
