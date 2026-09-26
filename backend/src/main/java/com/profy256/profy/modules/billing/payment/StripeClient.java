package com.profy256.profy.modules.billing.payment;

import com.profy256.profy.platform.config.AppConfig;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class StripeClient {

    private static final Logger log = LoggerFactory.getLogger(StripeClient.class);

    private final AppConfig appConfig;

    public StripeClient(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    /**
     * Create a Stripe Checkout session for international card payments.
     */
    public String createCheckoutSession(String userId, String plan, String successUrl, String cancelUrl) throws StripeException {
        com.stripe.Stripe.apiKey = appConfig.getStripeSecretKey();

        SessionCreateParams.Builder builder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .putMetadata("userId", userId)
                .putMetadata("plan", plan);

        if ("premium".equals(plan)) {
            builder.addLineItem(SessionCreateParams.LineItem.builder()
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency("usd")
                            .setRecurring(SessionCreateParams.LineItem.PriceData.Recurring.builder()
                                    .setInterval(SessionCreateParams.LineItem.PriceData.Recurring.Interval.MONTH)
                                    .build())
                            .setUnitAmount(999L) // $9.99/month
                            .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                    .setName("Dera Skul Premium")
                                    .build())
                            .build())
                    .setQuantity(Long.valueOf(1))
                    .build());
        }

        Session session = Session.create(builder.build());
        log.info("Stripe checkout session created: {}", session.getId());
        return session.getUrl();
    }

    /**
     * One-off (non-recurring) Checkout session — used to buy a certificate
     * test-retake credit. mode=PAYMENT so no subscription is created.
     */
    public String createPaymentCheckoutSession(String userId, long amountCents,
                                               String currency, String description,
                                               String successUrl, String cancelUrl,
                                               Map<String, String> metadata) throws StripeException {
        com.stripe.Stripe.apiKey = appConfig.getStripeSecretKey();

        SessionCreateParams.Builder builder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .putMetadata("userId", userId);

        if (metadata != null) {
            for (Map.Entry<String, String> e : metadata.entrySet()) {
                builder.putMetadata(e.getKey(), e.getValue());
            }
        }

        SessionCreateParams params = builder
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(currency)
                                .setUnitAmount(amountCents)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(description)
                                        .build())
                                .build())
                        .setQuantity(Long.valueOf(1))
                        .build())
                .build();

        Session session = Session.create(params);
        log.info("Stripe cert-credit session created: {}", session.getId());
        return session.getUrl();
    }

    /** Re-read a session (lets the app confirm payment without waiting for a webhook). */
    public Map<String, String> retrieveSessionData(String sessionId) {
        try {
            com.stripe.Stripe.apiKey = appConfig.getStripeSecretKey();
            Session session = Session.retrieve(sessionId);
            Map<String, String> out = new java.util.HashMap<>();
            out.put("status", session.getStatus());
            out.put("paymentStatus", session.getPaymentStatus());
            if (session.getMetadata() != null) out.putAll(session.getMetadata());
            out.put("sessionId", session.getId());
            return out;
        } catch (StripeException e) {
            throw new RuntimeException("Could not read checkout session: " + e.getMessage(), e);
        }
    }

    /**
     * Construct and verify a Stripe webhook event from raw payload + signature.
     */
    public Event constructWebhookEvent(String payload, String sigHeader) throws SignatureVerificationException {
        return Webhook.constructEvent(payload, sigHeader, appConfig.getStripeWebhookSecret());
    }

    /**
     * Extract userId and plan from a completed checkout session.
     */
    public Map<String, String> extractSessionData(Session session) {
        Map<String, String> out = new java.util.HashMap<>();
        if (session.getMetadata() != null) out.putAll(session.getMetadata());
        out.put("customerId", session.getCustomer() != null ? session.getCustomer() : "");
        out.put("subscriptionId", session.getSubscription() != null ? session.getSubscription() : "");
        out.put("sessionId", session.getId());
        return out;
    }
}
