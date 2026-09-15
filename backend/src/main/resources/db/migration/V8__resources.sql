-- V8: Resources (PDFs, books, etc.) linked to taxonomy nodes (courses)

CREATE TABLE resources (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id           uuid NOT NULL REFERENCES taxonomy_nodes(id),
    title             text NOT NULL,
    description       text,
    file_name         text NOT NULL,
    file_size         text,
    file_url          text,
    added_by          uuid NOT NULL REFERENCES admin_users(id),
    allow_download    boolean NOT NULL DEFAULT false,
    page_flip_enabled boolean NOT NULL DEFAULT true,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_node ON resources(node_id);
