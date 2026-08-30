# 15. ĐẶC TẢ CƠ SỞ DỮ LIỆU VÀ PGVECTOR (DATABASE & VECTOR SPECIFICATION)

Tài liệu này cung cấp câu lệnh SQL DDL chính thức khởi tạo PostgreSQL CSDL, kích hoạt tiện ích `pgvector`, định nghĩa kiểu dữ liệu và cấu hình chỉ mục Vector (HNSW Indexing).

---

## 1. DDL KHỞI TẠO CSDL VÀ TIỆN ÍCH PGVECTOR

```sql
-- 1. Enable Extension UUID & Pgvector
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CANDIDATE', 'HR', 'ADMIN')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table: companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    size VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table: recruiter_profiles
CREATE TABLE recruiter_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table: jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    seniority VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    min_salary DECIMAL(12, 2),
    max_salary DECIMAL(12, 2),
    description TEXT NOT NULL,
    embedding_vector vector(1536), -- OpenAI text-embedding-3-small (1536 dim)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table: job_requirements
CREATE TABLE job_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('REQUIRED', 'PREFERRED')),
    min_years_exp INT DEFAULT 0
);

-- 7. Table: candidate_profiles
CREATE TABLE candidate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    headline VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Table: cvs
CREATE TABLE cvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_PARSING',
    raw_text TEXT,
    embedding_vector vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Table: candidate_skills
CREATE TABLE candidate_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    years_exp INT DEFAULT 0
);

-- 10. Table: applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    cv_id UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT idx_uniq_job_candidate UNIQUE (job_id, candidate_id)
);

-- 11. Table: match_results
CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    overall_score DECIMAL(5, 2) NOT NULL,
    skill_score DECIMAL(5, 2) NOT NULL,
    experience_score DECIMAL(5, 2) NOT NULL,
    education_score DECIMAL(5, 2) NOT NULL,
    semantic_score DECIMAL(5, 2) NOT NULL,
    ai_summary TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Table: evidences
CREATE TABLE evidences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
    criterion VARCHAR(100) NOT NULL,
    cv_quote_snippet TEXT NOT NULL,
    page_number INT,
    confidence_score DECIMAL(4, 3) DEFAULT 1.000
);
```

---

## 2. CHIẾN LƯỢC TẠO CHỈ MỤC (INDEXING STRATEGY & VECTOR SEARCH)

### 2.1 HNSW Index cho Vector Embeddings (Pgvector)
Sử dụng chỉ mục **HNSW (Hierarchical Navigable Small World)** với khoảng cách Cosine (`vector_cosine_ops`) giúp tăng tốc độ tìm kiếm vector gấp $100\times$ so với quét bảng thông thường.

```sql
-- Create HNSW Index on jobs embedding
CREATE INDEX idx_jobs_embedding_hnsw 
ON jobs USING hnsw (embedding_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create HNSW Index on CVs embedding
CREATE INDEX idx_cvs_embedding_hnsw 
ON cvs USING hnsw (embedding_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2.2 Relational B-Tree Indexes cho Truy vấn Nhanh
```sql
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_match_results_overall_score ON match_results(overall_score DESC);
```
