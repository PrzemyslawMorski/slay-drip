-- Consent per data type, owned by one user. Revoking consent deletes that user's
-- wardrobe items in the same transaction (BE-48). Expand-only: safe for clients that
-- have not reloaded yet.
CREATE TABLE consents (
    owner_sub  text        NOT NULL,
    data_type  text        NOT NULL CHECK (data_type IN ('wardrobe_photos')),
    granted    boolean     NOT NULL,
    granted_at timestamptz,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (owner_sub, data_type)
);

-- One row per wardrobe photo. The photo bytes live in object storage under s3_key.
-- Photos are re-encoded before storage, so the stored type is always JPEG or PNG.
CREATE TABLE wardrobe_items (
    id           uuid        PRIMARY KEY,
    owner_sub    text        NOT NULL,
    s3_key       text        NOT NULL UNIQUE,
    content_type text        NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png')),
    size_bytes   integer     NOT NULL CHECK (size_bytes > 0),
    created_at   timestamptz NOT NULL
);

CREATE INDEX wardrobe_items_owner_created_idx ON wardrobe_items (owner_sub, created_at DESC);
