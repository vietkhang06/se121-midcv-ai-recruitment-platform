-- V16: Separate company verification status and operational status

-- 1. Add operational_status to companies table with safe default
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operational_status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL;

-- 2. Add check constraint for operational_status
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_operational_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_operational_status_check
    CHECK (operational_status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED'));

-- 3. Backfill operational_status from legacy verification_status if any company was marked SUSPENDED
UPDATE companies 
SET operational_status = 'SUSPENDED',
    verification_status = 'VERIFIED'
WHERE verification_status = 'SUSPENDED';

-- 4. Update check constraint for verification_status to remove SUSPENDED and keep clean verification domain
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_verification_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_verification_status_check
    CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'VERIFIED', 'REJECTED'));

-- 5. Create index for operational and verification status
CREATE INDEX IF NOT EXISTS idx_companies_operational_verification 
    ON companies(operational_status, verification_status);

-- 6. Add previous_status to suspension_records for audit trail of restored status
ALTER TABLE suspension_records ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50);
