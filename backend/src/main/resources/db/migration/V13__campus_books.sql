-- V13: CampusLibrary integration
-- Cached book metadata from CampusLibrary + admin premium settings

CREATE TABLE campus_books (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_book_id    VARCHAR(100) UNIQUE NOT NULL,
    title             VARCHAR(500) NOT NULL,
    author            VARCHAR(300) NOT NULL,
    description       TEXT,
    cover_url         VARCHAR(1000),
    category_slug     VARCHAR(200),
    category_name     VARCHAR(200),
    language          VARCHAR(10) DEFAULT 'en',
    page_count        INTEGER,
    published_year    INTEGER,
    formats           JSONB DEFAULT '["pdf"]',
    rating            NUMERIC(3,1),
    rating_count      INTEGER DEFAULT 0,
    is_available      BOOLEAN DEFAULT true,
    last_synced_at    TIMESTAMPTZ DEFAULT now(),
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campus_book_settings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_book_id    VARCHAR(100) UNIQUE NOT NULL,
    is_premium        BOOLEAN DEFAULT false,
    is_featured       BOOLEAN DEFAULT false,
    custom_note       TEXT,
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campus_books_category ON campus_books(category_slug);
CREATE INDEX idx_campus_books_title ON campus_books USING gin(to_tsvector('english', title));
CREATE INDEX idx_campus_books_author ON campus_books USING gin(to_tsvector('english', author));
CREATE INDEX idx_campus_books_synced ON campus_books(last_synced_at);
CREATE INDEX idx_campus_book_settings_book ON campus_book_settings(campus_book_id);
