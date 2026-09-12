package com.profy256.profy.modules.auth.service;

import com.profy256.profy.modules.auth.dto.AuthRequests.LoginRequest;
import com.profy256.profy.modules.auth.dto.AuthRequests.RefreshRequest;
import com.profy256.profy.modules.auth.dto.AuthRequests.RegisterRequest;
import com.profy256.profy.modules.auth.dto.AuthResponses.TokenPairResponse;
import com.profy256.profy.modules.auth.entity.RefreshToken;
import com.profy256.profy.modules.auth.entity.User;
import com.profy256.profy.modules.auth.repository.RefreshTokenRepository;
import com.profy256.profy.modules.auth.repository.UserRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.UnauthorizedException;
import com.profy256.profy.platform.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private static final String ACCESS_TOKEN_AUDIENCE = "user";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       JwtTokenProvider jwtTokenProvider,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public TokenPairResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new BadRequestException("Email is already registered");
        }

        User user = new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.name()
        );
        user = userRepository.save(user);

        return issueTokenPair(user.getId(), user.getEmail(), request.device());
    }

    @Transactional(readOnly = true)
    public TokenPairResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }

        return issueTokenPair(user.getId(), user.getEmail(), request.device());
    }

    @Transactional
    public TokenPairResponse refresh(RefreshRequest request) {
        String tokenHash = sha256(request.refreshToken());
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (stored.isRevoked()) {
            throw new UnauthorizedException("Refresh token has been revoked");
        }
        if (stored.isExpired()) {
            throw new UnauthorizedException("Refresh token has expired");
        }

        stored.setRevokedAt(Instant.now());
        refreshTokenRepository.save(stored);

        User user = stored.getUser();
        return issueTokenPair(user.getId(), user.getEmail(), stored.getDevice());
    }

    @Transactional
    public void logout(String refreshToken) {
        String tokenHash = sha256(refreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                });
    }

    private TokenPairResponse issueTokenPair(java.util.UUID userId, String email, String device) {
        String accessToken = jwtTokenProvider.generateAccessToken(userId, email, ACCESS_TOKEN_AUDIENCE);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userId);

        Instant expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
        RefreshToken storedRefresh = new RefreshToken(
                userRepository.findById(userId).orElseThrow(),
                sha256(refreshToken),
                expiresAt,
                device
        );
        refreshTokenRepository.save(storedRefresh);

        int expiresIn = 15 * 60;
        return new TokenPairResponse(accessToken, refreshToken, "Bearer", expiresIn);
    }

    static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
