-- V3: Lessons, lesson_videos, video_checks
-- TECHNICAL_DOC §4.2

CREATE TABLE lessons (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id       uuid NOT NULL REFERENCES taxonomy_nodes(id),
    title         text NOT NULL,
    slug          text NOT NULL,
    description   text,
    explanation   text,
    objectives    jsonb DEFAULT '[]',
    examples      jsonb DEFAULT '[]',
    exercises     jsonb DEFAULT '[]',
    quizzes       jsonb DEFAULT '[]',
    level         text NULL CHECK (level IN ('beginner','intermediate','advanced')),
    status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    sort_order    integer NOT NULL DEFAULT 0,
    created_by    uuid NOT NULL REFERENCES admin_users(id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (node_id, slug)
);

CREATE INDEX idx_lessons_node ON lessons(node_id);
CREATE INDEX idx_lessons_status ON lessons(status);

CREATE TABLE lesson_videos (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id        uuid NOT NULL REFERENCES lessons(id),
    youtube_video_id text NOT NULL,
    title            text NOT NULL,
    channel          text,
    is_primary       boolean NOT NULL DEFAULT false,
    curator_status   text NOT NULL DEFAULT 'approved'
                     CHECK (curator_status IN ('pending','approved','flagged','unavailable')),
    date_reviewed    date,
    notes            text,
    added_by         uuid NOT NULL REFERENCES admin_users(id),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_videos_lesson ON lesson_videos(lesson_id);
CREATE INDEX idx_lesson_videos_status ON lesson_videos(curator_status);

CREATE TABLE video_checks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_video_id uuid NOT NULL REFERENCES lesson_videos(id),
    checked_at      timestamptz NOT NULL,
    is_available    boolean NOT NULL
);

CREATE INDEX idx_video_checks_video ON video_checks(lesson_video_id);
