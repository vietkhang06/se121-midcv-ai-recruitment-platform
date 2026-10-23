CREATE TABLE oauth_pending_registrations (
    ticket_hash CHAR(64) PRIMARY KEY,
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('github')),
    provider_subject VARCHAR(255) NOT NULL,
    provider_login VARCHAR(255),
    display_name VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_oauth_pending_registration_expiry ON oauth_pending_registrations(expires_at);
