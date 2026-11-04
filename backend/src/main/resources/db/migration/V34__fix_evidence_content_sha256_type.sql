
-- Align evidence hash column type with Evidence.java.
-- Preserve existing evidence records.

ALTER TABLE evidences
    ALTER COLUMN content_sha256 TYPE VARCHAR(64)
    USING RTRIM(content_sha256)::VARCHAR(64);
