package com.profy256.profy.modules.ai.service;

import com.profy256.profy.modules.ai.service.LLMProvider.ChatMessage;
import com.profy256.profy.modules.ai.service.LLMProvider.ChatResponse;
import com.profy256.profy.modules.ai.service.AiProviderService.ActiveProviderWithKeys;
import com.profy256.profy.modules.ai.service.AiProviderService.KeyInfo;
import com.profy256.profy.platform.config.AppConfig;
import com.profy256.profy.platform.error.AiUnavailableException;
import com.profy256.profy.platform.error.AiUnavailableException.Reason;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Single entry point for calling LLMs.
 *
 * Resolves the active provider from admin settings (falling back to .env),
 * then tries its API keys in health order: healthy keys first, fewest
 * failures, least recently used. A key rejected by the provider (401/403)
 * or rate-limited (429) is cooled down and the next key is tried, so the
 * gateway always lands on "the healthy one".
 */
@Component
public class LlmGateway {

    private static final Logger log = LoggerFactory.getLogger(LlmGateway.class);

    private final AiProviderService providerService;
    private final OpenAiCompatibleProvider openAiProvider;
    private final AnthropicProvider anthropicProvider;
    private final GeminiProvider geminiProvider;
    private final AppConfig appConfig;

    public LlmGateway(AiProviderService providerService,
                      OpenAiCompatibleProvider openAiProvider,
                      AnthropicProvider anthropicProvider,
                      GeminiProvider geminiProvider,
                      AppConfig appConfig) {
        this.providerService = providerService;
        this.openAiProvider = openAiProvider;
        this.anthropicProvider = anthropicProvider;
        this.geminiProvider = geminiProvider;
        this.appConfig = appConfig;
    }

    public ChatResponse complete(List<ChatMessage> messages, String systemPrompt) {
        ActiveProviderWithKeys active = providerService.getActiveProviderWithKeys().orElse(null);

        if (active == null || active.keys().isEmpty()) {
            return envFallback(messages, systemPrompt, active);
        }

        AiUnavailableException last = null;
        for (KeyInfo key : active.keys()) {
            try {
                ChatResponse response = dispatch(active.providerType(), messages, systemPrompt,
                        key.apiKey(), active.baseUrl(), active.defaultModel());
                providerService.recordKeySuccess(key.id());
                return response;
            } catch (AiUnavailableException e) {
                log.warn("AI key '{}' ({}) failed [{}]: {}", key.label(), active.name(), e.getReason(), e.getMessage());
                providerService.recordKeyFailure(key.id(), e.getReason(), e.getMessage());
                last = e;
                if (e.getReason() == Reason.NETWORK) {
                    // Connectivity problem — rotating keys cannot fix it.
                    break;
                }
            }
        }
        throw last != null ? last : new AiUnavailableException("No usable AI API keys");
    }

    private ChatResponse envFallback(List<ChatMessage> messages, String systemPrompt,
                                     ActiveProviderWithKeys active) {
        String apiKey = appConfig.getAiApiKey();
        String baseUrl = active != null ? active.baseUrl() : appConfig.getAiBaseUrl();
        String model = active != null ? active.defaultModel() : appConfig.getAiModel();

        if (active != null && active.keys().isEmpty()) {
            log.warn("Active AI provider '{}' has no API keys — falling back to env config", active.name());
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new AiUnavailableException(
                    "No AI API key configured. Add a provider and at least one API key in AI Settings, or set AI_API_KEY in .env");
        }

        String lowerUrl = baseUrl.toLowerCase();
        if (lowerUrl.contains("anthropic")) {
            return anthropicProvider.complete(messages, systemPrompt, apiKey, baseUrl, model);
        } else if (lowerUrl.contains("google") || lowerUrl.contains("gemini")) {
            return geminiProvider.complete(messages, systemPrompt, apiKey, baseUrl, model);
        } else {
            return openAiProvider.complete(messages, systemPrompt, apiKey, baseUrl, model);
        }
    }

    private ChatResponse dispatch(String providerType, List<ChatMessage> messages, String systemPrompt,
                                  String apiKey, String baseUrl, String model) {
        if (providerType == null) {
            return openAiProvider.complete(messages, systemPrompt, apiKey, baseUrl, model);
        }
        return switch (providerType) {
            case "ANTHROPIC" -> anthropicProvider.complete(messages, systemPrompt, apiKey, baseUrl, model);
            case "GEMINI" -> geminiProvider.complete(messages, systemPrompt, apiKey, baseUrl, model);
            // OPENAI, DEEPSEEK, OPENROUTER and CUSTOM all speak the OpenAI chat-completions API
            default -> openAiProvider.complete(messages, systemPrompt, apiKey, baseUrl, model);
        };
    }
}
