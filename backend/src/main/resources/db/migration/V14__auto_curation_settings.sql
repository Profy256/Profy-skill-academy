-- V14: Admin toggle for automatic video curation
-- Single-row settings table; enabled=false lets admins turn auto-curation off
-- at runtime without removing YOUTUBE_API_KEY. Default: enabled.

CREATE TABLE auto_curation_settings (
    id UUID PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO auto_curation_settings (id, enabled)
VALUES ('00000000-0000-0000-0000-000000000010', true);
