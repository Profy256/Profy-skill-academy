package com.profy256.profy.modules.ai.dto;

import jakarta.validation.constraints.NotBlank;

public class AiRequests {

    public record AIChatRequest(
        @NotBlank String message
    ) {}
}
