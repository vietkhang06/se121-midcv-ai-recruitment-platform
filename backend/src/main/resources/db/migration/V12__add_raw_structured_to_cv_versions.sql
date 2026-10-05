-- ============================================================
-- V12__add_raw_structured_to_cv_versions.sql
-- Separate raw extracted structured JSON from editable draft content
-- ============================================================

ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS raw_structured_content TEXT;

-- Backfill raw_structured_content from document_versions.normalized where available
UPDATE cv_versions cv
SET raw_structured_content = dv.normalized::text
FROM document_versions dv
WHERE cv.cv_id = dv.document_id
  AND cv.raw_structured_content IS NULL
  AND dv.normalized IS NOT NULL;
