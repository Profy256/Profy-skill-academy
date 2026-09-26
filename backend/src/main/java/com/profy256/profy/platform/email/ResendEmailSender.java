package com.profy256.profy.platform.email;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.profy256.profy.platform.config.AppConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resend (https://resend.com) adapter for {@link EmailSender}.
 *
 * Degrades to a log line when RESEND_API_KEY is empty so the platform runs out
 * of the box; production only has to set the key.
 */
@Component
@Primary
public class ResendEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);
    private static final String API_URL = "https://api.resend.com/emails";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AppConfig appConfig;
    private final RestTemplate restTemplate;

    public ResendEmailSender(AppConfig appConfig) {
        this.appConfig = appConfig;
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(java.time.Duration.ofSeconds(10));
        rf.setReadTimeout(java.time.Duration.ofSeconds(20));
        this.restTemplate = new RestTemplate(rf);
    }

    @Override
    public String send(EmailMessage message) {
        try {
            String apiKey = appConfig.getResendApiKey();
            if (apiKey == null || apiKey.isBlank()) {
                log.info("Email skipped (RESEND_API_KEY empty) -> {} | {}",
                        message.to(), message.subject());
                return null;
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("from", appConfig.getResendFrom());
            body.put("to", message.recipients());
            body.put("subject", message.subject());
            body.put("html", message.html());

            if (message.attachmentBytes() != null && message.attachmentBytes().length > 0) {
                Map<String, Object> attachment = new LinkedHashMap<>();
                attachment.put("filename", message.attachmentName());
                attachment.put("content", Base64.getEncoder().encodeToString(message.attachmentBytes()));
                body.put("attachments", new ArrayList<>(List.of(attachment)));
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ResponseEntity<String> response = restTemplate.exchange(
                    API_URL, HttpMethod.POST,
                    new HttpEntity<>(MAPPER.writeValueAsString(body), headers),
                    String.class);

            return response.getStatusCode().is2xxSuccessful()
                    ? null
                    : "Resend returned HTTP " + response.getStatusCode().value();
        } catch (Exception e) {
            log.error("Email delivery failed: {}", e.getMessage());
            return e.getMessage();
        }
    }
}
