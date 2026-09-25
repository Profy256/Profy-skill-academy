package com.profy256.profy.modules.ai.service;

import com.profy256.profy.platform.error.AiUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.*;

@Component
public class OpenAiCompatibleProvider implements LLMProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleProvider.class);
    private final RestTemplate restTemplate;

    public OpenAiCompatibleProvider() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.restTemplate = new RestTemplate(requestFactory);
    }

    @Override
    public ChatResponse complete(List<ChatMessage> messages, String systemPrompt) {
        throw new AiUnavailableException("Use complete(messages, systemPrompt, apiKey, baseUrl, model) for multi-provider");
    }

    public ChatResponse complete(List<ChatMessage> messages, String systemPrompt,
                                  String apiKey, String baseUrl, String model) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            List<Map<String, String>> apiMessages = new ArrayList<>();
            apiMessages.add(Map.of("role", "system", "content", systemPrompt));
            for (ChatMessage msg : messages) {
                apiMessages.add(Map.of("role", msg.role(), "content", msg.content()));
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("messages", apiMessages);
            body.put("temperature", 0.7);
            body.put("max_tokens", 2048);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            String url = baseUrl.replaceAll("/+$", "") + "/chat/completions";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> message = (Map<String, Object>) choice.get("message");
                    if (message != null && message.get("content") != null) {
                        return new ChatResponse(message.get("content").toString());
                    }
                }
                throw new AiUnavailableException("Unexpected AI response format");
            } else {
                throw new AiUnavailableException("AI API returned status: " + response.getStatusCode());
            }
        } catch (ResourceAccessException e) {
            log.error("AI provider unreachable: {}", e.getMessage());
            throw new AiUnavailableException("AI provider is temporarily unavailable",
                    AiUnavailableException.Reason.NETWORK);
        } catch (AiUnavailableException e) {
            throw e;
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            log.warn("{} rejected API key ({})", "AI provider", e.getStatusCode().value());
            throw new AiUnavailableException("API key rejected by AI provider",
                    AiUnavailableException.Reason.AUTH);
        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("{} rate limited", "AI provider");
            throw new AiUnavailableException("AI provider rate limit reached",
                    AiUnavailableException.Reason.RATE_LIMIT);
        } catch (HttpClientErrorException e) {
            log.error("{} client error: {}", "AI provider", e.getStatusCode());
            throw new AiUnavailableException("AI provider returned status " + e.getStatusCode().value(),
                    AiUnavailableException.Reason.OTHER);
        } catch (HttpServerErrorException e) {
            log.error("{} server error: {}", "AI provider", e.getStatusCode());
            throw new AiUnavailableException("AI provider is having server trouble",
                    AiUnavailableException.Reason.NETWORK);
        } catch (Exception e) {
            log.error("{} error: {}", "AI provider", e.getMessage());
            throw new AiUnavailableException("AI provider encountered an error",
                    AiUnavailableException.Reason.OTHER);
        }
    }
}
