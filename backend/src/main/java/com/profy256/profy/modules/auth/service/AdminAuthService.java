package com.profy256.profy.modules.auth.service;

import com.profy256.profy.modules.auth.dto.AuthResponses.AdminLoginResponse;
import com.profy256.profy.modules.auth.dto.AuthResponses.AdminUserResponse;
import com.profy256.profy.modules.auth.entity.AdminUser;
import com.profy256.profy.modules.auth.entity.RefreshToken;
import com.profy256.profy.modules.auth.entity.User;
import com.profy256.profy.modules.auth.repository.AdminUserRepository;
import com.profy256.profy.modules.auth.repository.RefreshTokenRepository;
import com.profy256.profy.modules.auth.repository.UserRepository;
import com.profy256.profy.platform.error.UnauthorizedException;
import com.profy256.profy.platform.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AdminAuthService {

    private static final String ADMIN_AUDIENCE = "admin";

    private final AdminUserRepository adminUserRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AdminAuthService(AdminUserRepository adminUserRepository,
                            UserRepository userRepository,
                            RefreshTokenRepository refreshTokenRepository,
                            JwtTokenProvider jwtTokenProvider,
                            PasswordEncoder passwordEncoder) {
        this.adminUserRepository = adminUserRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AdminLoginResponse login(String email, String password) {
        AdminUser admin = adminUserRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(password, admin.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return issueAdminTokenPair(admin);
    }

    @Transactional
    public AdminLoginResponse refresh(String refreshToken) {
        String tokenHash = AuthService.sha256(refreshToken);
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

        UUID adminUserId = UUID.fromString(jwtTokenProvider.getUserIdFromToken(refreshToken));
        AdminUser admin = adminUserRepository.findById(adminUserId)
                .orElseThrow(() -> new UnauthorizedException("Admin user not found"));

        return issueAdminTokenPair(admin);
    }

    @Transactional
    public void logout(String refreshToken) {
        String tokenHash = AuthService.sha256(refreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                });
    }

    private AdminLoginResponse issueAdminTokenPair(AdminUser admin) {
        String accessToken = jwtTokenProvider.generateAccessToken(admin.getId(), admin.getEmail(), ADMIN_AUDIENCE);
        String refreshToken = jwtTokenProvider.generateRefreshToken(admin.getId());

        Instant expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
        RefreshToken storedRefresh = new RefreshToken(
                resolveUserForToken(admin.getId()),
                AuthService.sha256(refreshToken),
                expiresAt,
                "admin"
        );
        refreshTokenRepository.save(storedRefresh);

        int expiresIn = 15 * 60;
        AdminUserResponse adminUserResponse = new AdminUserResponse(
                admin.getId(), admin.getEmail(), admin.getName(), admin.getRole()
        );
        return new AdminLoginResponse(accessToken, refreshToken, "Bearer", expiresIn, adminUserResponse);
    }

    private User resolveUserForToken(UUID userId) {
        java.util.Optional<User> existing = userRepository.findById(userId);
        if (existing.isPresent()) {
            return existing.get();
        }

        AdminUser admin = adminUserRepository.findById(userId).orElseThrow();

        // A consumer account may already use this email (emails are globally unique) —
        // reuse it as the token's user instead of inserting a conflicting synthetic row.
        java.util.Optional<User> byEmail = userRepository.findByEmail(admin.getEmail());
        if (byEmail.isPresent()) {
            return byEmail.get();
        }

        User synthetic = new User(admin.getEmail(), admin.getPasswordHash(), admin.getName());
        synthetic.setId(admin.getId());
        return userRepository.save(synthetic);
    }
}
