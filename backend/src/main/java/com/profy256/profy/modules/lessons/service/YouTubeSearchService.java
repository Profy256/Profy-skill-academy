package com.profy256.profy.modules.lessons.service;

import com.profy256.profy.platform.config.AppConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Thin client for the YouTube Data API v3 search endpoint.
 *
 * Returns at most {@link #MAX_RESULTS} embeddable video candidates for a query.
 * Never throws upward: any failure (missing API key, quota exceeded, network error,
 * unexpected payload) yields an empty list so auto-curation degrades to a no-op
 * instead of breaking lesson reads.
 */
@Component
public class YouTubeSearchService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeSearchService.class);

    static final int MAX_RESULTS = 5;
    private static final String SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

    private final AppConfig appConfig;
    private final RestTemplate restTemplate;
    private volatile boolean warnedNoKey = false;

    public YouTubeSearchService(AppConfig appConfig) {
        this.appConfig = appConfig;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        this.restTemplate = new RestTemplate(requestFactory);
    }

    public boolean isConfigured() {
        return appConfig.getYoutubeApiKey() != null && !appConfig.getYoutubeApiKey().isBlank();
    }

    /**
     * A single search result candidate.
     */
    public record VideoCandidate(String videoId, String title, String channel) {}

    public List<VideoCandidate> search(String query) {
        if (!isConfigured()) {
            if (!warnedNoKey) {
                log.warn("YOUTUBE_API_KEY is not set — automatic video curation is disabled (curated-only behavior)");
                warnedNoKey = true;
            }
            return List.of();
        }

        try {
            String url = SEARCH_URL
                    + "?part=snippet&type=video&videoEmbeddable=true"
                    + "&maxResults=" + MAX_RESULTS
                    + "&relevanceLanguage=en"
                    + "&q=" + java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8)
                    + "&key=" + appConfig.getYoutubeApiKey();

            @SuppressWarnings("unchecked")
            Map<String, Object> body = restTemplate.getForObject(url, Map.class);
            return parseCandidates(body);
        } catch (Exception e) {
            // Quota exceeded, network errors, malformed responses — auto-curation is best-effort.
            log.error("YouTube search failed for query '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<VideoCandidate> parseCandidates(Map<String, Object> body) {
        List<VideoCandidate> candidates = new ArrayList<>();
        if (body == null) return candidates;

        Object itemsObj = body.get("items");
        if (!(itemsObj instanceof List<?> items)) return candidates;

        for (Object item : items) {
            if (!(item instanceof Map<?, ?> itemMap)) continue;
            try {
                Map<String, Object> id = (Map<String, Object>) itemMap.get("id");
                Map<String, Object> snippet = (Map<String, Object>) itemMap.get("snippet");
                if (id == null || snippet == null) continue;

                Object videoId = id.get("videoId");
                Object title = snippet.get("title");
                Object channel = snippet.get("channelTitle");
                if (videoId == null || title == null) continue;

                candidates.add(new VideoCandidate(
                        videoId.toString(),
                        title.toString(),
                        channel != null ? channel.toString() : null));
            } catch (Exception e) {
                log.warn("Skipping malformed YouTube search item: {}", e.getMessage());
            }
        }
        return candidates;
    }
}
