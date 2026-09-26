-- V19: Certificate Studio — admin-editable pricing + redesignable certificate
-- Single row (same pattern as auto_curation_settings). Every value below is
-- managed from the admin panel: Admin → Certificates → Design & Pricing.

CREATE TABLE certificate_settings (
    id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Pricing / access (admin-editable cost for everything) ──────────
    test_price_cents              integer NOT NULL DEFAULT 200,   -- Stripe, USD cents
    test_price_ugx                integer NOT NULL DEFAULT 7500,  -- MarzPay, UGX
    free_attempt_progress_percent integer NOT NULL DEFAULT 50,
    default_pass_percent          integer NOT NULL DEFAULT 70,

    -- ── Test wording (admin-editable) ─────────────────────────────────
    test_title        text NOT NULL DEFAULT 'Final Certification Test',
    test_instructions text NOT NULL DEFAULT 'Answer every question. A score of {passPercent}% or higher earns your certificate.',

    -- ── Certificate wording (admin-editable) ──────────────────────────
    cert_heading          text    NOT NULL DEFAULT 'Certificate of Completion',
    cert_intro            text    NOT NULL DEFAULT 'This is to certify that',
    cert_achieved         text    NOT NULL DEFAULT 'has successfully completed the course',
    cert_course_label     text    NOT NULL DEFAULT 'Course',
    cert_score_label      text    NOT NULL DEFAULT 'Final Test Score',
    cert_date_label       text    NOT NULL DEFAULT 'Date Issued',
    cert_code_label       text    NOT NULL DEFAULT 'Credential ID',
    cert_signature_name   text    NOT NULL DEFAULT 'Dera Skul Academy',
    cert_signature_title  text    NOT NULL DEFAULT 'Issuing Authority',
    cert_footer           text    NOT NULL DEFAULT 'This credential can be verified at',
    cert_org_name         text    NOT NULL DEFAULT 'Dera Skul',

    -- ── Certificate look (admin-editable) ─────────────────────────────
    cert_primary_color    text    NOT NULL DEFAULT '#1f3a8a',
    cert_accent_color     text    NOT NULL DEFAULT '#c9a227',
    cert_paper_size       text    NOT NULL DEFAULT 'landscape' CHECK (cert_paper_size IN ('landscape','portrait')),
    cert_show_qr          boolean NOT NULL DEFAULT true,
    cert_enabled          boolean NOT NULL DEFAULT true,

    updated_at            timestamptz NOT NULL DEFAULT now(),
    updated_by            uuid
);

-- Seed the single settings row so reads never have to handle "empty".
INSERT INTO certificate_settings (id) VALUES ('00000000-0000-0000-0000-000000000011');
