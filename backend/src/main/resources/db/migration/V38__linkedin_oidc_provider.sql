-- Extend provider allowlists without changing historical migration checksums.
ALTER TABLE oauth_login_states DROP CONSTRAINT oauth_login_states_provider_check;
ALTER TABLE oauth_login_states ADD CONSTRAINT oauth_login_states_provider_check CHECK (provider IN ('google','github','linkedin'));
ALTER TABLE user_oauth_accounts DROP CONSTRAINT user_oauth_accounts_provider_check;
ALTER TABLE user_oauth_accounts ADD CONSTRAINT user_oauth_accounts_provider_check CHECK (provider IN ('google','github','linkedin'));
ALTER TABLE oauth_pending_registrations DROP CONSTRAINT oauth_pending_registrations_provider_check;
ALTER TABLE oauth_pending_registrations ADD CONSTRAINT oauth_pending_registrations_provider_check CHECK (provider IN ('github','linkedin'));
