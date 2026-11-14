ALTER TABLE companies
    ADD COLUMN recruiter_plan VARCHAR(20) NOT NULL DEFAULT 'STANDARD'
        CHECK (recruiter_plan IN ('STANDARD', 'PRO')),
    ADD COLUMN recruiter_pro_until TIMESTAMPTZ;

ALTER TABLE jobs
    ADD COLUMN ai_screening_policy_version INTEGER,
    ADD COLUMN ai_screening_package_code VARCHAR(40);

-- Jobs created before this release keep the matching behavior that existed when
-- candidates applied. New jobs are explicitly enrolled by JobService and must
-- use a supported professional occupation from the curated catalog.

ALTER TABLE recruiter_service_packages
    ADD COLUMN pro_access BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE recruiter_service_packages
SET pro_access = TRUE
WHERE code IN ('MID_ECO_PLUS', 'MID_MAX');

CREATE INDEX idx_recruiter_plan_expiry
    ON companies(recruiter_plan, recruiter_pro_until);
