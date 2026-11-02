-- DOCX has a valid 71-character MIME type; the original VARCHAR(50) rejects uploads.
-- Preserve the full MIME value used for downloads instead of truncating it.
ALTER TABLE cvs ALTER COLUMN file_type TYPE VARCHAR(255);
