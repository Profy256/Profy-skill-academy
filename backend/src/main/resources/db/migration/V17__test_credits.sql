-- V17: Paid certificate-test credits
--
-- One credit = one final-test attempt. Bought when:
--   * the user has already used their free attempt (failed it), or
--   * the user has completed < 50% of the course and still wants to test.
-- Price: USD 2.00 (Stripe) / UGX 7,500 (MarzPay).

CREATE TABLE test_credits (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id),
    course_node_id uuid NOT NULL REFERENCES taxonomy_nodes(id),
    status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','unused','consumed','failed','refunded')),
    provider       text NOT NULL CHECK (provider IN ('stripe','marzpay','admin')),
    provider_ref   text NOT NULL,
    amount         integer NOT NULL,
    currency       text NOT NULL DEFAULT 'usd',
    consumed_at    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- A payment reference can only ever create one credit (webhook retry safety).
CREATE UNIQUE INDEX uniq_test_credits_provider_ref
    ON test_credits(provider, provider_ref);

CREATE INDEX idx_test_credits_user_course
    ON test_credits(user_id, course_node_id, status);
