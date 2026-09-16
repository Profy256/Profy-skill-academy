package com.profy256.profy.modules.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public class AiProviderDto {

    public record CreateProviderRequest(
            @NotBlank String name,
            @NotBlank @Pattern(regexp = "OPENAI|ANTHROPIC|GEMINI|CUSTOM") String providerType,
            @NotBlank String apiKey,
            @NotBlank String baseUrl,
            @NotBlank String defaultModel
    ) {}

    public record UpdateProviderRequest(
            String name,
            String providerType,
            String apiKey,
            String baseUrl,
            String defaultModel,
            Boolean isActive
    ) {}

    public record ProviderResponse(
            UUID id,
            String name,
            String providerType,
            String baseUrl,
            String defaultModel,
            Boolean isActive,
            String apiKeyMasked
    ) {}

    public record SettingsResponse(
            UUID activeProviderId,
            String activeProviderName
    ) {}

    public record UpdateSettingsRequest(
            UUID activeProviderId
    ) {}

    public record TestProviderRequest(
            @NotBlank String message
    ) {}

    public record TestProviderResponse(
            boolean success,
            String response,
            String error
    ) {}
}
