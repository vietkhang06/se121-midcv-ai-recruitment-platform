-- ============================================================
-- V18__allow_github_analysis_processing_job_kind.sql
-- EXPAND PROCESSING_JOBS KIND CHECK TO SUPPORT GITHUB_ANALYSIS
-- ============================================================

ALTER TABLE processing_jobs DROP CONSTRAINT IF EXISTS processing_jobs_kind_check;

ALTER TABLE processing_jobs ADD CONSTRAINT processing_jobs_kind_check
    CHECK (kind IN ('EXTRACT', 'MATCH', 'SCREEN_MATCH', 'GITHUB_ANALYSIS'));

CREATE UNIQUE INDEX IF NOT EXISTS one_active_job
    ON processing_jobs(kind, entity_id)
    WHERE state IN ('QUEUED', 'RUNNING');
