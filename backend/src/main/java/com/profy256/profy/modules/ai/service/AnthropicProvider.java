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
public class AnthropicProvider implements LLMProvider {

    private static final Logger log = LoggerFactory.getLogger(AnthropicProvider.class);
    private final RestTemplate restTemplate;

    public AnthropicProvider() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.restTemplate = new RestTemplate(requestFactory);
    }

    @Override
    public ChatResponse complete(List<ChatMessage> messages, String systemPrompt) {
        return complete(messages, systemPrompt, null, null, null);
    }

    public ChatResponse complete(List<ChatMessage> messages, String systemPrompt,
                                  String apiKey, String baseUrl, String model) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            List<Map<String, String>> apiMessages = new ArrayList<>();
            for (ChatMessage msg : messages) {
                apiMessages.add(Map.of("role", msg.role(), "content", msg.content()));
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("max_tokens", 2048);
            body.put("system", systemPrompt);
            body.put("messages", apiMessages);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            String url = baseUrl.replaceAll("/+$", "") + "/messages";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
                if (content != null && !content.isEmpty()) {
                    String text = content.get(0).get("text").toString();
                    return new ChatResponse(text);
                }
                throw new AiUnavailableException("Unexpected Anthropic response format");
            } else {
                throw new AiUnavailableException("Anthropic API returned status: " + response.getStatusCode());
            }
        } catch (ResourceAccessException e) {
            log.error("Anthropic unreachable: {}", e.getMessage());
            throw new AiUnavailableException("Anthropic is temporarily unavailable",
                    AiUnavailableException.Reason.NETWORK);
        } catch (AiUnavailableException e) {
            throw e;
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            log.warn("{} rejected API key ({})", "Anthropic", e.getStatusCode().value());
            throw new AiUnavailableException("API key rejected by Anthropic",
                    AiUnavailableException.Reason.AUTH);
        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("{} rate limited", "Anthropic");
            throw new AiUnavailableException("Anthropic rate limit reached",
                    AiUnavailableException.Reason.RATE_LIMIT);
        } catch (HttpClientErrorException e) {
            log.error("{} client error: {}", "Anthropic", e.getStatusCode());
            throw new AiUnavailableException("Anthropic returned status " + e.getStatusCode().value(),
                    AiUnavailableException.Reason.OTHER);
        } catch (HttpServerErrorException e) {
            log.error("{} server error: {}", "Anthropic", e.getStatusCode());
            throw new AiUnavailableException("Anthropic is having server trouble",
                    AiUnavailableException.Reason.NETWORK);
        } catch (Exception e) {
            log.error("{} error: {}", "Anthropic", e.getMessage());
            throw new AiUnavailableException("Anthropic encountered an error",
                    AiUnavailableException.Reason.OTHER);
        }
    }
}
