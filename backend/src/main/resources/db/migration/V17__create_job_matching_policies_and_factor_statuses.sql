-- V17: Create Job Matching Policies table and add policy versioning to match_results

CREATE TABLE IF NOT EXISTS job_matching_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    skill_required_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.3200,
    skill_preferred_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.0800,
    experience_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.2500,
    education_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.1000,
    project_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.1000,
    semantic_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.1500,
    core_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.8500,
    github_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.1500,
    is_github_active BOOLEAN NOT NULL DEFAULT TRUE,
    policy_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_core_weights_sum CHECK (
        ABS((skill_required_weight + skill_preferred_weight + experience_weight + education_weight + project_weight + semantic_weight) - 1.0000) <= 0.005
    ),
    CONSTRAINT chk_overall_weights_sum CHECK (
        ABS((core_weight + github_weight) - 1.0000) <= 0.005
    )
);

CREATE INDEX IF NOT EXISTS idx_job_matching_policies_job_id ON job_matching_policies(job_id);

-- Add policy tracking to match_results
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS policy_version INT DEFAULT 1;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS policy_snapshot TEXT;
