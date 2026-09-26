package com.profy256.profy.platform.security;

import com.profy256.profy.platform.config.CorsConfig;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CorsConfig corsConfig;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, CorsConfig corsConfig) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.corsConfig = corsConfig;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/healthz", "/actuator/health").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/admin/auth/**").permitAll()
                .requestMatchers("/api/v1/taxonomy/**").permitAll()
                .requestMatchers("/api/v1/search/**").permitAll()
                .requestMatchers("/api/v1/home/**").permitAll()
                // The certificate final test hangs off /courses/{slug} (a public
                // catalog route), but attempts and eligibility are per-learner —
                // declared before the catalog wildcard so anonymous callers get
                // a clean 401/403 instead of reaching the handler unauthenticated.
                .requestMatchers("/api/v1/courses/*/final-test",
                        "/api/v1/courses/*/final-test/**").authenticated()
                .requestMatchers("/api/v1/courses/**").permitAll()
                .requestMatchers("/api/v1/lessons/*/ai/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/resources/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/lessons/**").permitAll()
                // Blog is read-anonymous; only /admin/blog/** needs ADMIN.
                .requestMatchers(HttpMethod.GET, "/api/v1/blog", "/api/v1/blog/**").permitAll()
                // Public credential verification (code -> holder, PDF, PNG).
                .requestMatchers(HttpMethod.GET, "/api/v1/verify/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/certificates/definitions").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            // Anonymous callers get 401 and authenticated-but-not-allowed get 403,
            // both with the standard {"error":{code,message}} envelope (spec + clients).
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                        writeError(response, HttpStatus.UNAUTHORIZED, "unauthorized", "Authentication required"))
                .accessDeniedHandler((request, response, accessDeniedException) ->
                        writeError(response, HttpStatus.FORBIDDEN, "forbidden", "Access denied")))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private static void writeError(HttpServletResponse response, HttpStatus status,
                                   String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\":{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}}");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
