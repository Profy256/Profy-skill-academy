package com.profy256.profy.modules.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public class AiProviderDto {

    public static final String PROVIDER_TYPES =
            "OPENAI|ANTHROPIC|GEMINI|DEEPSEEK|OPENROUTER|CUSTOM";

    public record CreateProviderRequest(
            @NotBlank String name,
            @NotBlank @Pattern(regexp = PROVIDER_TYPES) String providerType,
            String apiKey,
            @NotBlank String baseUrl,
            @NotBlank String defaultModel
    ) {}

    public record UpdateProviderRequest(
            String name,
            @Pattern(regexp = PROVIDER_TYPES) String providerType,
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
            String apiKeyMasked,
            int keyCount
    ) {}

    public record CreateKeyRequest(
            @NotBlank String apiKey,
            @Size(max = 100) String label
    ) {}

    public record KeyResponse(
            UUID id,
            UUID providerId,
            String label,
            String apiKeyMasked,
            Boolean isActive,
            Integer failureCount,
            Instant disabledUntil,
            String lastError,
            Instant lastUsedAt
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
