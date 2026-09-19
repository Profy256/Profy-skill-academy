package com.profy256.profy.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "profy")
public class AppConfig {

    private String jwtSecret = "dev-only-insecure-secret-change-me";
    private int jwtAccessExpireMinutes = 15;
    private int jwtRefreshExpireDays = 30;

    // AI — any OpenAI-compatible provider (OpenRouter, OpenAI, Gemini, Groq, Together, etc.)
    private String aiBaseUrl = "https://openrouter.ai/api/v1";
    private String aiApiKey = "";
    private String aiModel = "openai/gpt-4o-mini";
    private int aiFreeMsgsPerDay = 20;
    private int aiPremiumMsgsPerDay = 200;

    // Stripe (international payments)
    private String stripeSecretKey = "";
    private String stripeWebhookSecret = "";

    // MarzPay (local mobile money — UG/KE)
    private String marzpayBaseUrl = "https://wallet.wearemarz.com/api/v1";
    private String marzpayApiKey = "";
    private String marzpayApiSecret = "";
    private String marzpayCallbackUrl = "";

    // Mobile (RevenueCat)
    private String revenuecatWebhookAuth = "";

    // CampusLibrary
    private String campusLibraryBaseUrl = "https://campuslibrary.xyz";
    private String campusLibraryApiKey = "";

    // AI encryption key for DB-stored API keys (AES-256, base64-encoded)
    private String aiEncryptionKey = "";

    // Other
    private String youtubeApiKey = "";
    private String corsAllowedOrigins = "";
    private String webOrigin = "";
    private String adminOrigin = "";

    public String getJwtSecret() { return jwtSecret; }
    public void setJwtSecret(String jwtSecret) { this.jwtSecret = jwtSecret; }

    public int getJwtAccessExpireMinutes() { return jwtAccessExpireMinutes; }
    public void setJwtAccessExpireMinutes(int jwtAccessExpireMinutes) { this.jwtAccessExpireMinutes = jwtAccessExpireMinutes; }

    public int getJwtRefreshExpireDays() { return jwtRefreshExpireDays; }
    public void setJwtRefreshExpireDays(int jwtRefreshExpireDays) { this.jwtRefreshExpireDays = jwtRefreshExpireDays; }

    public String getAiBaseUrl() { return aiBaseUrl; }
    public void setAiBaseUrl(String aiBaseUrl) { this.aiBaseUrl = aiBaseUrl; }

    public String getAiApiKey() { return aiApiKey; }
    public void setAiApiKey(String aiApiKey) { this.aiApiKey = aiApiKey; }

    public String getAiModel() { return aiModel; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }

    public int getAiFreeMsgsPerDay() { return aiFreeMsgsPerDay; }
    public void setAiFreeMsgsPerDay(int aiFreeMsgsPerDay) { this.aiFreeMsgsPerDay = aiFreeMsgsPerDay; }

    public int getAiPremiumMsgsPerDay() { return aiPremiumMsgsPerDay; }
    public void setAiPremiumMsgsPerDay(int aiPremiumMsgsPerDay) { this.aiPremiumMsgsPerDay = aiPremiumMsgsPerDay; }

    public String getStripeSecretKey() { return stripeSecretKey; }
    public void setStripeSecretKey(String stripeSecretKey) { this.stripeSecretKey = stripeSecretKey; }

    public String getStripeWebhookSecret() { return stripeWebhookSecret; }
    public void setStripeWebhookSecret(String stripeWebhookSecret) { this.stripeWebhookSecret = stripeWebhookSecret; }

    public String getMarzpayBaseUrl() { return marzpayBaseUrl; }
    public void setMarzpayBaseUrl(String marzpayBaseUrl) { this.marzpayBaseUrl = marzpayBaseUrl; }

    public String getMarzpayApiKey() { return marzpayApiKey; }
    public void setMarzpayApiKey(String marzpayApiKey) { this.marzpayApiKey = marzpayApiKey; }

    public String getMarzpayApiSecret() { return marzpayApiSecret; }
    public void setMarzpayApiSecret(String marzpayApiSecret) { this.marzpayApiSecret = marzpayApiSecret; }

    public String getMarzpayCallbackUrl() { return marzpayCallbackUrl; }
    public void setMarzpayCallbackUrl(String marzpayCallbackUrl) { this.marzpayCallbackUrl = marzpayCallbackUrl; }

    public String getRevenuecatWebhookAuth() { return revenuecatWebhookAuth; }
    public void setRevenuecatWebhookAuth(String revenuecatWebhookAuth) { this.revenuecatWebhookAuth = revenuecatWebhookAuth; }

    public String getCampusLibraryBaseUrl() { return campusLibraryBaseUrl; }
    public void setCampusLibraryBaseUrl(String campusLibraryBaseUrl) { this.campusLibraryBaseUrl = campusLibraryBaseUrl; }

    public String getCampusLibraryApiKey() { return campusLibraryApiKey; }
    public void setCampusLibraryApiKey(String campusLibraryApiKey) { this.campusLibraryApiKey = campusLibraryApiKey; }

    public String getAiEncryptionKey() { return aiEncryptionKey; }
    public void setAiEncryptionKey(String aiEncryptionKey) { this.aiEncryptionKey = aiEncryptionKey; }

    public String getYoutubeApiKey() { return youtubeApiKey; }
    public void setYoutubeApiKey(String youtubeApiKey) { this.youtubeApiKey = youtubeApiKey; }

    public String getCorsAllowedOrigins() { return corsAllowedOrigins; }
    public void setCorsAllowedOrigins(String corsAllowedOrigins) { this.corsAllowedOrigins = corsAllowedOrigins; }

    public String getWebOrigin() { return webOrigin; }
    public void setWebOrigin(String webOrigin) { this.webOrigin = webOrigin; }

    public String getAdminOrigin() { return adminOrigin; }
    public void setAdminOrigin(String adminOrigin) { this.adminOrigin = adminOrigin; }
}
