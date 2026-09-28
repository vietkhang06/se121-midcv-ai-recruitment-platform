# MidCV API Contract Specification

Tài liệu này quy định hợp đồng giao tiếp API (API Contract) chính thức giữa các dịch vụ trong hệ thống **AI Recruitment Platform / MidCV**:
1. **Internal AI Worker APIs** (`http://ai-worker:8000/internal/ai/...`) - Giao tiếp nội bộ giữa Spring Boot Backend và FastAPI AI Worker.
2. **Public Candidate & Recruiter APIs** (`https://api.midcv.vn/api/v1/...`) - Giao tiếp giữa Next.js Frontend và Spring Boot Backend.

---

## 1. Internal AI Worker APIs (`/internal/ai/*`)

Các endpoint này chỉ phục vụ giao tiếp nội bộ giữa Backend và AI Worker, yêu cầu header bảo mật nội bộ `X-Internal-Token: <SECRET_TOKEN>`.

### 1.1. Extract Raw Text (Phase 1)
- **Endpoint**: `POST /internal/ai/cv/extract-text`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: File binary (PDF, DOCX, PNG, JPG).
- **Response**: `200 OK`
  ```json
  {
    "raw_text": "NGUYEN VAN A\nSoftware Engineer\n...",
    "extraction_method": "NATIVE_PDF | DOCX_PARSER | OCR_TESSERACT",
    "quality_metrics": {
      "char_count": 1420,
      "word_count": 235,
      "whitespace_ratio": 0.18,
      "printable_ratio": 0.98,
      "quality_flag": "PASSED"
    }
  }
  ```

### 1.2. Parse & Structure CV (Phase 2)
- **Endpoint**: `POST /internal/ai/cv/parse-cv`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "raw_text": "NGUYEN VAN A\nSoftware Engineer\n...",
    "source_file_name": "resume_nguyenvana.pdf"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "structured_by": "PRIMARY | OLLAMA_FALLBACK",
    "model_used": "qwen2.5-7b-instruct",
    "cv_data": {
      "personal_info": {
        "full_name": "Nguyen Van A",
        "email": "vana@example.com",
        "phone": "+84901234567",
        "location": "Ho Chi Minh City",
        "github_url": "https://github.com/nguyenvana",
        "linkedin_url": "https://linkedin.com/in/nguyenvana"
      },
      "professional_summary": "Software Engineer with 3 years of experience in Java Spring Boot...",
      "skills": ["Java", "Spring Boot", "PostgreSQL", "Docker"],
      "work_experience": [
        {
          "company": "Tech Corp",
          "position": "Backend Developer",
          "start_date": "2021-01",
          "end_date": "2023-12",
          "description": "Developed microservices using Spring Boot..."
        }
      ],
      "projects": [
        {
          "name": "E-Commerce System",
          "role": "Lead Backend",
          "description": "Built payment integration module..."
        }
      ],
      "education": [
        {
          "institution": "University of Technology",
          "degree": "Bachelor of Computer Science",
          "graduation_year": 2021
        }
      ],
      "certifications": ["AWS Certified Solutions Architect Associate"],
      "languages": ["Vietnamese", "English"]
    }
  }
  ```

### 1.3. Taxonomy Normalization (Phase 4)
- **Endpoint**: `POST /internal/ai/taxonomy/normalize-skills`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "skills": ["Spring Boot", "reactjs", "lập trình java", "k8s"]
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "normalized_skills": [
      {
        "raw_name": "Spring Boot",
        "canonical_id": "SKILL_JAVA_SPRING_BOOT",
        "canonical_name": "Spring Boot",
        "match_type": "EXACT",
        "confidence": 1.0
      },
      {
        "raw_name": "reactjs",
        "canonical_id": "SKILL_FRONTEND_REACT",
        "canonical_name": "React.js",
        "match_type": "ALIAS",
        "confidence": 0.98
      },
      {
        "raw_name": "lập trình java",
        "canonical_id": "SKILL_PROG_JAVA",
        "canonical_name": "Java",
        "match_type": "ALIAS",
        "confidence": 0.95
      },
      {
        "raw_name": "k8s",
        "canonical_id": "SKILL_DEVOPS_KUBERNETES",
        "canonical_name": "Kubernetes",
        "match_type": "ALIAS",
        "confidence": 0.95
      }
    ]
  }
  ```

### 1.4. Semantic Embedding Comparison (Phase 5)
- **Endpoint**: `POST /internal/ai/matching/semantic-compare`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "candidate_text_chunks": {
      "summary": "Software Engineer with 3 years...",
      "experience": "Tech Corp Backend Developer Spring Boot...",
      "projects": "E-Commerce System payment integration..."
    },
    "jd_text_chunks": {
      "overview": "We are seeking a Senior Java Backend Developer...",
      "requirements": "3+ years of Java, Spring Boot, Microservices...",
      "responsibilities": "Design and maintain high-throughput APIs..."
    }
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "similarity_scores": {
      "overall_similarity": 0.84,
      "experience_similarity": 0.88,
      "project_similarity": 0.81
    }
  }
  ```

### 1.5. LLM Score Explanation (Phase 6)
- **Endpoint**: `POST /internal/ai/matching/explain-score`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "overall_score": 82.5,
    "score_breakdown": {
      "required_skills_score": 85.0,
      "preferred_skills_score": 70.0,
      "experience_score": 90.0,
      "project_score": 80.0,
      "education_score": 100.0
    },
    "reason_codes": [
      "REQ_SKILLS_STRONG_ALIGNMENT",
      "EXPERIENCE_SENIORITY_MATCHED",
      "MISSING_PREFERRED_SKILL_KAFKA"
    ],
    "target_job_title": "Senior Java Developer"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "explanation_markdown": "Ứng viên đạt **82.5/100** điểm phù hợp cho vị trí **Senior Java Developer**.\n\n- **Điểm mạnh**: Kinh nghiệm làm việc thực tế với Java và Spring Boot hoàn toàn đáp ứng yêu cầu kỹ năng cốt lõi (85/100).\n- **Điểm cần cải thiện**: Hồ sơ chưa thể hiện kỹ năng Kafka - một trong các kỹ năng ưu tiên của dự án."
  }
  ```

---

## 2. Public Candidate & Recruiter APIs (`/api/v1/*`)

Các endpoint này yêu cầu xác thực JWT qua header `Authorization: Bearer <JWT_TOKEN>`. Phân quyền theo vai trò (`ROLE_CANDIDATE`, `ROLE_RECRUITER`, `ROLE_ADMIN`).

### 2.1. Candidate Profile Management

#### `POST /api/v1/candidate/cv/upload`
- **Role**: `CANDIDATE`
- **Description**: Upload file CV gốc, kích hoạt extraction & LLM structuring, tạo hồ sơ trạng thái `DRAFT`.
- **Request**: Multipart file (`file`).
- **Response**: `201 Created`
  ```json
  {
    "profile_id": "prof_987654",
    "status": "DRAFT",
    "original_cv_file_url": "/api/v1/files/cv/prof_987654.pdf",
    "created_at": "2026-09-28T12:00:00Z"
  }
  ```

#### `GET /api/v1/candidate/profile`
- **Role**: `CANDIDATE`
- **Description**: Lấy dữ liệu hồ sơ hiện tại kèm metadata data lineage cho từng trường.
- **Response**: `200 OK`
  ```json
  {
    "profile_id": "prof_987654",
    "status": "DRAFT | CONFIRMED",
    "personal_info": {
      "full_name": { "value": "Nguyen Van A", "origin": "CV_EXTRACTED" },
      "email": { "value": "vana@example.com", "origin": "CV_EXTRACTED" },
      "github_url": { "value": "https://github.com/nguyenvana", "origin": "USER_ADDED" }
    },
    "skills": [
      { "name": "Java", "canonical_id": "SKILL_PROG_JAVA", "origin": "CV_EXTRACTED", "verified": true },
      { "name": "Docker", "canonical_id": "SKILL_DEVOPS_DOCKER", "origin": "USER_ADDED", "verified": false }
    ],
    "work_experience": [
      {
        "id": "exp_1",
        "company": "Tech Corp",
        "position": "Backend Developer",
        "origin": "CV_EXTRACTED"
      }
    ],
    "projects": [],
    "education": [],
    "certifications": [],
    "languages": []
  }
  ```

#### `PUT /api/v1/candidate/profile`
- **Role**: `CANDIDATE`
- **Description**: Cập nhật thông tin hồ sơ (thêm/sửa/xóa thẻ lặp, kỹ năng). Các trường sửa đổi được tự động gắn nhãn `origin: USER_CONFIRMED` hoặc `USER_ADDED`.
- **Request Body**: Cấu trúc profile tương đương `GET /api/v1/candidate/profile`.
- **Response**: `200 OK`

#### `POST /api/v1/candidate/profile/confirm`
- **Role**: `CANDIDATE`
- **Description**: Ứng viên cam kết và xác nhận toàn bộ thông tin hồ sơ. Chuyển trạng thái hồ sơ sang `CONFIRMED`.
- **Response**: `200 OK`
  ```json
  {
    "profile_id": "prof_987654",
    "status": "CONFIRMED",
    "confirmed_at": "2026-09-28T12:15:00Z"
  }
  ```

---

### 2.2. Matching & Gap Analysis

#### `POST /api/v1/candidate/match/{jobId}`
- **Role**: `CANDIDATE`
- **Description**: Kích hoạt đối sánh ngữ nghĩa và tính điểm toán học giữa hồ sơ đã `CONFIRMED` của ứng viên và JD đích. (Báo lỗi `400 Bad Request` nếu hồ sơ đang ở trạng thái `DRAFT`).
- **Response**: `200 OK`
  ```json
  {
    "match_id": "match_112233",
    "job_id": "job_456",
    "match_score": 82.5,
    "score_breakdown": {
      "required_skills_score": 85.0,
      "preferred_skills_score": 70.0,
      "experience_score": 90.0,
      "project_score": 80.0,
      "education_score": 100.0
    },
    "reason_codes": [
      "REQ_SKILLS_STRONG_ALIGNMENT",
      "EXPERIENCE_SENIORITY_MATCHED"
    ],
    "explanation": "Ứng viên đạt 82.5/100 điểm...",
    "github_evidence": {
      "status": "VERIFIED",
      "confidence": "HIGH",
      "verified_skills": ["Java", "Spring Boot"]
    }
  }
  ```

#### `GET /api/v1/candidate/match/{jobId}/gap-analysis`
- **Role**: `CANDIDATE`
- **Description**: Trả về ma trận khoảng cách kỹ năng (5 nhóm) và lộ trình gợi ý phát triển kỹ năng cho JD này.
- **Response**: `200 OK`
  ```json
  {
    "job_id": "job_456",
    "gap_matrix": {
      "met_skills": ["Java", "Spring Boot", "PostgreSQL"],
      "missing_mandatory_skills": ["Docker"],
      "missing_preferred_skills": ["Kafka", "Redis"],
      "related_skills_to_learn": ["Kubernetes", "gRPC"],
      "evidence_missing_skills": ["AWS"]
    },
    "learning_roadmap": {
      "estimated_weeks": 6,
      "milestones": [
        {
          "week": "1-2",
          "focus": "Containerization & Docker",
          "tasks": ["Học Dockerfile, Docker Compose", "Đóng gói ứng dụng Spring Boot hiện tại"]
        },
        {
          "week": "3-4",
          "focus": "Message Queue với Apache Kafka",
          "tasks": ["Tích hợp Spring Cloud Stream với Kafka"]
        }
      ]
    }
  }
  ```

---

### 2.3. Recruiter Review & Decision

#### `GET /api/v1/recruiter/jobs/{jobId}/applications`
- **Role**: `RECRUITER`
- **Description**: Lấy danh sách ứng viên đã nộp/được đối sánh cho JD, xếp hạng theo `match_score` tất định giảm dần.
- **Response**: `200 OK`
  ```json
  {
    "job_id": "job_456",
    "total_applicants": 25,
    "applications": [
      {
        "application_id": "app_001",
        "candidate_id": "cand_123",
        "candidate_name": "Nguyen Van A",
        "match_score": 82.5,
        "github_confidence": "HIGH",
        "status": "APPLIED | SHORTLISTED | INTERVIEW_SCHEDULED | REJECTED",
        "created_at": "2026-09-28T12:20:00Z"
      }
    ]
  }
  ```

#### `GET /api/v1/recruiter/applications/{id}/audit`
- **Role**: `RECRUITER`
- **Description**: Xem toàn bộ bằng chứng kiểm toán (Audit Trail) của một đơn ứng tuyển: CV gốc, dữ liệu trích xuất, chỉnh sửa của người dùng, bằng chứng GitHub, bảng điểm và lý do.
- **Response**: `200 OK`

#### `POST /api/v1/recruiter/applications/{id}/decision`
- **Role**: `RECRUITER`
- **Description**: Nhà tuyển dụng đưa ra quyết định cuối cùng (Human Decision).
- **Request Body**:
  ```json
  {
    "decision": "SHORTLIST | INTERVIEW_SCHEDULE | REJECT",
    "notes": "Ứng viên có kỹ năng Spring Boot vững, GitHub repo minh chứng rõ ràng.",
    "interview_date": "2026-10-05T09:00:00Z"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "application_id": "app_001",
    "new_status": "INTERVIEW_SCHEDULED",
    "decided_by": "recruiter_456",
    "decided_at": "2026-09-28T12:30:00Z"
  }
  ```
