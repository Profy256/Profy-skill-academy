package com.profy256.profy.platform.security;

import com.profy256.profy.platform.config.AppConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        AppConfig config = new AppConfig();
        config.setJwtSecret("test-secret-key-that-is-at-least-32-bytes-long-for-hmac");
        config.setJwtAccessExpireMinutes(15);
        config.setJwtRefreshExpireDays(30);

        jwtTokenProvider = new JwtTokenProvider(config);
        testUserId = UUID.randomUUID();
    }

    // ─── generateAccessToken ───────────────────────────────────────────

    @Test
    void generateAccessToken_returnsNonNullToken() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "user@test.com", "user");

        assertThat(token).isNotBlank();
    }

    @Test
    void generateAccessToken_tokenContainsCorrectUserId() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "user@test.com", "user");
        String extractedId = jwtTokenProvider.getUserIdFromToken(token);

        assertThat(extractedId).isEqualTo(testUserId.toString());
    }

    @Test
    void generateAccessToken_tokenContainsCorrectEmail() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "user@test.com", "user");
        Claims claims = jwtTokenProvider.parseToken(token);

        assertThat(claims.get("email", String.class)).isEqualTo("user@test.com");
    }

    @Test
    void generateAccessToken_tokenContainsCorrectAudience() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "user@test.com", "admin");
        Claims claims = jwtTokenProvider.parseToken(token);

        assertThat(claims.get("audience", String.class)).isEqualTo("admin");
    }

    @Test
    void generateAccessToken_tokenIsCurrentlyValid() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "u@e.com", "user");

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    // ─── generateRefreshToken ──────────────────────────────────────────

    @Test
    void generateRefreshToken_returnsNonNullToken() {
        String token = jwtTokenProvider.generateRefreshToken(testUserId);

        assertThat(token).isNotBlank();
    }

    @Test
    void generateRefreshToken_canBeParsed() {
        String token = jwtTokenProvider.generateRefreshToken(testUserId);
        Claims claims = jwtTokenProvider.parseToken(token);

        assertThat(claims.getSubject()).isEqualTo(testUserId.toString());
        assertThat(claims.getExpiration()).isAfter(new Date());
    }

    @Test
    void generateRefreshToken_hasUniqueJti() {
        String token1 = jwtTokenProvider.generateRefreshToken(testUserId);
        String token2 = jwtTokenProvider.generateRefreshToken(testUserId);

        Claims c1 = jwtTokenProvider.parseToken(token1);
        Claims c2 = jwtTokenProvider.parseToken(token2);

        assertThat(c1.getId()).isNotEqualTo(c2.getId());
    }

    // ─── validateToken ─────────────────────────────────────────────────

    @Test
    void validateToken_validAccessToken_returnsTrue() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "e@e.com", "user");

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    void validateToken_validRefreshToken_returnsTrue() {
        String token = jwtTokenProvider.generateRefreshToken(testUserId);

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    void validateToken_tamperedToken_returnsFalse() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "e@e.com", "user");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(jwtTokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    void validateToken_emptyString_returnsFalse() {
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }

    @Test
    void validateToken_garbageString_returnsFalse() {
        assertThat(jwtTokenProvider.validateToken("not.a.jwt.token")).isFalse();
    }

    // ─── getUserIdFromToken ────────────────────────────────────────────

    @Test
    void getUserIdFromToken_extractsCorrectUserId() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "e@e.com", "user");

        String extracted = jwtTokenProvider.getUserIdFromToken(token);

        assertThat(extracted).isEqualTo(testUserId.toString());
    }

    @Test
    void getUserIdFromToken_fromRefreshToken_extractsCorrectUserId() {
        String token = jwtTokenProvider.generateRefreshToken(testUserId);

        String extracted = jwtTokenProvider.getUserIdFromToken(token);

        assertThat(extracted).isEqualTo(testUserId.toString());
    }

    // ─── getAudienceFromToken ──────────────────────────────────────────

    @Test
    void getAudienceFromToken_extractsCorrectAudience() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "e@e.com", "admin");

        String audience = jwtTokenProvider.getAudienceFromToken(token);

        assertThat(audience).isEqualTo("admin");
    }

    @Test
    void getAudienceFromToken_userAudience_extractsCorrectly() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "e@e.com", "user");

        String audience = jwtTokenProvider.getAudienceFromToken(token);

        assertThat(audience).isEqualTo("user");
    }

    // ─── isTokenExpired ────────────────────────────────────────────────

    @Test
    void isTokenExpired_freshToken_returnsFalse() {
        String token = jwtTokenProvider.generateAccessToken(testUserId, "e@e.com", "user");

        assertThat(jwtTokenProvider.isTokenExpired(token)).isFalse();
    }

    @Test
    void isTokenExpired_refreshToken_returnsFalse() {
        String token = jwtTokenProvider.generateRefreshToken(testUserId);

        assertThat(jwtTokenProvider.isTokenExpired(token)).isFalse();
    }
}
