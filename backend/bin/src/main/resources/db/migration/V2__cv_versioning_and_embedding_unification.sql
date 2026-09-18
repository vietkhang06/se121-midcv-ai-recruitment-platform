-- ============================================================
-- V2__cv_versioning_and_embedding_unification.sql
-- INCREMENTAL MIGRATION: CV VERSION SECTIONS & EMBEDDING UNIFICATION
-- ============================================================

-- 1. Refine CVSection Relationship: CVSection belongs to CVVersion
ALTER TABLE cv_sections ADD COLUMN cv_version_id UUID REFERENCES cv_versions(id) ON DELETE CASCADE;
ALTER TABLE cv_sections DROP COLUMN IF EXISTS cv_id;

-- 2. Refine Application: Track exact Applied CV Version
ALTER TABLE applications ADD COLUMN applied_cv_version_id UUID REFERENCES cv_versions(id) ON DELETE SET NULL;

-- 3. Consolidate Centralized Embedding Persistence (Remove duplicate vector columns)
ALTER TABLE cvs DROP COLUMN IF EXISTS embedding_vector;
ALTER TABLE cvs DROP COLUMN IF EXISTS embedding_version;

ALTER TABLE jobs DROP COLUMN IF EXISTS embedding_vector;

-- 4. Authoritative HNSW Index on Centralized Embeddings Table
DROP INDEX IF EXISTS idx_jobs_embedding_hnsw;
DROP INDEX IF EXISTS idx_cvs_embedding_hnsw;

CREATE INDEX IF NOT EXISTS idx_embeddings_vector_hnsw ON embeddings USING hnsw (embedding_vector vector_cosine_ops) WITH (m = 16, ef_construction = 64);
