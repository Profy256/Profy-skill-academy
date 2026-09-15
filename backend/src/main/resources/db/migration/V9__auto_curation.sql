-- V9: Automatic video curation support
-- Product decision (2026-09-15): admin-curated videos keep top priority; lessons with no
-- curated video get one automatically sourced from the YouTube Data API v3.
-- `source='auto'` rows are created without an admin author, surface in the review queue
-- (curator_status stays 'pending') and are limited to one per lesson.

ALTER TABLE lesson_videos
    ADD COLUMN source text NOT NULL DEFAULT 'curated'
    CHECK (source IN ('curated','auto'));

-- Auto videos have no admin author.
ALTER TABLE lesson_videos
    ALTER COLUMN added_by DROP NOT NULL;

-- At most one auto-sourced video per lesson (partial index keeps curated rows unaffected).
CREATE UNIQUE INDEX uq_lesson_videos_one_auto
    ON lesson_videos(lesson_id)
    WHERE source = 'auto';

CREATE INDEX idx_lesson_videos_source ON lesson_videos(source);
