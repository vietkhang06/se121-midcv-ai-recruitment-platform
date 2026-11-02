-- M01: cache vectors by immutable confirmed version and exact professional source content.
ALTER TABLE embeddings ADD COLUMN source_sha256 CHAR(64);
ALTER TABLE embeddings DROP CONSTRAINT IF EXISTS embeddings_entity_type_check;
ALTER TABLE embeddings ADD CONSTRAINT embeddings_entity_type_check
    CHECK (entity_type IN ('JOB', 'CV', 'CV_VERSION', 'GITHUB'));
CREATE INDEX idx_embeddings_source_binding
    ON embeddings(entity_type, entity_id, model_name, source_sha256, status);
