-- ============================================================
-- V5__add_updated_at_to_email_verification_tokens.sql
-- ADD UPDATED_AT COLUMN TO EMAIL_VERIFICATION_TOKENS TABLE
-- ============================================================

ALTER TABLE email_verification_tokens
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
