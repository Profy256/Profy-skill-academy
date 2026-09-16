package com.profy256.profy.modules.ai.service;

import com.profy256.profy.modules.ai.dto.AiProviderDto.CreateProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.ProviderResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.SettingsResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.UpdateProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.UpdateSettingsRequest;
import com.profy256.profy.modules.ai.entity.AiAdminSettings;
import com.profy256.profy.modules.ai.entity.AiProvider;
import com.profy256.profy.modules.ai.repository.AiAdminSettingsRepository;
import com.profy256.profy.modules.ai.repository.AiProviderRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AiProviderService {

    private static final Logger log = LoggerFactory.getLogger(AiProviderService.class);
    private static final String AES_ALGO = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final AiProviderRepository providerRepository;
    private final AiAdminSettingsRepository settingsRepository;
    private final SecretKeySpec encryptionKey;

    public AiProviderService(AiProviderRepository providerRepository,
                             AiAdminSettingsRepository settingsRepository,
                             @Value("${profy.ai-encryption-key:}") String encryptionKeyBase64) {
        this.providerRepository = providerRepository;
        this.settingsRepository = settingsRepository;

        if (encryptionKeyBase64 != null && !encryptionKeyBase64.isBlank()) {
            byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64);
            this.encryptionKey = new SecretKeySpec(keyBytes, "AES");
        } else {
            // Dev fallback — generate a random key (NOT for production)
            log.warn("No AI encryption key configured. Using dev-only random key. Set PROFY_AI_ENCRYPTION_KEY env var.");
            try {
                KeyGenerator keyGen = KeyGenerator.getInstance("AES");
                keyGen.init(256);
                SecretKey key = keyGen.generateKey();
                this.encryptionKey = new SecretKeySpec(key.getEncoded(), "AES");
            } catch (Exception e) {
                throw new RuntimeException("Failed to initialize AES key", e);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<ProviderResponse> listProviders() {
        return providerRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProviderResponse getProvider(UUID id) {
        AiProvider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI provider not found"));
        return toResponse(provider);
    }

    @Transactional
    public ProviderResponse createProvider(CreateProviderRequest request) {
        String encrypted = encrypt(request.apiKey());
        AiProvider provider = new AiProvider();
        provider.setName(request.name());
        provider.setProviderType(request.providerType());
        provider.setApiKeyEncrypted(encrypted);
        provider.setBaseUrl(request.baseUrl());
        provider.setDefaultModel(request.defaultModel());
        provider.setIsActive(true);
        provider = providerRepository.save(provider);
        return toResponse(provider);
    }

    @Transactional
    public ProviderResponse updateProvider(UUID id, UpdateProviderRequest request) {
        AiProvider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI provider not found"));

        if (request.name() != null) provider.setName(request.name());
        if (request.providerType() != null) provider.setProviderType(request.providerType());
        if (request.apiKey() != null && !request.apiKey().isBlank()) {
            provider.setApiKeyEncrypted(encrypt(request.apiKey()));
        }
        if (request.baseUrl() != null) provider.setBaseUrl(request.baseUrl());
        if (request.defaultModel() != null) provider.setDefaultModel(request.defaultModel());
        if (request.isActive() != null) provider.setIsActive(request.isActive());

        provider = providerRepository.save(provider);
        return toResponse(provider);
    }

    @Transactional
    public void deleteProvider(UUID id) {
        if (!providerRepository.existsById(id)) {
            throw new ResourceNotFoundException("AI provider not found");
        }
        // If this was the active provider, clear the setting
        settingsRepository.findAll().forEach(s -> {
            if (id.equals(s.getActiveProviderId())) {
                s.setActiveProviderId(null);
                settingsRepository.save(s);
            }
        });
        providerRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public SettingsResponse getSettings() {
        AiAdminSettings settings = settingsRepository.findById(
                UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .orElse(null);

        if (settings == null || settings.getActiveProviderId() == null) {
            return new SettingsResponse(null, null);
        }

        String name = providerRepository.findById(settings.getActiveProviderId())
                .map(AiProvider::getName)
                .orElse(null);

        return new SettingsResponse(settings.getActiveProviderId(), name);
    }

    @Transactional
    public SettingsResponse updateSettings(UpdateSettingsRequest request) {
        AiAdminSettings settings = settingsRepository.findById(
                UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .orElseGet(() -> {
                    AiAdminSettings s = new AiAdminSettings();
                    s.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
                    return s;
                });

        settings.setActiveProviderId(request.activeProviderId());
        settingsRepository.save(settings);
        return getSettings();
    }

    /**
     * Returns the decrypted API key for the active provider, or null if none configured.
     * Falls back to env-based provider (from AppConfig) if no DB provider is active.
     */
    public Optional<ActiveProviderInfo> getActiveProvider() {
        AiAdminSettings settings = settingsRepository.findById(
                UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .orElse(null);

        if (settings == null || settings.getActiveProviderId() == null) {
            return Optional.empty();
        }

        return providerRepository.findById(settings.getActiveProviderId())
                .map(p -> new ActiveProviderInfo(
                        p.getName(),
                        p.getProviderType(),
                        decrypt(p.getApiKeyEncrypted()),
                        p.getBaseUrl(),
                        p.getDefaultModel()
                ));
    }

    public record ActiveProviderInfo(
            String name,
            String providerType,
            String apiKey,
            String baseUrl,
            String defaultModel
    ) {}

    // ── Encryption helpers ─────────────────────────────────────

    private String encrypt(String plainText) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt API key", e);
        }
    }

    private String decrypt(String cipherText) {
        try {
            byte[] combined = Base64.getDecoder().decode(cipherText);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] encrypted = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, encrypted, 0, encrypted.length);

            Cipher cipher = Cipher.getInstance(AES_ALGO);
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] decrypted = cipher.doFinal(encrypted);

            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt API key", e);
        }
    }

    private ProviderResponse toResponse(AiProvider p) {
        String masked = maskKey(decrypt(p.getApiKeyEncrypted()));
        return new ProviderResponse(
                p.getId(), p.getName(), p.getProviderType(),
                p.getBaseUrl(), p.getDefaultModel(), p.getIsActive(), masked);
    }

    private String maskKey(String key) {
        if (key == null || key.length() < 8) return "****";
        return key.substring(0, 4) + "****" + key.substring(key.length() - 4);
    }
}
