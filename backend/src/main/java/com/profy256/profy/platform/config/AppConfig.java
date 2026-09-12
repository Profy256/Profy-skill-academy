package com.profy256.profy.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "profy")
public class AppConfig {

    private String jwtSecret = "dev-only-insecure-secret-change-me";
    private int jwtAccessExpireMinutes = 15;
    private int jwtRefreshExpireDays = 30;
    private String aiBaseUrl = "https://openrouter.ai/api/v1";
    private String aiApiKey = "";
    private String aiModel = "openai/gpt-4o-mini";
    private int aiFreeMsgsPerDay = 20;
    private int aiPremiumMsgsPerDay = 200;
    private String stripeSecretKey = "";
    private String stripeWebhookSecret = "";
    private String revenuecatWebhookAuth = "";
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

    public String getRevenuecatWebhookAuth() { return revenuecatWebhookAuth; }
    public void setRevenuecatWebhookAuth(String revenuecatWebhookAuth) { this.revenuecatWebhookAuth = revenuecatWebhookAuth; }

    public String getWebOrigin() { return webOrigin; }
    public void setWebOrigin(String webOrigin) { this.webOrigin = webOrigin; }

    public String getAdminOrigin() { return adminOrigin; }
    public void setAdminOrigin(String adminOrigin) { this.adminOrigin = adminOrigin; }
}
