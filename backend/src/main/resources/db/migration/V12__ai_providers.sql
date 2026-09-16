-- V12: AI Provider management for admin panel
-- Stores API keys encrypted in DB with .env fallback

CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('OPENAI', 'ANTHROPIC', 'GEMINI', 'CUSTOM')),
    api_key_encrypted TEXT NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    default_model VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert a single settings row
INSERT INTO ai_admin_settings (id, active_provider_id) VALUES ('00000000-0000-0000-0000-000000000001', NULL);
