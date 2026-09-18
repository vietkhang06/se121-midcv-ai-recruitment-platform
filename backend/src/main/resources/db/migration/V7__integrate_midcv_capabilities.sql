-- ============================================================
-- V7__integrate_midcv_capabilities.sql
-- GIAI ĐOẠN 1: CHUẨN HÓA CƠ SỞ DỮ LIỆU & VECTOR SCHEMA
-- 1. Dynamic AI Settings (Local Ollama & Cloud OpenAI)
-- 2. Processing Job Queue & Job Events (Asynchronous Pipeline with Lease Lock)
-- 3. Document Extraction Cache & GitHub Cache (6-hour cache)
-- 4. Skill & Terminology Taxonomy (4-Tier Normalization)
-- 5. Native Documents & Document Versions (with VECTOR(1024))
-- 6. Quick Screening Runs (Multi-CV Screening Workflow)
-- 7. MidCV Match Results (Detailed 3-Tier Line Evidence)
-- 8. Dual Vector Support (Vector 1024 for bge-m3 Local & Vector 1536 for OpenAI)
-- ============================================================

-- 1. Table: system_ai_settings (Admin & runtime AI configuration)
CREATE TABLE IF NOT EXISTS system_ai_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'current',
    provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL_OLLAMA',
    ollama_url VARCHAR(255) NOT NULL DEFAULT 'http://localhost:11434',
    ollama_model VARCHAR(120) NOT NULL DEFAULT 'dna5rm/granite4.2:3b-8k',
    cloud_base_url VARCHAR(255) NOT NULL DEFAULT 'https://api.openai.com/v1',
    cloud_api_key TEXT NOT NULL DEFAULT '',
    cloud_model VARCHAR(120) NOT NULL DEFAULT 'gpt-4o-mini',
    embedding_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL_OLLAMA',
    embedding_model VARCHAR(120) NOT NULL DEFAULT 'bge-m3',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system_ai_settings (id, provider, ollama_url, ollama_model, cloud_base_url, cloud_api_key, cloud_model, embedding_provider, embedding_model)
VALUES ('current', 'LOCAL_OLLAMA', 'http://localhost:11434', 'dna5rm/granite4.2:3b-8k', 'https://api.openai.com/v1', '', 'gpt-4o-mini', 'LOCAL_OLLAMA', 'bge-m3')
ON CONFLICT (id) DO NOTHING;

-- 2. Table: processing_jobs (Database-backed task queue with lease lock)
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(24) NOT NULL CHECK(kind IN ('EXTRACT', 'MATCH', 'SCREEN_MATCH')),
    entity_id UUID NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    step VARCHAR(60) NOT NULL DEFAULT 'QUEUED',
    progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
    attempts INTEGER NOT NULL DEFAULT 0,
    error_code VARCHAR(100),
    error_message VARCHAR(500),
    request_id VARCHAR(64) NOT NULL,
    locked_by UUID,
    lease_until TIMESTAMPTZ,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_job ON processing_jobs(kind, entity_id) WHERE state IN ('QUEUED', 'RUNNING');
CREATE INDEX IF NOT EXISTS processing_queue_idx ON processing_jobs(state, available_at);
CREATE INDEX IF NOT EXISTS processing_jobs_entity_kind_idx ON processing_jobs(entity_id, kind, created_at DESC);

-- 3. Table: job_events (Audit and pipeline progression trail)
CREATE TABLE IF NOT EXISTS job_events (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID REFERENCES processing_jobs(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_id VARCHAR(64) NOT NULL,
    level VARCHAR(8) NOT NULL CHECK(level IN ('INFO', 'WARN', 'ERROR')),
    step VARCHAR(60) NOT NULL,
    code VARCHAR(100) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    duration_ms BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_events_owner_idx ON job_events(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_events_job_idx ON job_events(job_id, id);

-- 4. Table: documents & document_versions (Native Document Versioning)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(8) NOT NULL CHECK (kind IN ('CV', 'JD')),
    title VARCHAR(200) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_id, kind);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL CHECK(version_no > 0),
    filename VARCHAR(255),
    storage_key VARCHAR(80),
    media_type VARCHAR(100),
    size_bytes BIGINT,
    source_sha CHAR(64) NOT NULL,
    raw_text TEXT,
    extraction_method VARCHAR(40),
    normalized JSONB,
    embedding VECTOR(1024),
    llm_model VARCHAR(200),
    embedding_model VARCHAR(200),
    pipeline_version VARCHAR(100),
    state VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED', 'PROCESSING', 'READY', 'FAILED')),
    error_code VARCHAR(100),
    error_message VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(document_id, version_no)
);

CREATE INDEX IF NOT EXISTS versions_document_idx ON document_versions(document_id, version_no DESC);

-- 5. Table: extraction_cache (Deduplicate document parsing & embedding)
CREATE TABLE IF NOT EXISTS extraction_cache (
    cache_key CHAR(64) PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized JSONB NOT NULL,
    embedding VECTOR(1024),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Table: github_cache (6-hour cache for external GitHub API calls)
CREATE TABLE IF NOT EXISTS github_cache (
    username VARCHAR(39) PRIMARY KEY,
    payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tables: taxonomy_skills & taxonomy_aliases
CREATE TABLE IF NOT EXISTS taxonomy_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name VARCHAR(120) NOT NULL UNIQUE,
    normalized_name VARCHAR(120) NOT NULL UNIQUE,
    category VARCHAR(60) NOT NULL,
    description TEXT,
    source VARCHAR(60) NOT NULL DEFAULT 'SYSTEM',
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taxonomy_skills_active_idx ON taxonomy_skills(active);
CREATE INDEX IF NOT EXISTS taxonomy_skills_category_idx ON taxonomy_skills(category);
CREATE INDEX IF NOT EXISTS taxonomy_skills_norm_idx ON taxonomy_skills(normalized_name);

CREATE TABLE IF NOT EXISTS taxonomy_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES taxonomy_skills(id) ON DELETE CASCADE,
    alias VARCHAR(120) NOT NULL UNIQUE,
    normalized_alias VARCHAR(120) NOT NULL,
    source VARCHAR(60) NOT NULL DEFAULT 'SYSTEM',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taxonomy_aliases_skill_id_idx ON taxonomy_aliases(skill_id);
CREATE INDEX IF NOT EXISTS taxonomy_aliases_active_norm_idx ON taxonomy_aliases(normalized_alias) WHERE active = true;

-- 8. Seed Initial Baseline Taxonomy Data
DO $$
DECLARE
    s_java UUID := uuid_generate_v4();
    s_spring UUID := uuid_generate_v4();
    s_python UUID := uuid_generate_v4();
    s_react UUID := uuid_generate_v4();
    s_postgres UUID := uuid_generate_v4();
    s_docker UUID := uuid_generate_v4();
    s_ts UUID := uuid_generate_v4();
BEGIN
    INSERT INTO taxonomy_skills (id, canonical_name, normalized_name, category, description)
    VALUES 
      (s_java, 'Java', 'java', 'BACKEND', 'Java programming language'),
      (s_spring, 'Spring Boot', 'springboot', 'BACKEND', 'Spring Boot framework for enterprise Java'),
      (s_python, 'Python', 'python', 'BACKEND', 'Python language for AI, data and web'),
      (s_react, 'React', 'react', 'FRONTEND', 'React JavaScript UI library'),
      (s_postgres, 'PostgreSQL', 'postgresql', 'DATABASE', 'PostgreSQL relational database'),
      (s_docker, 'Docker', 'docker', 'DEVOPS', 'Docker containerization engine'),
      (s_ts, 'TypeScript', 'typescript', 'FRONTEND', 'TypeScript typed JavaScript')
    ON CONFLICT (canonical_name) DO NOTHING;

    INSERT INTO taxonomy_aliases (skill_id, alias, normalized_alias)
    VALUES
      (s_java, 'Core Java', 'corejava'),
      (s_java, 'Java 21', 'java21'),
      (s_spring, 'SpringBoot', 'springboot'),
      (s_spring, 'Spring Framework', 'springframework'),
      (s_python, 'Python3', 'python3'),
      (s_react, 'ReactJS', 'reactjs'),
      (s_react, 'React.js', 'reactjs'),
      (s_postgres, 'Postgres', 'postgres'),
      (s_postgres, 'pgvector', 'pgvector'),
      (s_docker, 'Containerization', 'containerization'),
      (s_ts, 'TS', 'ts')
    ON CONFLICT (alias) DO NOTHING;
END $$;

-- 9. Table: screening_runs (Multi-CV fast comparison without fake candidate accounts)
CREATE TABLE IF NOT EXISTS screening_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    cv_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    jd_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    industry_snapshot VARCHAR(100) NOT NULL,
    github_enabled_snapshot BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS screening_job_idx ON screening_runs(job_id, created_at DESC);

-- 10. Table: midcv_match_results (3-Tier Match Result with Line Evidence)
CREATE TABLE IF NOT EXISTS midcv_match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    screening_id UUID REFERENCES screening_runs(id) ON DELETE CASCADE,
    processing_job_id UUID NOT NULL UNIQUE REFERENCES processing_jobs(id) ON DELETE CASCADE,
    base_score NUMERIC(5,2) NOT NULL,
    github_bonus NUMERIC(5,2) NOT NULL DEFAULT 0,
    score NUMERIC(5,2) NOT NULL CHECK(score BETWEEN 0 AND 100),
    coverage NUMERIC(5,2) NOT NULL,
    semantic_score NUMERIC(5,2) NOT NULL,
    details JSONB NOT NULL,
    github JSONB,
    algorithm_version VARCHAR(100) NOT NULL,
    cv_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    jd_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT one_match_target CHECK((application_id IS NOT NULL)::int + (screening_id IS NOT NULL)::int = 1)
);

CREATE INDEX IF NOT EXISTS midcv_match_app_idx ON midcv_match_results(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS midcv_match_screen_idx ON midcv_match_results(screening_id, created_at DESC);

-- 11. Dual Vector Dimension Support on Central Embeddings Table
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_vector_1024 vector(1024);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_1024_hnsw 
    ON embeddings USING hnsw (embedding_vector_1024 vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);
