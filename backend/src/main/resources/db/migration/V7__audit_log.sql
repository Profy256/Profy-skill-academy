-- V7: Audit log
-- TECHNICAL_DOC §4.7

CREATE TABLE audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   uuid NOT NULL REFERENCES admin_users(id),
    action          text NOT NULL,
    entity          text NOT NULL,
    entity_id       uuid,
    payload         jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_admin ON audit_log(admin_user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity, entity_id);
