-- V4: Progress, bookmarks, quiz attempts, certificates
-- TECHNICAL_DOC §4.4

CREATE TABLE lesson_progress (
    user_id         uuid REFERENCES users(id),
    lesson_id       uuid REFERENCES lessons(id),
    status          text NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','completed')),
    completed_at    timestamptz,
    updated_at      timestamptz,
    PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE quiz_attempts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid REFERENCES users(id),
    lesson_id      uuid REFERENCES lessons(id),
    score          integer NOT NULL,
    total          integer NOT NULL,
    passed         boolean NOT NULL,
    attempt_number integer NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);

CREATE TABLE bookmarks (
    user_id     uuid REFERENCES users(id),
    lesson_id   uuid REFERENCES lessons(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE certificates (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL,
    course_node_id uuid NOT NULL,
    cert_code      text UNIQUE,
    issued_at      timestamptz,
    revoked_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);
