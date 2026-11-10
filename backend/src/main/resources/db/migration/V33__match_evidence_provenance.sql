-- MID-04: additive provenance columns; historical rows remain as-is (unknown evidence is not verified).
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS source_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL;
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS content_sha256 CHAR(64);
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS quote_start_offset INTEGER;
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS quote_end_offset INTEGER;
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS provenance VARCHAR(80);
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS policy_version INTEGER;
CREATE INDEX IF NOT EXISTS idx_evidences_source_version ON evidences(source_version_id);
-- Allows the inspected quote span to be reconstructed without guesswork.
ALTER TABLE evidences ADD CONSTRAINT ck_evidence_quote_offsets
    CHECK (quote_start_offset IS NULL OR (quote_start_offset >= 0 AND quote_end_offset > quote_start_offset));
COMMENT ON COLUMN evidences.content_sha256 IS 'Hash of the exact reviewed CV text from which the quote offsets were verified; NULL means unverified provenance.';
