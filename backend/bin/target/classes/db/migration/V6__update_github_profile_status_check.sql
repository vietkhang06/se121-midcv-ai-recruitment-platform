-- ============================================================
-- V6__update_github_profile_status_check.sql
-- EXPAND GITHUB_PROFILES STATUS CHECK CONSTRAINT
-- ============================================================

ALTER TABLE github_profiles DROP CONSTRAINT IF EXISTS github_profiles_status_check;

ALTER TABLE github_profiles ADD CONSTRAINT github_profiles_status_check 
    CHECK (status IN ('SYNCED', 'SYNCING', 'FAILED', 'UNAVAILABLE', 'NOT_FOUND', 'PRIVATE_ONLY', 'RATE_LIMITED'));
