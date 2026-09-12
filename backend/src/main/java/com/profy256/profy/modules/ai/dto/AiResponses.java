package com.profy256.profy.modules.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class AiResponses {

    public record AIChatResponse(String reply) {}

    public record ChatMessageResponse(UUID id, String role, String content, Instant createdAt) {}

    public record ChatHistoryResponse(List<ChatMessageResponse> messages) {}
}
