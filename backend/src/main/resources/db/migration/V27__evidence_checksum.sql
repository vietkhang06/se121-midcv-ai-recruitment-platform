ALTER TABLE cv_evidence_attachments ADD COLUMN sha256 CHAR(64);

COMMENT ON COLUMN cv_evidence_attachments.sha256 IS 'SHA-256 checksum of stored file bytes; NULL for legacy attachments until verified.';
