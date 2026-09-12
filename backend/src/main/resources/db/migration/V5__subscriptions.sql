-- V5: Subscriptions & entitlement
-- TECHNICAL_DOC §4.5

CREATE TABLE subscriptions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL REFERENCES users(id),
    platform                 text NOT NULL CHECK (platform IN ('web','ios','android')),
    provider                 text NOT NULL CHECK (provider IN ('stripe','revenuecat')),
    provider_customer_id     text,
    provider_subscription_id text NOT NULL,
    plan                     text NOT NULL CHECK (plan IN ('monthly','yearly')),
    status                   text NOT NULL CHECK (status IN ('active','canceled','past_due','expired')),
    current_period_end       timestamptz,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
