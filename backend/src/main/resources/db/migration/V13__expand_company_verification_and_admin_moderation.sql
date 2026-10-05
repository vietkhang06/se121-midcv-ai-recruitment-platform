-- V13: Expand company verification workflow, job moderation, reports, and admin audit logs

-- 1. Expand companies verification_status constraint and add review metadata
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_verification_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_verification_status_check
    CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'VERIFIED', 'REJECTED', 'SUSPENDED'));

ALTER TABLE companies ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS companies_verification_status_idx ON companies(verification_status, created_at DESC);

-- 2. Expand jobs status constraint to support SUSPENDED moderation state
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'SUSPENDED'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs(status, created_at DESC);

-- 3. System Reports table for moderation
CREATE TABLE IF NOT EXISTS system_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('JOB', 'COMPANY', 'CANDIDATE', 'RECRUITER')),
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_reports_status_idx ON system_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS system_reports_target_idx ON system_reports(target_type, target_id);

-- 4. Admin Audit Logs table (immutable record of all administrative mutations)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    reason TEXT,
    ip_address VARCHAR(100),
    correlation_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_idx ON admin_audit_logs(admin_id, created_at DESC);
