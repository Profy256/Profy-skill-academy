package com.profy256.profy.modules.ai.service;

import com.profy256.profy.modules.ai.service.AiProviderService.ActiveProviderWithKeys;
import com.profy256.profy.modules.ai.service.AiProviderService.KeyInfo;
import com.profy256.profy.modules.ai.service.LLMProvider.ChatMessage;
import com.profy256.profy.modules.ai.service.LLMProvider.ChatResponse;
import com.profy256.profy.platform.config.AppConfig;
import com.profy256.profy.platform.error.AiUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LlmGatewayTest {

    @Mock
    private AiProviderService providerService;

    @Mock
    private OpenAiCompatibleProvider openAiProvider;

    @Mock
    private AnthropicProvider anthropicProvider;

    @Mock
    private GeminiProvider geminiProvider;

    @Mock
    private AppConfig appConfig;

    @InjectMocks
    private LlmGateway gateway;

    private final List<ChatMessage> messages = List.of(new ChatMessage("user", "hello"));
    private final String system = "You are a teacher.";

    private UUID key1;
    private UUID key2;

    @BeforeEach
    void setUp() {
        key1 = UUID.randomUUID();
        key2 = UUID.randomUUID();
    }

    private ActiveProviderWithKeys provider(String type, List<KeyInfo> keys) {
        return new ActiveProviderWithKeys(UUID.randomUUID(), "Test", type,
                "https://api.example.com/v1", "test-model", keys);
    }

    @Test
    void firstHealthyKeyIsUsed() {
        when(providerService.getActiveProviderWithKeys())
                .thenReturn(Optional.of(provider("OPENAI", List.of(
                        new KeyInfo(key1, "sk-one", "primary"),
                        new KeyInfo(key2, "sk-two", "backup")))));
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-one"),
                anyString(), anyString())).thenReturn(new ChatResponse("hi from key 1"));

        ChatResponse resp = gateway.complete(messages, system);

        assertThat(resp.content()).isEqualTo("hi from key 1");
        verify(providerService).recordKeySuccess(key1);
        verify(providerService, never()).recordKeyFailure(any(), any(), any());
        verify(openAiProvider, never()).complete(anyList(), eq(system), eq("sk-two"), anyString(), anyString());
    }

    @Test
    void authFailureRotatesToNextKey() {
        when(providerService.getActiveProviderWithKeys())
                .thenReturn(Optional.of(provider("OPENAI", List.of(
                        new KeyInfo(key1, "sk-bad", "primary"),
                        new KeyInfo(key2, "sk-good", "backup")))));
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-bad"),
                anyString(), anyString()))
                .thenThrow(new AiUnavailableException("API key rejected", AiUnavailableException.Reason.AUTH));
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-good"),
                anyString(), anyString())).thenReturn(new ChatResponse("hi from key 2"));

        ChatResponse resp = gateway.complete(messages, system);

        assertThat(resp.content()).isEqualTo("hi from key 2");
        verify(providerService).recordKeyFailure(key1, AiUnavailableException.Reason.AUTH, "API key rejected");
        verify(providerService).recordKeySuccess(key2);
    }

    @Test
    void rateLimitedKeyIsCooledDownAndNextKeyUsed() {
        when(providerService.getActiveProviderWithKeys())
                .thenReturn(Optional.of(provider("OPENAI", List.of(
                        new KeyInfo(key1, "sk-one", "primary"),
                        new KeyInfo(key2, "sk-two", "backup")))));
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-one"),
                anyString(), anyString()))
                .thenThrow(new AiUnavailableException("rate limit", AiUnavailableException.Reason.RATE_LIMIT));
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-two"),
                anyString(), anyString())).thenReturn(new ChatResponse("ok"));

        ChatResponse resp = gateway.complete(messages, system);

        assertThat(resp.content()).isEqualTo("ok");
        verify(providerService).recordKeyFailure(key1, AiUnavailableException.Reason.RATE_LIMIT, "rate limit");
        verify(providerService).recordKeySuccess(key2);
    }

    @Test
    void networkFailureStopsRotation() {
        when(providerService.getActiveProviderWithKeys())
                .thenReturn(Optional.of(provider("OPENAI", List.of(
                        new KeyInfo(key1, "sk-one", "primary"),
                        new KeyInfo(key2, "sk-two", "backup")))));
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-one"),
                anyString(), anyString()))
                .thenThrow(new AiUnavailableException("unreachable", AiUnavailableException.Reason.NETWORK));

        assertThatThrownBy(() -> gateway.complete(messages, system))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("unreachable");

        // second key must not be attempted — connectivity issues aren't key-specific
        verify(openAiProvider, never()).complete(anyList(), eq(system), eq("sk-two"), anyString(), anyString());
        verify(providerService).recordKeyFailure(key1, AiUnavailableException.Reason.NETWORK, "unreachable");
        verify(providerService, never()).recordKeySuccess(any());
    }

    @Test
    void allKeysFailingThrowsLastError() {
        when(providerService.getActiveProviderWithKeys())
                .thenReturn(Optional.of(provider("OPENAI", List.of(
                        new KeyInfo(key1, "sk-one", "primary"),
                        new KeyInfo(key2, "sk-two", "backup")))));
        when(openAiProvider.complete(anyList(), eq(system), anyString(), anyString(), anyString()))
                .thenThrow(new AiUnavailableException("bad key", AiUnavailableException.Reason.AUTH));

        assertThatThrownBy(() -> gateway.complete(messages, system))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("bad key");

        verify(providerService).recordKeyFailure(key1, AiUnavailableException.Reason.AUTH, "bad key");
        verify(providerService).recordKeyFailure(key2, AiUnavailableException.Reason.AUTH, "bad key");
    }

    @Test
    void anthropicProviderIsDispatchedByType() {
        when(providerService.getActiveProviderWithKeys())
                .thenReturn(Optional.of(provider("ANTHROPIC", List.of(
                        new KeyInfo(key1, "sk-ant", "primary")))));
        when(anthropicProvider.complete(anyList(), eq(system), eq("sk-ant"),
                anyString(), anyString())).thenReturn(new ChatResponse("claude says hi"));

        ChatResponse resp = gateway.complete(messages, system);

        assertThat(resp.content()).isEqualTo("claude says hi");
        verify(openAiProvider, never()).complete(anyList(), any(), any(), any(), any());
    }

    @Test
    void deepseekUsesOpenAiCompatibleClient() {
        when(providerService.getActiveProviderWithKeys())
                .thenReturn(Optional.of(provider("DEEPSEEK", List.of(
                        new KeyInfo(key1, "sk-deep", "primary")))));
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-deep"),
                anyString(), anyString())).thenReturn(new ChatResponse("deepseek ok"));

        ChatResponse resp = gateway.complete(messages, system);

        assertThat(resp.content()).isEqualTo("deepseek ok");
        verify(providerService).recordKeySuccess(key1);
    }

    @Test
    void envFallbackWhenNoActiveProvider() {
        when(providerService.getActiveProviderWithKeys()).thenReturn(Optional.empty());
        when(appConfig.getAiApiKey()).thenReturn("sk-env");
        when(appConfig.getAiBaseUrl()).thenReturn("https://openrouter.ai/api/v1");
        when(appConfig.getAiModel()).thenReturn("openrouter/auto");
        when(openAiProvider.complete(anyList(), eq(system), eq("sk-env"),
                eq("https://openrouter.ai/api/v1"), eq("openrouter/auto")))
                .thenReturn(new ChatResponse("env says hi"));

        ChatResponse resp = gateway.complete(messages, system);

        assertThat(resp.content()).isEqualTo("env says hi");
    }

    @Test
    void noConfiguredKeyThrowsHelpfulError() {
        when(providerService.getActiveProviderWithKeys()).thenReturn(Optional.empty());
        when(appConfig.getAiApiKey()).thenReturn("");
        when(appConfig.getAiBaseUrl()).thenReturn("https://openrouter.ai/api/v1");

        assertThatThrownBy(() -> gateway.complete(messages, system))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("No AI API key configured");
    }
}
