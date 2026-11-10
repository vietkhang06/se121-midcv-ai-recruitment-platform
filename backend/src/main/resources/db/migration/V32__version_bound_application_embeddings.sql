-- MID-01/MID-02: additive, rollback-safe. Existing 1536-dim legacy embeddings remain untouched.
-- document_versions.embedding VECTOR(1024) is the production similarity source (V7).
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS embedding_text TEXT;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS embedding_source_sha CHAR(64);
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_jd_version_id UUID;
ALTER TABLE applications ADD CONSTRAINT fk_applications_applied_jd_version
    FOREIGN KEY (applied_jd_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_applications_applied_jd_version ON applications(applied_jd_version_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_source_hash ON document_versions(document_id, source_sha);

ALTER TABLE processing_jobs DROP CONSTRAINT IF EXISTS processing_jobs_kind_check;
ALTER TABLE processing_jobs ADD CONSTRAINT processing_jobs_kind_check
    CHECK(kind IN ('EXTRACT', 'MATCH', 'SCREEN_MATCH', 'GITHUB_ANALYSIS', 'EMBED'));

ALTER TABLE match_results ADD COLUMN IF NOT EXISTS cv_version_id UUID;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS jd_version_id UUID;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS semantic_method VARCHAR(80);
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(200);
-- No backfill of vector provenance for historical rows: it cannot be verified retroactively.
