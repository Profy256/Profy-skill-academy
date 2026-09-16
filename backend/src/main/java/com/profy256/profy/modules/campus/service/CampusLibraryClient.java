package com.profy256.profy.modules.campus.service;

import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusLibraryBook;
import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusLibraryCategory;
import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusLibraryPagination;
import com.profy256.profy.modules.campus.dto.CampusBookDto.CampusLibraryResponse;
import com.profy256.profy.platform.config.AppConfig;
import com.profy256.profy.platform.error.AiUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class CampusLibraryClient {

    private static final Logger log = LoggerFactory.getLogger(CampusLibraryClient.class);
    private final RestTemplate restTemplate;
    private final AppConfig appConfig;

    public CampusLibraryClient(AppConfig appConfig) {
        this.appConfig = appConfig;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        this.restTemplate = new RestTemplate(requestFactory);
    }

    public CampusLibraryResponse listBooks(int page, int limit, String category, String search) {
        String baseUrl = appConfig.getCampusLibraryBaseUrl();
        String apiKey = appConfig.getCampusLibraryApiKey();

        if (baseUrl == null || baseUrl.isBlank()) {
            return new CampusLibraryResponse(Collections.emptyList(),
                    new CampusLibraryPagination(page, limit, 0, 0));
        }

        try {
            UriComponentsBuilder uriBuilder = UriComponentsBuilder
                    .fromHttpUrl(baseUrl.replaceAll("/+$", "") + "/api/v1/books")
                    .queryParam("page", page)
                    .queryParam("limit", limit);

            if (category != null && !category.isBlank()) {
                uriBuilder.queryParam("category", category);
            }
            if (search != null && !search.isBlank()) {
                uriBuilder.queryParam("search", search);
            }

            HttpHeaders headers = buildHeaders(apiKey);
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<CampusLibraryResponse> response = restTemplate.exchange(
                    uriBuilder.toUriString(),
                    HttpMethod.GET,
                    request,
                    CampusLibraryResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }

            return new CampusLibraryResponse(Collections.emptyList(),
                    new CampusLibraryPagination(page, limit, 0, 0));

        } catch (ResourceAccessException e) {
            log.error("CampusLibrary unreachable: {}", e.getMessage());
            return new CampusLibraryResponse(Collections.emptyList(),
                    new CampusLibraryPagination(page, limit, 0, 0));
        } catch (Exception e) {
            log.error("CampusLibrary listBooks error: {}", e.getMessage());
            return new CampusLibraryResponse(Collections.emptyList(),
                    new CampusLibraryPagination(page, limit, 0, 0));
        }
    }

    public CampusLibraryBook getBook(String campusBookId) {
        String baseUrl = appConfig.getCampusLibraryBaseUrl();
        String apiKey = appConfig.getCampusLibraryApiKey();

        if (baseUrl == null || baseUrl.isBlank()) {
            return null;
        }

        try {
            String url = baseUrl.replaceAll("/+$", "") + "/api/v1/books/" + campusBookId;
            HttpHeaders headers = buildHeaders(apiKey);
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<CampusLibraryBook> response = restTemplate.exchange(
                    url, HttpMethod.GET, request, CampusLibraryBook.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            return null;

        } catch (Exception e) {
            log.error("CampusLibrary getBook error for {}: {}", campusBookId, e.getMessage());
            return null;
        }
    }

    public List<CampusLibraryCategory> getCategories() {
        String baseUrl = appConfig.getCampusLibraryBaseUrl();
        String apiKey = appConfig.getCampusLibraryApiKey();

        if (baseUrl == null || baseUrl.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String url = baseUrl.replaceAll("/+$", "") + "/api/v1/categories";
            HttpHeaders headers = buildHeaders(apiKey);
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, request,
                    new ParameterizedTypeReference<>() {});

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object cats = response.getBody().get("categories");
                if (cats instanceof List<?> list) {
                    // Deserialize manually since we get raw maps
                    return list.stream()
                            .filter(item -> item instanceof Map)
                            .map(item -> {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> map = (Map<String, Object>) item;
                                return new CampusLibraryCategory(
                                        (String) map.get("id"),
                                        (String) map.get("name"),
                                        (String) map.get("slug"));
                            })
                            .toList();
                }
            }
            return Collections.emptyList();

        } catch (Exception e) {
            log.error("CampusLibrary getCategories error: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private HttpHeaders buildHeaders(String apiKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (apiKey != null && !apiKey.isBlank()) {
            headers.set("X-API-Key", apiKey);
            headers.setBearerAuth(apiKey);
        }
        return headers;
    }
}
