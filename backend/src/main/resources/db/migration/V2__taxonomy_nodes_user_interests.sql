-- V2: Taxonomy nodes (recursive tree) + user_interests
-- TECHNICAL_DOC §4.1, §4.3

CREATE TABLE taxonomy_nodes (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     uuid NULL REFERENCES taxonomy_nodes(id),
    node_type     text CHECK (node_type IN ('category','subcategory','course')),
    name          text NOT NULL,
    slug          text NOT NULL UNIQUE,
    description   text,
    icon          text,
    phase         integer NOT NULL DEFAULT 1,
    is_active     boolean NOT NULL DEFAULT true,
    sort_order    integer NOT NULL DEFAULT 0,
    depth         integer NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_taxonomy_parent ON taxonomy_nodes(parent_id);
CREATE INDEX idx_taxonomy_phase ON taxonomy_nodes(phase);
CREATE INDEX idx_taxonomy_slug ON taxonomy_nodes(slug);

CREATE TABLE user_interests (
    user_id     uuid REFERENCES users(id),
    node_id     uuid REFERENCES taxonomy_nodes(id),
    PRIMARY KEY (user_id, node_id)
);
