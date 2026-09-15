package com.profy256.profy.modules.billing.payment;

import com.profy256.profy.platform.config.AppConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Component
public class MarzPayClient {

    private static final Logger log = LoggerFactory.getLogger(MarzPayClient.class);

    private final AppConfig appConfig;
    private final RestTemplate restTemplate;

    public MarzPayClient(AppConfig appConfig) {
        this.appConfig = appConfig;
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofSeconds(10));
        rf.setReadTimeout(Duration.ofSeconds(15));
        this.restTemplate = new RestTemplate(rf);
    }

    /**
     * Initiate a mobile money collection (UG/KE).
     * Returns a map with "status", "uuid", "reference" etc.
     */
    public Map<String, Object> collectMoney(String phoneNumber, int amount, String country,
                                            String reference, String description,
                                            String callbackUrl, List<Map<String, String>> metadata) {
        String url = appConfig.getMarzpayBaseUrl().replaceAll("/+$", "") + "/collect-money";

        HttpHeaders headers = createAuthHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("phone_number", phoneNumber);
        body.put("amount", amount);
        body.put("country", country);
        body.put("reference", reference);
        if (description != null) body.put("description", description);
        if (callbackUrl != null) body.put("callback_url", callbackUrl);
        if (metadata != null && !metadata.isEmpty()) body.put("metadata", metadata);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("MarzPay collection initiated: reference={}", reference);
                return response.getBody();
            }
            throw new RuntimeException("MarzPay returned status: " + response.getStatusCode());
        } catch (Exception e) {
            log.error("MarzPay collect-money failed: {}", e.getMessage());
            throw new RuntimeException("Payment initiation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get transaction status by UUID or reference.
     */
    public Map<String, Object> getTransaction(String identifier) {
        String url = appConfig.getMarzpayBaseUrl().replaceAll("/+$", "") + "/transactions/" + identifier;

        HttpHeaders headers = createAuthHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new RuntimeException("MarzPay returned status: " + response.getStatusCode());
        } catch (Exception e) {
            log.error("MarzPay get-transaction failed: {}", e.getMessage());
            throw new RuntimeException("Payment lookup failed: " + e.getMessage(), e);
        }
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String credentials = appConfig.getMarzpayApiKey() + ":" + appConfig.getMarzpayApiSecret();
        String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encoded);
        return headers;
    }
}
