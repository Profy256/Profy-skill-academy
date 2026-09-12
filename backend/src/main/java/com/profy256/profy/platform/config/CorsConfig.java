package com.profy256.profy.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class CorsConfig {

    private final AppConfig appConfig;

    public CorsConfig(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedHeader("Content-Type");
        config.addAllowedHeader("Authorization");
        config.addAllowedHeader("X-App-Version");
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("DELETE");
        config.addAllowedMethod("OPTIONS");

        List<String> origins = new ArrayList<>();
        String webOrigin = appConfig.getWebOrigin();
        String adminOrigin = appConfig.getAdminOrigin();
        if (webOrigin != null && !webOrigin.isEmpty()) origins.add(webOrigin);
        if (adminOrigin != null && !adminOrigin.isEmpty()) origins.add(adminOrigin);

        if (origins.isEmpty()) {
            origins.add("http://localhost:3000");
            origins.add("http://localhost:5173");
            origins.add("http://localhost:4173");
        }

        config.setAllowedOrigins(origins);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
