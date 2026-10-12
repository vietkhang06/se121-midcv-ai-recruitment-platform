-- ============================================================
-- V19__add_account_plan_to_users.sql
-- ADD ACCOUNT_PLAN TO USERS WITH STANDARD AS DEFAULT
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_plan VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_plan_check;

ALTER TABLE users ADD CONSTRAINT users_account_plan_check
    CHECK (account_plan IN ('STANDARD', 'PRO'));
