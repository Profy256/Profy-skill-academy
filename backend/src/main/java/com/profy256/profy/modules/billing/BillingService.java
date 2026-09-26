package com.profy256.profy.modules.billing;

import com.profy256.profy.modules.billing.entity.Subscription;
import com.profy256.profy.modules.billing.payment.MarzPayClient;
import com.profy256.profy.modules.billing.payment.StripeClient;
import com.profy256.profy.modules.billing.repository.SubscriptionRepository;
import com.profy256.profy.platform.config.AppConfig;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.profy256.profy.modules.billing.event.PaymentSucceededEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);
    private static final String ENTITLEMENT_KEY_PREFIX = "entitlement:";
    private static final int ENTITLEMENT_CACHE_SECONDS = 60;

    private final SubscriptionRepository subscriptionRepository;
    private final StripeClient stripeClient;
    private final MarzPayClient marzPayClient;
    private final AppConfig appConfig;
    private final StringRedisTemplate redisTemplate;
    private final ApplicationEventPublisher eventPublisher;

    public BillingService(SubscriptionRepository subscriptionRepository,
                          StripeClient stripeClient,
                          MarzPayClient marzPayClient,
                          AppConfig appConfig,
                          StringRedisTemplate redisTemplate,
                          ApplicationEventPublisher eventPublisher) {
        this.subscriptionRepository = subscriptionRepository;
        this.stripeClient = stripeClient;
        this.marzPayClient = marzPayClient;
        this.appConfig = appConfig;
        this.redisTemplate = redisTemplate;
        this.eventPublisher = eventPublisher;
    }


    // ─── Entitlement check ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getEntitlement(UUID userId) {
        boolean isPremium = isUserPremium(userId);
        String plan = isPremium ? "premium" : "free";
        int dailyLimit = isPremium ? appConfig.getAiPremiumMsgsPerDay() : appConfig.getAiFreeMsgsPerDay();

        return Map.of(
                "plan", plan,
                "isPremium", isPremium,
                "aiDailyLimit", dailyLimit
        );
    }

    // ─── Stripe checkout (international) ─────────────────────────

    public Map<String, Object> createStripeCheckout(UUID userId, String plan, String successUrl, String cancelUrl) {
        try {
            String url = stripeClient.createCheckoutSession(userId.toString(), plan, successUrl, cancelUrl);
            return Map.of("checkoutUrl", url, "provider", "stripe");
        } catch (StripeException e) {
            log.error("Stripe checkout failed: {}", e.getMessage());
            throw new RuntimeException("Payment initiation failed: " + e.getMessage());
        }
    }

    // ─── MarzPay checkout (local mobile money — UG/KE) ───────────

    public Map<String, Object> createMarzPayCheckout(UUID userId, String plan,
                                                      String phoneNumber, String country) {
        String reference = UUID.randomUUID().toString();
        int amount = "premium".equals(plan) ? 37000 : 0; // 37,000 UGX/month
        String description = "Dera Skul - " + plan + " subscription";
        String callbackUrl = appConfig.getMarzpayCallbackUrl();

        Map<String, Object> result = marzPayClient.collectMoney(
                phoneNumber, amount, country, reference, description, callbackUrl, null);

        // Store pending subscription
        Subscription sub = new Subscription();
        sub.setUserId(userId);
        sub.setPlatform("web");
        sub.setProvider("marzpay");
        sub.setProviderCustomerId(phoneNumber);
        sub.setProviderSubscriptionId(reference);
        sub.setPlan(plan);
        sub.setStatus("pending");
        subscriptionRepository.save(sub);

        return Map.of(
                "reference", reference,
                "status", "pending",
                "provider", "marzpay",
                "amount", amount,
                "country", country
        );
    }


    // ─── Generic one-off payments (feature-agnostic) ────────────────
    //
    // Billing reports facts; it does not know what is being bought. Callers
    // pass amount + metadata, and receive PaymentSucceededEvent on settlement.

    public Map<String, Object> createOneOffStripeCheckout(UUID userId, long amountCents, String currency,
                                                          String description, Map<String, String> metadata,
                                                          String successUrl, String cancelUrl) {
        try {
            String url = stripeClient.createPaymentCheckoutSession(
                    userId.toString(), amountCents, currency, description,
                    successUrl, cancelUrl, metadata);
            Map<String, Object> out = new HashMap<>();
            out.put("checkoutUrl", url);
            out.put("provider", "stripe");
            out.put("amountCents", amountCents);
            out.put("currency", currency);
            return out;
        } catch (Exception e) {
            log.error("Stripe one-off checkout failed: {}", e.getMessage());
            throw new RuntimeException("Payment initiation failed: " + e.getMessage());
        }
    }

    public Map<String, Object> createOneOffMarzPayCollection(UUID userId, int amount, String currency,
                                                             String phoneNumber, String country,
                                                             String description, Map<String, String> metadata) {
        String reference = UUID.randomUUID().toString();
        marzPayClient.collectMoney(phoneNumber, amount, country, reference, description,
                appConfig.getMarzpayCallbackUrl(), toMetadataList(metadata));

        Map<String, Object> out = new HashMap<>();
        out.put("reference", reference);
        out.put("status", "pending");
        out.put("provider", "marzpay");
        out.put("amount", amount);
        out.put("currency", currency);
        out.put("country", country);
        return out;
    }

    /**
     * Provider-agnostic settlement lookup so clients can confirm a purchase
     * without waiting for a webhook (essential in local dev).
     * Returns {@code paid|pending|failed} plus any session/collection metadata.
     */
    public Map<String, String> queryPaymentStatus(String provider, String reference) {
        if ("stripe".equals(provider)) {
            Map<String, String> session = stripeClient.retrieveSessionData(reference);
            Map<String, String> out = new HashMap<>(session);
            out.put("status", "paid".equals(session.getOrDefault("paymentStatus", "unpaid")) ? "paid" : "pending");
            return out;
        }
        if ("marzpay".equals(provider)) {
            try {
                Map<String, Object> tx = marzPayClient.getTransaction(reference);
                String status = String.valueOf(tx.getOrDefault("status", "unknown"));
                String normalised = ("completed".equals(status) || "success".equals(status)) ? "paid"
                        : ("failed".equals(status) || "cancelled".equals(status)) ? "failed" : "pending";
                Map<String, String> out = new HashMap<>();
                out.put("status", normalised);
                out.put("reference", reference);
                return out;
            } catch (Exception e) {
                log.debug("MarzPay status lookup failed for {}: {}", reference, e.getMessage());
                return Map.of("status", "pending", "reference", reference);
            }
        }
        return Map.of("status", "pending", "reference", reference);
    }

    private List<Map<String, String>> toMetadataList(Map<String, String> metadata) {
        if (metadata == null || metadata.isEmpty()) return null;
        List<Map<String, String>> out = new ArrayList<>();
        metadata.forEach((k, v) -> out.add(Map.of("key", k, "value", v)));
        return out;
    }

    // ─── Webhook handlers ────────────────────────────────────────

    @Transactional
    public void handleStripeWebhook(Event event) {
        switch (event.getType()) {
            case "checkout.session.completed" -> {
                Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                if (session == null) return;

                Map<String, String> data = stripeClient.extractSessionData(session);
                UUID userId = UUID.fromString(data.get("userId"));

                // One-off purchases (anything that is not a subscription).
                if (data.get("purpose") != null && !"subscription".equals(data.get("purpose"))) {
                    eventPublisher.publishEvent(new PaymentSucceededEvent(
                            "stripe", session.getId(), userId, data));
                    return;
                }

                activateSubscription(userId, "stripe", data.get("customerId"),
                        data.get("subscriptionId"), data.get("plan"), "active");

                log.info("Stripe subscription activated: userId={}, plan={}", userId, data.get("plan"));
            }
            case "customer.subscription.deleted" -> {
                // Handle cancellation
                log.info("Stripe subscription cancelled event received");
            }
            default -> log.debug("Unhandled Stripe event: {}", event.getType());
        }
    }

    @Transactional
    public void handleMarzPayWebhook(Map<String, Object> payload) {
        String eventType = (String) payload.get("event_type");
        if (eventType == null) return;

        Map<String, Object> transaction = (Map<String, Object>) payload.get("transaction");
        if (transaction == null) return;

        String reference = (String) transaction.get("reference");
        String status = (String) transaction.get("status");

        if (reference == null || status == null) return;

        // References with no subscription row belong to a one-off purchase.
        if (subscriptionRepository.findFirstByProviderSubscriptionId(reference).isEmpty()) {
            if ("completed".equals(status) || "success".equals(status)) {
                eventPublisher.publishEvent(new PaymentSucceededEvent(
                        "marzpay", reference, null, Map.of("reference", reference)));
            }
            return;
        }

        Optional<Subscription> subOpt = subscriptionRepository
                .findFirstByProviderSubscriptionId(reference);

        if (subOpt.isPresent()) {
            Subscription sub = subOpt.get();
            if ("completed".equals(status)) {
                sub.setStatus("active");
                Instant now = Instant.now();
                sub.setCurrentPeriodEnd(now.plus(Duration.ofDays(30)));
                subscriptionRepository.save(sub);
                invalidateEntitlementCache(sub.getUserId());
                log.info("MarzPay subscription activated: reference={}", reference);
            } else if ("failed".equals(status) || "cancelled".equals(status)) {
                sub.setStatus(status);
                subscriptionRepository.save(sub);
                log.info("MarzPay subscription {}: reference={}", status, reference);
            }
        }
    }

    // ─── Subscription management ─────────────────────────────────

    @Transactional
    public void activateSubscription(UUID userId, String provider, String customerId,
                                     String subscriptionId, String plan, String status) {
        subscriptionRepository.findFirstByUserIdAndStatusOrderByCurrentPeriodEndDesc(userId, "active")
                .ifPresent(existing -> {
                    existing.setStatus("cancelled");
                    subscriptionRepository.save(existing);
                });

        Subscription sub = new Subscription();
        sub.setUserId(userId);
        sub.setPlatform("web");
        sub.setProvider(provider);
        sub.setProviderCustomerId(customerId);
        sub.setProviderSubscriptionId(subscriptionId);
        sub.setPlan(plan);
        sub.setStatus(status);
        sub.setCurrentPeriodEnd(Instant.now().plus(Duration.ofDays(30)));
        subscriptionRepository.save(sub);

        invalidateEntitlementCache(userId);
    }

    @Transactional
    public void cancelSubscription(UUID userId) {
        subscriptionRepository.findFirstByUserIdAndStatusOrderByCurrentPeriodEndDesc(userId, "active")
                .ifPresent(sub -> {
                    sub.setStatus("cancelled");
                    subscriptionRepository.save(sub);
                    invalidateEntitlementCache(userId);
                });
    }

    // ─── Internal helpers ────────────────────────────────────────

    @Transactional(readOnly = true)
    public boolean isUserPremium(UUID userId) {
        // Check cache first
        String cacheKey = ENTITLEMENT_KEY_PREFIX + userId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return "1".equals(cached);

        boolean premium = subscriptionRepository
                .findFirstByUserIdAndStatusOrderByCurrentPeriodEndDesc(userId, "active")
                .map(sub -> sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(Instant.now()))
                .orElse(false);

        // Cache for 60s
        redisTemplate.opsForValue().set(cacheKey, premium ? "1" : "0", Duration.ofSeconds(ENTITLEMENT_CACHE_SECONDS));
        return premium;
    }

    private void invalidateEntitlementCache(UUID userId) {
        redisTemplate.delete(ENTITLEMENT_KEY_PREFIX + userId);
    }
}
