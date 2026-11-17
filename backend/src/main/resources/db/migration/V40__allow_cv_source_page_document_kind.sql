ALTER TABLE documents
    ALTER COLUMN kind TYPE VARCHAR(32);

ALTER TABLE documents
    DROP CONSTRAINT documents_kind_check;

ALTER TABLE documents
    ADD CONSTRAINT documents_kind_check
    CHECK (kind IN ('CV', 'JD', 'CV_SOURCE_PAGE'));