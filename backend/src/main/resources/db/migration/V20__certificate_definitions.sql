-- V20: Certificate definitions — admin can create as many credentials as they
-- want, name them, and decide what earns each one.
--
-- Two flavours, both supported by the same table:
--   * course-tied  (course_node_id set)  — earned by studying that course:
--       require_final_test=true  → learner must pass the course final test
--       require_course_complete  → learner must also finish every lesson
--   * standalone   (course_node_id NULL) — awarded manually by an admin
--       (e.g. "Facilitator Award", instructor badges, completions of
--        programmes taught outside the platform)

CREATE TABLE certificate_definitions (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   text NOT NULL,
    slug                   text NOT NULL UNIQUE,
    short_name             text,
    description            text,
    badge_color            text NOT NULL DEFAULT '#1f3a8a',

    -- Course linkage (NULL = standalone / manually issued)
    course_node_id         uuid REFERENCES taxonomy_nodes(id) ON DELETE SET NULL,

    -- Earning criteria (ignored for standalone definitions)
    require_final_test     boolean NOT NULL DEFAULT true,
    require_course_complete boolean NOT NULL DEFAULT false,
    pass_percent           integer NOT NULL DEFAULT 70,
    min_progress_percent   integer NOT NULL DEFAULT 0,
    auto_issue             boolean NOT NULL DEFAULT true,

    -- Optional per-certificate wording/colour overrides (fall back to
    -- certificate_settings when NULL)
    cert_heading_override  text,
    cert_intro_override    text,
    cert_achieved_override text,
    accent_color_override  text,

    is_enabled             boolean NOT NULL DEFAULT true,
    sort_order             integer NOT NULL DEFAULT 0,
    created_by             uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cert_definitions_course ON certificate_definitions(course_node_id);
CREATE INDEX idx_cert_definitions_enabled ON certificate_definitions(is_enabled, sort_order);

-- Which credential a row represents (NULL for pre-V20 legacy certificates).
ALTER TABLE certificates ADD COLUMN definition_id uuid
    REFERENCES certificate_definitions(id) ON DELETE SET NULL;

CREATE INDEX idx_certificates_definition ON certificates(definition_id);
