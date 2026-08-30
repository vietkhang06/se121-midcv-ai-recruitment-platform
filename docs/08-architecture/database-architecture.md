# DATABASE & PGVECTOR ARCHITECTURE SPECIFICATION (REVISED)

Tài liệu này đặc tả Kiến trúc CSDL PostgreSQL 16 tích hợp `pgvector` cập nhật đầy đủ các trường lưu trữ cho Mô hình Tính điểm 3 Thành phần (`core_score`, `github_score`, `overall_score`) và các yếu tố minh chứng `match_factors`.

---

## 1. DDL BẢNG KẾT QUẢ MATCHING VÀ CÁC YẾU TỐ CHẤM ĐIỂM

```sql
-- Table: match_results (Updated with 3-Tier Scores & Fallback Flags)
CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    core_score DECIMAL(5, 2) NOT NULL,       -- S_core (JD-CV Score: 0 - 100%)
    github_score DECIMAL(5, 2),               -- S_github (GitHub Score: 0 - 100% or NULL if unavailable)
    overall_score DECIMAL(5, 2) NOT NULL,     -- S_overall (Final Match Score: 0 - 100%)
    core_weight DECIMAL(3, 2) DEFAULT 0.85,   -- w_core (0.85 or 1.0)
    github_weight DECIMAL(3, 2) DEFAULT 0.15, -- w_github (0.15 or 0.0)
    is_github_active BOOLEAN DEFAULT TRUE,    -- Active for technical jobs with valid GitHub
    github_fallback_applied BOOLEAN DEFAULT FALSE, -- True if Available-Data Fallback was triggered
    ai_summary TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: match_factors (Updated with Source Type & Evidence Reference)
CREATE TABLE match_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('CV', 'GITHUB', 'JD')),
    factor_type VARCHAR(100) NOT NULL,       -- E.g. REQUIRED_SKILL, EXP_YEARS, GH_LANG_MATCH, GH_ACTIVITY
    factor_name VARCHAR(255) NOT NULL,        -- E.g. "Java", "Spring Boot Repo", "Activity Signal HIGH"
    raw_value TEXT,                           -- E.g. "3 years", "Java 45%", "Updated 14 days ago"
    normalized_value DECIMAL(5, 2),           -- Score 0 - 100 for this specific factor
    weight DECIMAL(4, 3) NOT NULL,            -- Factor weight within its component
    score DECIMAL(5, 2) NOT NULL,             -- Calculated weighted score
    evidence_reference TEXT                   -- Snippet quote or Repository URL reference
);
```
