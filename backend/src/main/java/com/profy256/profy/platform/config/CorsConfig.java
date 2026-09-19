package com.profy256.profy.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Configuration
public class CorsConfig {

    private final AppConfig appConfig;

    public CorsConfig(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    /**
     * Resolves allowed origins from the {@code CORS_ALLOWED_ORIGINS} env var
     * (comma-separated). Falls back to {@code WEB_ORIGIN} / {@code ADMIN_ORIGIN}
     * if the primary var is empty, then to localhost dev defaults.
     */
    private List<String> resolveOrigins() {
        String raw = appConfig.getCorsAllowedOrigins();

        if (raw == null || raw.isBlank()) {
            // Build from individual origin vars
            raw = Stream.of(appConfig.getWebOrigin(), appConfig.getAdminOrigin())
                    .filter(s -> s != null && !s.isBlank())
                    .collect(Collectors.joining(","));
        }

        if (raw == null || raw.isBlank()) {
            // Localhost dev defaults
            return List.of(
                    "http://localhost:3000",
                    "http://localhost:3003",
                    "http://localhost:5173",
                    "http://localhost:4173"
            );
        }

        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(resolveOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-App-Version"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
