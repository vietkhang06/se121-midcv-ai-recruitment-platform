-- ============================================================
-- V8__add_cv_version_status_and_confirmation.sql
-- PHASE 3: CV DRAFT, PROFILE CONFIRMATION & VERSIONING
-- ============================================================

ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT';
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Update existing versions to CONFIRMED if their parent CV is already PARSED/CONFIRMED
UPDATE cv_versions 
SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP 
WHERE status IS NULL OR status = 'DRAFT' AND EXISTS (
    SELECT 1 FROM cvs WHERE cvs.id = cv_versions.cv_id AND cvs.status = 'CONFIRMED'
);
