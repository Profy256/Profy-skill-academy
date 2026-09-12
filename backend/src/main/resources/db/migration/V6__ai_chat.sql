-- V6: AI chat sessions & messages
-- TECHNICAL_DOC §4.6

CREATE TABLE ai_chat_sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id),
    lesson_id   uuid NOT NULL REFERENCES lessons(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_ai_sessions_user ON ai_chat_sessions(user_id);

CREATE TABLE ai_chat_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid NOT NULL REFERENCES ai_chat_sessions(id),
    role        text NOT NULL CHECK (role IN ('user','assistant')),
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_session ON ai_chat_messages(session_id);
