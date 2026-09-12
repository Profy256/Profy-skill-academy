package com.profy256.profy.modules.ai.service;

import com.profy256.profy.platform.config.AppConfig;
import com.profy256.profy.platform.error.AiUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.time.Duration;
import java.util.*;

@Component
public class OpenAiCompatibleProvider implements LLMProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleProvider.class);

    private final AppConfig appConfig;
    private final RestTemplate restTemplate;

    public OpenAiCompatibleProvider(AppConfig appConfig) {
        this.appConfig = appConfig;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        this.restTemplate = new RestTemplate(requestFactory);
    }

    @Override
    public ChatResponse complete(List<ChatMessage> messages, String systemPrompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(appConfig.getAiApiKey());

            List<Map<String, String>> apiMessages = new ArrayList<>();
            apiMessages.add(Map.of("role", "system", "content", systemPrompt));
            for (ChatMessage msg : messages) {
                apiMessages.add(Map.of("role", msg.role(), "content", msg.content()));
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", appConfig.getAiModel());
            body.put("messages", apiMessages);
            body.put("temperature", 0.7);
            body.put("max_tokens", 1024);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            String url = appConfig.getAiBaseUrl().replaceAll("/+$", "") + "/chat/completions";
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
            throw new AiUnavailableException("AI service is temporarily unavailable");
        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI provider error: {}", e.getMessage());
            throw new AiUnavailableException("AI service encountered an error");
        }
    }
}
