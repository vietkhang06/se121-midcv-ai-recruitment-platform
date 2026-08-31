-- V3: Add Unique Constraint to prevent duplicate candidate applications for the same job
-- Requirement: UNIQUE(candidate_id, job_id)

ALTER TABLE applications
ADD CONSTRAINT uk_candidate_job UNIQUE (candidate_id, job_id);
