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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private UUID userId;
    private User user;
    private String rawRefreshToken;
    private String hashedRefreshToken;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User("test@example.com", "encoded-password", "Test User");
        user.setId(userId);

        rawRefreshToken = "raw-refresh-token-value";
        hashedRefreshToken = AuthService.sha256(rawRefreshToken);
    }

    // ─── register ──────────────────────────────────────────────────────

    @Test
    void register_createsUserAndReturnsTokenPair() {
        RegisterRequest request = new RegisterRequest("new@example.com", "password123", "New User", "web");

        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-pw");

        User savedUser = new User("new@example.com", "hashed-pw", "New User");
        UUID savedId = UUID.randomUUID();
        savedUser.setId(savedId);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        when(jwtTokenProvider.generateAccessToken(savedId, "new@example.com", "user")).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(savedId)).thenReturn("refresh-token");
        when(userRepository.findById(savedId)).thenReturn(Optional.of(savedUser));

        TokenPairResponse response = authService.register(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(15 * 60);

        verify(userRepository).save(any(User.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void register_duplicateEmail_throwsBadRequestException() {
        RegisterRequest request = new RegisterRequest("existing@example.com", "password123", "Dup User", "web");
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Email is already registered");

        verify(userRepository, never()).save(any());
        verify(refreshTokenRepository, never()).save(any());
    }

    // ─── login ─────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returnsTokenPair() {
        LoginRequest request = new LoginRequest("test@example.com", "correct-pass", "mobile");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-pass", "encoded-password")).thenReturn(true);

        when(jwtTokenProvider.generateAccessToken(userId, "test@example.com", "user")).thenReturn("at-1");
        when(jwtTokenProvider.generateRefreshToken(userId)).thenReturn("rt-1");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        TokenPairResponse response = authService.login(request);

        assertThat(response.accessToken()).isEqualTo("at-1");
        assertThat(response.refreshToken()).isEqualTo("rt-1");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void login_wrongPassword_throwsUnauthorizedException() {
        LoginRequest request = new LoginRequest("test@example.com", "wrong-pass", "web");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-pass", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid email or password");

        verify(jwtTokenProvider, never()).generateAccessToken(any(), anyString(), anyString());
    }

    @Test
    void login_nonexistentEmail_throwsUnauthorizedException() {
        LoginRequest request = new LoginRequest("nobody@example.com", "pass1234", "web");

        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid email or password");

        verify(jwtTokenProvider, never()).generateAccessToken(any(), anyString(), anyString());
    }

    @Test
    void login_deactivatedUser_throwsUnauthorizedException() {
        user.setActive(false);
        LoginRequest request = new LoginRequest("test@example.com", "correct-pass", "web");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-pass", "encoded-password")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Account is deactivated");

        verify(jwtTokenProvider, never()).generateAccessToken(any(), anyString(), anyString());
    }

    // ─── refresh ───────────────────────────────────────────────────────

    @Test
    void refresh_validToken_rotatesTokenPair() {
        RefreshRequest request = new RefreshRequest(rawRefreshToken);
        RefreshToken stored = new RefreshToken(user, hashedRefreshToken,
                Instant.now().plus(7, ChronoUnit.DAYS), "web");
        stored.setRevokedAt(null);

        when(refreshTokenRepository.findByTokenHash(hashedRefreshToken)).thenReturn(Optional.of(stored));

        when(jwtTokenProvider.generateAccessToken(userId, "test@example.com", "user")).thenReturn("new-at");
        when(jwtTokenProvider.generateRefreshToken(userId)).thenReturn("new-rt");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        TokenPairResponse response = authService.refresh(request);

        assertThat(response.accessToken()).isEqualTo("new-at");
        assertThat(response.refreshToken()).isEqualTo("new-rt");

        // Old token should be revoked
        assertThat(stored.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(stored);

        // New refresh token stored
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void refresh_expiredToken_throwsUnauthorizedException() {
        RefreshRequest request = new RefreshRequest(rawRefreshToken);
        RefreshToken stored = new RefreshToken(user, hashedRefreshToken,
                Instant.now().minus(1, ChronoUnit.DAYS), "web");

        when(refreshTokenRepository.findByTokenHash(hashedRefreshToken)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void refresh_revokedToken_throwsUnauthorizedException() {
        RefreshRequest request = new RefreshRequest(rawRefreshToken);
        RefreshToken stored = new RefreshToken(user, hashedRefreshToken,
                Instant.now().plus(7, ChronoUnit.DAYS), "web");
        stored.setRevokedAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(refreshTokenRepository.findByTokenHash(hashedRefreshToken)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("revoked");
    }

    @Test
    void refresh_unknownTokenHash_throwsUnauthorizedException() {
        RefreshRequest request = new RefreshRequest("unknown-token");

        when(refreshTokenRepository.findByTokenHash(AuthService.sha256("unknown-token")))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid refresh token");
    }

    // ─── logout ────────────────────────────────────────────────────────

    @Test
    void logout_existingToken_revokesIt() {
        RefreshToken stored = new RefreshToken(user, hashedRefreshToken,
                Instant.now().plus(7, ChronoUnit.DAYS), "web");

        when(refreshTokenRepository.findByTokenHash(hashedRefreshToken))
                .thenReturn(Optional.of(stored));

        authService.logout(rawRefreshToken);

        assertThat(stored.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(stored);
    }

    @Test
    void logout_nonexistentToken_doesNotThrow() {
        when(refreshTokenRepository.findByTokenHash(anyString()))
                .thenReturn(Optional.empty());

        authService.logout("nonexistent");

        verify(refreshTokenRepository, never()).save(any());
    }
}
