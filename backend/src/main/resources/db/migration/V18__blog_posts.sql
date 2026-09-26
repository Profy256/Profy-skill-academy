-- V18: Blog — admin-authored Markdown posts, public read API
-- SEO fields (meta_title / meta_description / slug) are separate from the
-- on-page title/excerpt so editors can optimise search snippets.

CREATE TABLE blog_posts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              text NOT NULL UNIQUE,
    title             text NOT NULL,
    excerpt           text,
    content_md        text NOT NULL DEFAULT '',
    cover_image_url   text,
    tags              jsonb NOT NULL DEFAULT '[]',
    meta_title        text,
    meta_description  text,
    status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','published','archived')),
    author_id         uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    published_at      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Public list only ever reads published rows.
CREATE INDEX idx_blog_posts_published
    ON blog_posts(published_at DESC)
    WHERE status = 'published';

CREATE INDEX idx_blog_posts_status ON blog_posts(status, updated_at DESC);
