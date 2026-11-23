ALTER TABLE users ADD COLUMN avatar_id UUID UNIQUE;

CREATE TABLE user_avatar_images (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    jpeg BYTEA NOT NULL CHECK (octet_length(jpeg) BETWEEN 1 AND 524288)
);
