package com.profy256.profy.modules.ai.service;

import com.profy256.profy.platform.error.AiUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.*;

@Component
public class GeminiProvider implements LLMProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiProvider.class);
    private final RestTemplate restTemplate;

    public GeminiProvider() {
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

            List<Map<String, Object>> contents = new ArrayList<>();

            // System instruction as first user/model pair
            contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", systemPrompt))));
            contents.add(Map.of("role", "model", "parts", List.of(Map.of("text", "Understood. I will follow these instructions."))));

            for (ChatMessage msg : messages) {
                String role = "user".equals(msg.role()) ? "user" : "model";
                contents.add(Map.of("role", role, "parts", List.of(Map.of("text", msg.content()))));
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", contents);
            body.put("generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 2048
            ));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            String url = baseUrl.replaceAll("/+$", "")
                    + "/models/" + model + ":generateContent?key=" + apiKey;
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> candidate = candidates.get(0);
                    Map<String, Object> contentMap = (Map<String, Object>) candidate.get("content");
                    if (contentMap != null) {
                        List<Map<String, Object>> partList = (List<Map<String, Object>>) contentMap.get("parts");
                        if (partList != null && !partList.isEmpty()) {
                            return new ChatResponse(partList.get(0).get("text").toString());
                        }
                    }
                }
                throw new AiUnavailableException("Unexpected Gemini response format");
            } else {
                throw new AiUnavailableException("Gemini API returned status: " + response.getStatusCode());
            }
        } catch (ResourceAccessException e) {
            log.error("Gemini provider unreachable: {}", e.getMessage());
            throw new AiUnavailableException("Gemini service is temporarily unavailable");
        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.error("Gemini provider error: {}", e.getMessage());
            throw new AiUnavailableException("Gemini service encountered an error");
        }
    }
}
