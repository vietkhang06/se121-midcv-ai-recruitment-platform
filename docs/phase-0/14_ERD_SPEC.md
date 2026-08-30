# 14. ĐẶC TẢ SƠ ĐỒ THỰC THỂ LIÊN KẾT (ERD SPECIFICATION)

Tài liệu này đặc tả chi tiết Sơ đồ Thực thể Liên kết (ERD) với đầy đủ Khóa chính (PK), Khóa ngoại (FK), Quan hệ (Cardinality), Ràng buộc (Constraints), Nullability, Unique Keys và Indexing strategy.

---

## 1. SƠ ĐỒ ERD TỔNG QUAN (MERMAID ERD DIAGRAM)

```mermaid
erDiagram
    users ||--o{ roles : "has role"
    users ||--o| candidate_profiles : "has profile"
    users ||--o| recruiter_profiles : "has profile"
    companies ||--o{ recruiter_profiles : "employs"
    companies ||--o{ jobs : "owns"
    
    jobs ||--o{ job_requirements : "requires"
    
    candidate_profiles ||--o{ cvs : "owns"
    candidate_profiles ||--o{ candidate_skills : "possesses"
    candidate_profiles ||--o{ experiences : "has"
    candidate_profiles ||--o{ educations : "has"
    candidate_profiles ||--o{ projects : "built"
    
    cvs ||--o{ cv_sections : "contains"
    
    jobs ||--o{ applications : "receives"
    candidate_profiles ||--o{ applications : "submits"
    cvs ||--o{ applications : "used_in"
    
    applications ||--o| match_results : "evaluated_by"
    match_results ||--o{ match_factors : "broken_down_into"
    match_results ||--o{ evidences : "justified_by"

    users {
        uuid id PK
        string email UK
        string password_hash
        string role
        boolean is_active
        timestamp created_at
    }

    companies {
        uuid id PK
        string name
        string website
        string size
        text description
        timestamp created_at
    }

    jobs {
        uuid id PK
        uuid company_id FK
        string title
        string seniority
        string status
        decimal min_salary
        decimal max_salary
        text description
        vector embedding_vector
        timestamp created_at
    }

    job_requirements {
        uuid id PK
        uuid job_id FK
        string skill_name
        string requirement_type
        integer min_years_exp
    }

    candidate_profiles {
        uuid id PK
        uuid user_id FK, UK
        string full_name
        string phone
        string headline
        text bio
        timestamp created_at
    }

    cvs {
        uuid id PK
        uuid candidate_id FK
        string file_name
        string file_path
        string file_type
        integer file_size
        string status
        text raw_text
        vector embedding_vector
        timestamp created_at
    }

    cv_sections {
        uuid id PK
        uuid cv_id FK
        string section_type
        text content
    }

    candidate_skills {
        uuid id PK
        uuid candidate_id FK
        string skill_name
        string normalized_name
        integer years_exp
    }

    experiences {
        uuid id PK
        uuid candidate_id FK
        string company_name
        string position
        date start_date
        date end_date
        text description
    }

    educations {
        uuid id PK
        uuid candidate_id FK
        string institution
        string degree
        string field_of_study
        integer start_year
        integer end_year
    }

    projects {
        uuid id PK
        uuid candidate_id FK
        string name
        string role
        text description
        string tech_stack
    }

    applications {
        uuid id PK
        uuid job_id FK
        uuid candidate_id FK
        uuid cv_id FK
        string status
        timestamp applied_at
    }

    match_results {
        uuid id PK
        uuid application_id FK, UK
        decimal overall_score
        decimal skill_score
        decimal experience_score
        decimal education_score
        decimal semantic_score
        text ai_summary
        timestamp calculated_at
    }

    match_factors {
        uuid id PK
        uuid match_result_id FK
        string category
        string factor_name
        string status
        decimal weight
        decimal score
    }

    evidences {
        uuid id PK
        uuid match_result_id FK
        string criterion
        text cv_quote_snippet
        integer page_number
        decimal confidence_score
    }
```

---

## 2. RÀNG BUỘC VÀ QUY TẮC DỮ LIỆU (CONSTRAINTS & KEYS)

### 2.1 Unique Constraints
* `users(email)`: Đảm bảo không trùng lặp tài khoản.
* `candidate_profiles(user_id)`: Quan hệ 1-1 giữa User và Candidate Profile.
* `applications(job_id, candidate_id)`: Một ứng viên chỉ được nộp đơn 1 lần duy nhất cho mỗi bài tuyển dụng (`UNIQUE INDEX idx_uniq_app`).
* `match_results(application_id)`: Quan hệ 1-1 giữa Application và MatchResult.

### 2.2 Foreign Key Rules (ON DELETE Policy)
* `applications` $\rightarrow$ `jobs`: `ON DELETE CASCADE`.
* `cvs` $\rightarrow$ `candidate_profiles`: `ON DELETE CASCADE`.
* `match_results` $\rightarrow$ `applications`: `ON DELETE CASCADE`.
* `match_factors`, `evidences` $\rightarrow$ `match_results`: `ON DELETE CASCADE`.
