-- V15: multi-key AI providers + additional provider presets
-- Each provider can hold several API keys; the gateway prefers healthy keys
-- and fails over when a key is rejected (401/403) or rate-limited (429).

-- New provider type presets
ALTER TABLE ai_providers DROP CONSTRAINT IF EXISTS ai_providers_provider_type_check;
ALTER TABLE ai_providers ADD CONSTRAINT ai_providers_provider_type_check
    CHECK (provider_type IN ('OPENAI', 'ANTHROPIC', 'GEMINI', 'DEEPSEEK', 'OPENROUTER', 'CUSTOM'));

-- Per-provider API keys with health tracking
CREATE TABLE ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    label VARCHAR(100),
    api_key_encrypted TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    failure_count INTEGER NOT NULL DEFAULT 0,
    disabled_until TIMESTAMPTZ,
    last_error VARCHAR(500),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_provider_keys_provider ON ai_provider_keys(provider_id);

-- Migrate each provider's existing single key into the keys table
INSERT INTO ai_provider_keys (provider_id, label, api_key_encrypted)
SELECT id, 'default', api_key_encrypted FROM ai_providers;

-- Key storage now lives exclusively in ai_provider_keys
ALTER TABLE ai_providers DROP COLUMN api_key_encrypted;
