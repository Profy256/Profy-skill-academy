package com.profy256.profy.modules.auth.service;

import com.profy256.profy.modules.auth.dto.AuthResponses.AdminLoginResponse;
import com.profy256.profy.modules.auth.entity.AdminUser;
import com.profy256.profy.modules.auth.entity.RefreshToken;
import com.profy256.profy.modules.auth.entity.User;
import com.profy256.profy.modules.auth.repository.AdminUserRepository;
import com.profy256.profy.modules.auth.repository.RefreshTokenRepository;
import com.profy256.profy.modules.auth.repository.UserRepository;
import com.profy256.profy.platform.error.UnauthorizedException;
import com.profy256.profy.platform.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class AdminAuthServiceTest {

    @Mock
    private AdminUserRepository adminUserRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminAuthService adminAuthService;

    private UUID adminId;
    private AdminUser adminUser;

    @BeforeEach
    void setUp() {
        adminId = UUID.randomUUID();
        adminUser = new AdminUser("admin@example.com", "encoded-admin-pw", "Admin Name");
        adminUser.setRole("admin");
        adminUser.setId(adminId);
    }

    // ─── login ─────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returnsAdminLoginResponse() {
        when(adminUserRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("admin-pass", "encoded-admin-pw")).thenReturn(true);

        when(jwtTokenProvider.generateAccessToken(adminId, "admin@example.com", "admin"))
                .thenReturn("admin-access-token");
        when(jwtTokenProvider.generateRefreshToken(adminId)).thenReturn("admin-refresh-token");

        User resolvedUser = new User("admin@example.com", "encoded-admin-pw", "Admin Name");
        resolvedUser.setId(adminId);
        when(userRepository.findById(adminId)).thenReturn(Optional.of(resolvedUser));

        AdminLoginResponse response = adminAuthService.login("admin@example.com", "admin-pass");

        assertThat(response.accessToken()).isEqualTo("admin-access-token");
        assertThat(response.refreshToken()).isEqualTo("admin-refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(15 * 60);

        assertThat(response.adminUser()).isNotNull();
        assertThat(response.adminUser().id()).isEqualTo(adminId);
        assertThat(response.adminUser().email()).isEqualTo("admin@example.com");
        assertThat(response.adminUser().name()).isEqualTo("Admin Name");
        assertThat(response.adminUser().role()).isEqualTo("admin");

        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void login_wrongPassword_throwsUnauthorizedException() {
        when(adminUserRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("wrong-pass", "encoded-admin-pw")).thenReturn(false);

        assertThatThrownBy(() -> adminAuthService.login("admin@example.com", "wrong-pass"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid email or password");

        verify(jwtTokenProvider, never()).generateAccessToken(any(), anyString(), anyString());
    }

    @Test
    void login_nonexistentEmail_throwsUnauthorizedException() {
        when(adminUserRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminAuthService.login("ghost@example.com", "pass"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid email or password");
    }

    // ─── refresh ───────────────────────────────────────────────────────

    @Test
    void refresh_validToken_rotatesTokenPair() {
        String rawRefresh = "admin-raw-refresh";
        String hash = AuthService.sha256(rawRefresh);

        RefreshToken stored = new RefreshToken(new User("admin@example.com", "hash", "n"),
                hash, Instant.now().plus(7, ChronoUnit.DAYS), "admin");
        stored.setRevokedAt(null);

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(stored));
        when(jwtTokenProvider.getUserIdFromToken(rawRefresh)).thenReturn(adminId.toString());
        when(adminUserRepository.findById(adminId)).thenReturn(Optional.of(adminUser));

        when(jwtTokenProvider.generateAccessToken(adminId, "admin@example.com", "admin"))
                .thenReturn("new-admin-at");
        when(jwtTokenProvider.generateRefreshToken(adminId)).thenReturn("new-admin-rt");

        User resolvedUser = new User("admin@example.com", "hash", "n");
        resolvedUser.setId(adminId);
        when(userRepository.findById(adminId)).thenReturn(Optional.of(resolvedUser));

        AdminLoginResponse response = adminAuthService.refresh(rawRefresh);

        assertThat(response.accessToken()).isEqualTo("new-admin-at");
        assertThat(response.refreshToken()).isEqualTo("new-admin-rt");

        // Old token revoked
        assertThat(stored.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void refresh_expiredToken_throwsUnauthorizedException() {
        String rawRefresh = "expired-admin-rt";
        String hash = AuthService.sha256(rawRefresh);

        RefreshToken stored = new RefreshToken(new User("a@b.com", "h", "n"),
                hash, Instant.now().minus(1, ChronoUnit.DAYS), "admin");

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> adminAuthService.refresh(rawRefresh))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void refresh_revokedToken_throwsUnauthorizedException() {
        String rawRefresh = "revoked-admin-rt";
        String hash = AuthService.sha256(rawRefresh);

        RefreshToken stored = new RefreshToken(new User("a@b.com", "h", "n"),
                hash, Instant.now().plus(7, ChronoUnit.DAYS), "admin");
        stored.setRevokedAt(Instant.now().minusSeconds(3600));

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> adminAuthService.refresh(rawRefresh))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("revoked");
    }

    // ─── logout ────────────────────────────────────────────────────────

    @Test
    void logout_existingToken_revokesIt() {
        String rawRefresh = "admin-logout-rt";
        String hash = AuthService.sha256(rawRefresh);

        RefreshToken stored = new RefreshToken(new User("a@b.com", "h", "n"),
                hash, Instant.now().plus(7, ChronoUnit.DAYS), "admin");
        stored.setRevokedAt(null);

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(stored));

        adminAuthService.logout(rawRefresh);

        assertThat(stored.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(stored);
    }

    @Test
    void logout_nonexistentToken_doesNotThrow() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        adminAuthService.logout("nonexistent");

        verify(refreshTokenRepository, never()).save(any());
    }
}
