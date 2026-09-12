package com.profy256.profy.platform.security;

import com.profy256.profy.platform.config.AppConfig;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessExpireMs;
    private final long refreshExpireMs;

    public JwtTokenProvider(AppConfig config) {
        this.key = Keys.hmacShaKeyFor(config.getJwtSecret().getBytes(StandardCharsets.UTF_8));
        this.accessExpireMs = config.getJwtAccessExpireMinutes() * 60L * 1000;
        this.refreshExpireMs = (long) config.getJwtRefreshExpireDays() * 24 * 60 * 60 * 1000;
    }

    public String generateAccessToken(UUID userId, String email, String audience) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("audience", audience)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessExpireMs))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(UUID userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshExpireMs))
                .id(UUID.randomUUID().toString())
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getUserIdFromToken(String token) {
        return parseToken(token).getSubject();
    }

    public String getAudienceFromToken(String token) {
        return parseToken(token).get("audience", String.class);
    }

    public boolean isTokenExpired(String token) {
        return parseToken(token).getExpiration().before(new Date());
    }
}
