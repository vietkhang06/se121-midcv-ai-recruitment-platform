CREATE TABLE oauth_login_states (
    state_hash CHAR(64) PRIMARY KEY,
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('google', 'github')),
    code_verifier VARCHAR(128) NOT NULL,
    nonce VARCHAR(128) NOT NULL,
    return_to VARCHAR(512) NOT NULL DEFAULT '/candidate',
    link_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oauth_login_tickets (
    ticket_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_oauth_accounts (
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('google', 'github')),
    provider_subject VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_email VARCHAR(255),
    provider_login VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider, provider_subject)
);
CREATE INDEX idx_user_oauth_accounts_user ON user_oauth_accounts(user_id);
CREATE INDEX idx_oauth_login_states_expiry ON oauth_login_states(expires_at);
CREATE INDEX idx_oauth_login_tickets_expiry ON oauth_login_tickets(expires_at);
