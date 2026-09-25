package com.profy256.profy.modules.ai.service;

import com.profy256.profy.modules.ai.dto.AiProviderDto.CreateKeyRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.CreateProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.KeyResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.ProviderResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.SettingsResponse;
import com.profy256.profy.modules.ai.dto.AiProviderDto.UpdateProviderRequest;
import com.profy256.profy.modules.ai.dto.AiProviderDto.UpdateSettingsRequest;
import com.profy256.profy.modules.ai.entity.AiAdminSettings;
import com.profy256.profy.modules.ai.entity.AiProvider;
import com.profy256.profy.modules.ai.entity.AiProviderKey;
import com.profy256.profy.modules.ai.repository.AiAdminSettingsRepository;
import com.profy256.profy.modules.ai.repository.AiProviderKeyRepository;
import com.profy256.profy.modules.ai.repository.AiProviderRepository;
import com.profy256.profy.platform.error.AiUnavailableException.Reason;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AiProviderService {

    private static final Logger log = LoggerFactory.getLogger(AiProviderService.class);
    private static final String AES_ALGO = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private static final Duration AUTH_COOLDOWN = Duration.ofMinutes(15);
    private static final Duration RATE_LIMIT_COOLDOWN = Duration.ofSeconds(60);

    private final AiProviderRepository providerRepository;
    private final AiProviderKeyRepository keyRepository;
    private final AiAdminSettingsRepository settingsRepository;
    private final SecretKeySpec encryptionKey;

    public AiProviderService(AiProviderRepository providerRepository,
                             AiProviderKeyRepository keyRepository,
                             AiAdminSettingsRepository settingsRepository,
                             @Value("${profy.ai-encryption-key:}") String encryptionKeyBase64) {
        this.providerRepository = providerRepository;
        this.keyRepository = keyRepository;
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

    // ── Provider CRUD ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProviderResponse> listProviders() {
        List<AiProvider> providers = providerRepository.findAllByOrderByCreatedAtDesc();
        Map<UUID, List<AiProviderKey>> keysByProvider = keyRepository
                .findByProviderIdIn(providers.stream().map(AiProvider::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(AiProviderKey::getProviderId));

        return providers.stream()
                .map(p -> toResponse(p, keysByProvider.getOrDefault(p.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProviderResponse getProvider(UUID id) {
        AiProvider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI provider not found"));
        return toResponse(provider, keyRepository.findByProviderId(id));
    }

    @Transactional
    public ProviderResponse createProvider(CreateProviderRequest request) {
        AiProvider provider = new AiProvider();
        provider.setName(request.name());
        provider.setProviderType(request.providerType());
        provider.setBaseUrl(request.baseUrl());
        provider.setDefaultModel(request.defaultModel());
        provider.setIsActive(true);
        provider = providerRepository.save(provider);

        if (request.apiKey() != null && !request.apiKey().isBlank()) {
            addKeyEntity(provider.getId(), request.apiKey(), "default");
        }
        return getProvider(provider.getId());
    }

    @Transactional
    public ProviderResponse updateProvider(UUID id, UpdateProviderRequest request) {
        AiProvider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI provider not found"));

        if (request.name() != null) provider.setName(request.name());
        if (request.providerType() != null) provider.setProviderType(request.providerType());
        if (request.baseUrl() != null) provider.setBaseUrl(request.baseUrl());
        if (request.defaultModel() != null) provider.setDefaultModel(request.defaultModel());
        if (request.isActive() != null) provider.setIsActive(request.isActive());
        provider = providerRepository.save(provider);

        // Back-compat: clients that still send a single apiKey get it added as a new key.
        if (request.apiKey() != null && !request.apiKey().isBlank()) {
            addKeyEntity(provider.getId(), request.apiKey(), "default");
        }
        return getProvider(provider.getId());
    }

    @Transactional
    public void deleteProvider(UUID id) {
        if (!providerRepository.existsById(id)) {
            throw new ResourceNotFoundException("AI provider not found");
        }
        settingsRepository.findAll().forEach(s -> {
            if (id.equals(s.getActiveProviderId())) {
                s.setActiveProviderId(null);
                settingsRepository.save(s);
            }
        });
        keyRepository.deleteByProviderId(id);
        providerRepository.deleteById(id);
    }

    // ── Key CRUD ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<KeyResponse> listKeys(UUID providerId) {
        requireProvider(providerId);
        return keyRepository.findByProviderId(providerId).stream()
                .map(this::toKeyResponse)
                .toList();
    }

    @Transactional
    public KeyResponse addKey(UUID providerId, CreateKeyRequest request) {
        requireProvider(providerId);
        AiProviderKey key = addKeyEntity(providerId, request.apiKey(), request.label());
        return toKeyResponse(key);
    }

    @Transactional
    public void deleteKey(UUID providerId, UUID keyId) {
        AiProviderKey key = keyRepository.findById(keyId)
                .filter(k -> k.getProviderId().equals(providerId))
                .orElseThrow(() -> new ResourceNotFoundException("API key not found"));
        long remaining = keyRepository.findByProviderId(providerId).size();
        if (remaining <= 1) {
            throw new BadRequestException("A provider must keep at least one API key");
        }
        keyRepository.delete(key);
    }

    // ── Settings ───────────────────────────────────────────────

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
        if (request.activeProviderId() != null) {
            requireProvider(request.activeProviderId());
        }
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

    // ── Runtime resolution (used by LlmGateway) ────────────────

    /**
     * Returns the active provider with its decrypted API keys,
     * healthy keys first (see {@link AiProviderKeyRepository#findActiveKeysOrdered}).
     */
    @Transactional(readOnly = true)
    public Optional<ActiveProviderWithKeys> getActiveProviderWithKeys() {
        AiAdminSettings settings = settingsRepository.findById(
                UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .orElse(null);

        if (settings == null || settings.getActiveProviderId() == null) {
            return Optional.empty();
        }

        return providerRepository.findById(settings.getActiveProviderId())
                .map(p -> new ActiveProviderWithKeys(
                        p.getId(),
                        p.getName(),
                        p.getProviderType(),
                        p.getBaseUrl(),
                        p.getDefaultModel(),
                        keyRepository.findActiveKeysOrdered(p.getId(), Instant.now()).stream()
                                .map(k -> new KeyInfo(k.getId(), decrypt(k.getApiKeyEncrypted()), k.getLabel()))
                                .toList()
                ));
    }

    // REQUIRES_NEW: health updates must commit even when the caller runs
    // in a read-only transaction (e.g. the admin test endpoint).
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordKeySuccess(UUID keyId) {
        keyRepository.findById(keyId).ifPresent(k -> {
            k.setFailureCount(0);
            k.setDisabledUntil(null);
            k.setLastError(null);
            k.setLastUsedAt(Instant.now());
            keyRepository.save(k);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordKeyFailure(UUID keyId, Reason reason, String error) {
        keyRepository.findById(keyId).ifPresent(k -> {
            k.setLastUsedAt(Instant.now());
            k.setLastError(truncate(error, 500));
            switch (reason) {
                case AUTH -> {
                    k.setFailureCount(nullSafe(k.getFailureCount()) + 1);
                    k.setDisabledUntil(Instant.now().plus(AUTH_COOLDOWN));
                }
                case RATE_LIMIT -> {
                    k.setFailureCount(nullSafe(k.getFailureCount()) + 1);
                    k.setDisabledUntil(Instant.now().plus(RATE_LIMIT_COOLDOWN));
                }
                default -> {
                    // NETWORK / OTHER: record the error for admin visibility but do not
                    // penalize the key — rotating keys cannot fix connectivity issues.
                }
            }
            keyRepository.save(k);
        });
    }

    public record ActiveProviderWithKeys(
            UUID id,
            String name,
            String providerType,
            String baseUrl,
            String defaultModel,
            List<KeyInfo> keys
    ) {}

    public record KeyInfo(UUID id, String apiKey, String label) {}

    // ── Encryption helpers ─────────────────────────────────────

    private AiProviderKey addKeyEntity(UUID providerId, String apiKey, String label) {
        AiProviderKey key = new AiProviderKey();
        key.setProviderId(providerId);
        key.setLabel(label != null && !label.isBlank() ? label : "key-" + (keyRepository.findByProviderId(providerId).size() + 1));
        key.setApiKeyEncrypted(encrypt(apiKey));
        key.setIsActive(true);
        key.setFailureCount(0);
        return keyRepository.save(key);
    }

    private void requireProvider(UUID providerId) {
        if (!providerRepository.existsById(providerId)) {
            throw new ResourceNotFoundException("AI provider not found");
        }
    }

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

    private ProviderResponse toResponse(AiProvider p, List<AiProviderKey> keys) {
        String masked = keys.stream()
                .filter(AiProviderKey::getIsActive)
                .findFirst()
                .map(k -> maskKey(decrypt(k.getApiKeyEncrypted())))
                .orElse("no keys");
        return new ProviderResponse(
                p.getId(), p.getName(), p.getProviderType(),
                p.getBaseUrl(), p.getDefaultModel(), p.getIsActive(), masked, keys.size());
    }

    private KeyResponse toKeyResponse(AiProviderKey k) {
        return new KeyResponse(
                k.getId(), k.getProviderId(), k.getLabel(),
                maskKey(decrypt(k.getApiKeyEncrypted())),
                k.getIsActive(), k.getFailureCount(),
                k.getDisabledUntil(), k.getLastError(), k.getLastUsedAt());
    }

    private String maskKey(String key) {
        if (key == null || key.length() < 8) return "****";
        return key.substring(0, 4) + "****" + key.substring(key.length() - 4);
    }

    private static int nullSafe(Integer v) {
        return v == null ? 0 : v;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
