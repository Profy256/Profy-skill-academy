-- V16: Certificate feature — course final tests + issuance metadata
--
-- A certificate is earned by passing a course-level FINAL TEST.
--   * attempt #1 is free  <=> attempts_used = 0 AND course progress >= 50%
--   * otherwise the user must hold an unused test credit (see V17)
-- Lesson quizzes stay as ungraded practice and do NOT count toward certification.

-- ── Course-level final test (authored by admin per course node) ──
ALTER TABLE taxonomy_nodes ADD COLUMN final_test             jsonb;
ALTER TABLE taxonomy_nodes ADD COLUMN final_test_pass_percent integer NOT NULL DEFAULT 70;

-- ── Certificate issuance metadata ────────────────────────────────
-- Values are snapshotted at issue time so later profile/course edits
-- never rewrite an already-issued credential.
ALTER TABLE certificates ADD COLUMN recipient_name       text;
ALTER TABLE certificates ADD COLUMN course_name          text;
ALTER TABLE certificates ADD COLUMN score                integer;
ALTER TABLE certificates ADD COLUMN total                integer;
ALTER TABLE certificates ADD COLUMN pass_percent         integer;
ALTER TABLE certificates ADD COLUMN identity_verified_at timestamptz;
ALTER TABLE certificates ADD COLUMN email_sent_at        timestamptz;
ALTER TABLE certificates ADD COLUMN email_error          text;

-- Existing (pre-V16) certificates have no snapshot — backfill what we can.
UPDATE certificates c
   SET recipient_name = u.name,
       identity_verified_at = c.issued_at
  FROM users u
 WHERE c.user_id = u.id
   AND c.recipient_name IS NULL;

CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_code ON certificates(cert_code) WHERE revoked_at IS NULL;

-- ── Final test attempts (separate from lesson quiz_attempts) ────
CREATE TABLE test_attempts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id),
    course_node_id uuid NOT NULL REFERENCES taxonomy_nodes(id),
    score          integer NOT NULL,
    total          integer NOT NULL,
    passed         boolean NOT NULL,
    attempt_number integer NOT NULL,
    free_attempt   boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_attempts_user_course
    ON test_attempts(user_id, course_node_id, created_at DESC);
