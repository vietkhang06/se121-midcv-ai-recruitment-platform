-- V14: Standardize account and company suspension states, suspension history, and appeals workflow

-- 1. Add account_status to users table with safe backfill and constraints
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED'));

-- Backfill based on existing is_active flag
UPDATE users SET account_status = 'SUSPENDED' WHERE is_active = FALSE;
UPDATE users SET account_status = 'ACTIVE' WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status, role);

-- 2. Create suspension_records table (structured audit trail for user & company suspensions)
CREATE TABLE IF NOT EXISTS suspension_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('USER', 'COMPANY')),
    target_id UUID NOT NULL,
    reason_code VARCHAR(100) NOT NULL DEFAULT 'POLICY_VIOLATION',
    reason_text TEXT NOT NULL,
    suspended_by UUID REFERENCES users(id) ON DELETE SET NULL,
    suspended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    lifted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    lifted_at TIMESTAMPTZ,
    resolution_note TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LIFTED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suspension_records_target ON suspension_records(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS idx_suspension_records_status ON suspension_records(status, created_at DESC);

-- 3. Create suspension_appeals table (formal appeal and review mechanism)
CREATE TABLE IF NOT EXISTS suspension_appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appellant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    suspension_id UUID REFERENCES suspension_records(id) ON DELETE SET NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('USER', 'COMPANY')),
    target_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
    evidence_attachment_id UUID,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suspension_appeals_target ON suspension_appeals(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_appellant ON suspension_appeals(appellant_user_id, status);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_status ON suspension_appeals(status, created_at DESC);
