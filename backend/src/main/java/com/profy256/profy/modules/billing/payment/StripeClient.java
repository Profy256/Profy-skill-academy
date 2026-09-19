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
     * Construct and verify a Stripe webhook event from raw payload + signature.
     */
    public Event constructWebhookEvent(String payload, String sigHeader) throws SignatureVerificationException {
        return Webhook.constructEvent(payload, sigHeader, appConfig.getStripeWebhookSecret());
    }

    /**
     * Extract userId and plan from a completed checkout session.
     */
    public Map<String, String> extractSessionData(Session session) {
        return Map.of(
                "userId", session.getMetadata().get("userId"),
                "plan", session.getMetadata().get("plan"),
                "customerId", session.getCustomer() != null ? session.getCustomer() : "",
                "subscriptionId", session.getSubscription() != null ? session.getSubscription() : ""
        );
    }
}
