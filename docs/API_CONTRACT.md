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
- **Description**: Upload file CV gốc, kích hoạt extraction & LLM structuring, tạo hồ sơ trạng thái `DRAFT`. File CV gốc là artifact đầu vào bất biến phục vụ truy vết và kiểm toán. Việc người dùng chỉnh structured profile không được ghi đè file gốc.
- **Request**: Multipart file (`file`).
- **Response**: `201 Created`
  ```json
  {
    "cv_id": "cv_987654",
    "profile_id": "prof_987654",
    "status": "DRAFT",
    "original_cv_file_url": "/api/v1/files/cv/cv_987654.pdf",
    "created_at": "2026-09-28T12:00:00Z"
  }
  ```

#### `GET /api/v1/candidate/cvs/{id}/draft`
- **Role**: `CANDIDATE`
- **Description**: Lấy dữ liệu bản nháp CV (DRAFT) để ứng viên review và chỉnh sửa. Khởi tạo từ extraction snapshot (AI structured JSON) và bảo toàn tính bất biến của file gốc và raw text.
- **Response**: `200 OK`
  ```json
  {
    "cv_id": "cv_987654",
    "profile_id": "prof_987654",
    "version_id": "ver_123456",
    "version_number": 1,
    "title": "Resume Nguyen Van A v1.0",
    "status": "DRAFT",
    "confirmed_at": null,
    "personal_info": {
      "full_name": { "value": "Nguyen Van A", "origin": "CV_EXTRACTED" },
      "email": { "value": "vana@example.com", "origin": "CV_EXTRACTED" },
      "phone": { "value": "0901234567", "origin": "CV_EXTRACTED" },
      "location": { "value": "Ho Chi Minh City", "origin": "CV_EXTRACTED" },
      "headline": { "value": "Backend Engineer", "origin": "CV_EXTRACTED" },
      "github_url": { "value": "https://github.com/nguyenvana", "origin": "CV_EXTRACTED" },
      "linkedin_url": { "value": "https://linkedin.com/in/nguyenvana", "origin": "CV_EXTRACTED" },
      "portfolio_url": { "value": null, "origin": "USER_ADDED" }
    },
    "summary": {
      "summary": { "value": "<p>Software Engineer with 3+ years experience in <strong>Java</strong>.</p>", "origin": "CV_EXTRACTED" }
    },
    "skills": [
      { "name": "Java", "canonical_id": "SKILL_JAVA", "category": "BACKEND", "is_custom": false, "origin": "CV_EXTRACTED", "verified": true }
    ],
    "work_experience": [
      {
        "id": "exp_1",
        "company": "Tech Corp",
        "position": "Backend Developer",
        "start_date": "2021-01",
        "end_date": "2023-12",
        "is_current": false,
        "description": "<p>Developed microservices using <strong>Spring Boot</strong>.</p>",
        "technologies": ["Java", "Spring Boot"],
        "origin": "CV_EXTRACTED"
      }
    ],
    "projects": [
      {
        "id": "proj_1",
        "name": "E-Commerce System",
        "role": "Lead Backend",
        "description": "<p>Architected order processing module.</p>",
        "project_url": "https://github.com/nguyenvana/ecommerce",
        "tech_stack": ["Java", "PostgreSQL"],
        "origin": "CV_EXTRACTED"
      }
    ],
    "education": [
      {
        "id": "edu_1",
        "institution": "University of Technology",
        "degree": "Bachelor of Computer Science",
        "field_of_study": "Software Engineering",
        "start_year": 2017,
        "end_year": 2021,
        "gpa": 8.3,
        "gpa_scale": 10.0,
        "gpa_display": "8.3/10",
        "description": "",
        "origin": "CV_EXTRACTED"
      }
    ],
    "certifications": [
      {
        "id": "cert_1",
        "name": "AWS Certified Solutions Architect",
        "issuer": "Amazon Web Services",
        "issue_date": "2022-05",
        "expiry_date": "2025-05",
        "credential_id": "AWS-123456",
        "credential_url": "https://aws.amazon.com/verify",
        "attachment": {
          "id": "att_111",
          "file_name": "aws_cert.pdf",
          "file_size": 245100,
          "file_type": "application/pdf",
          "status": "UNVERIFIED"
        },
        "origin": "CV_EXTRACTED"
      }
    ],
    "languages": [
      {
        "id": "lang_1",
        "language": "English",
        "proficiency": "Professional Working (IELTS 7.5)",
        "score": "7.5",
        "attachment": null,
        "origin": "CV_EXTRACTED"
      }
    ],
    "links": {
      "github_url": "https://github.com/nguyenvana",
      "linkedin_url": "https://linkedin.com/in/nguyenvana"
    }
  }
  ```

#### `PUT /api/v1/candidate/cvs/{id}/draft`
- **Role**: `CANDIDATE`
- **Description**: Lưu bản nháp đã chỉnh sửa của CV. Cho phép thêm, sửa, xóa các card lặp, chip kỹ năng, định dạng rich text, thông tin GPA. Không làm thay đổi file CV gốc hay raw text snapshot.
- **Request Body**: Tương đương cấu trúc của `CVDraftResponse`.
- **Response**: `200 OK` (trả về `CVDraftResponse` đã cập nhật).

#### `POST /api/v1/candidate/cvs/{cvId}/confirm`
- **Role**: `CANDIDATE`
- **Description**: Ứng viên cam kết và xác nhận toàn bộ thông tin hồ sơ cho CV cụ thể (`cvId`). Chuyển trạng thái hồ sơ sang `CONFIRMED`. Dữ liệu xác nhận này trở thành Confirmed Profile chính thức phục vụ đối sánh JD–CV.
- **Response**: `200 OK`
  ```json
  {
    "cv_id": "cv_987654",
    "profile_id": "prof_987654",
    "status": "CONFIRMED",
    "confirmed_at": "2026-09-28T12:15:00Z"
  }
  ```

#### `GET /api/v1/taxonomy/skills/search`
- **Role**: `CANDIDATE | RECRUITER | PUBLIC`
- **Description**: Tìm kiếm kỹ năng chuẩn từ từ điển Taxonomy thật trong database phục vụ autocomplete (debounce 250-350ms).
- **Query Params**: `query` (chuỗi tìm kiếm), `limit` (mặc định 10, tối đa 30).
- **Response**: `200 OK`
  ```json
  {
    "query": "jav",
    "total": 2,
    "skills": [
      {
        "id": "s_java",
        "canonical_name": "Java",
        "normalized_name": "java",
        "category": "BACKEND",
        "description": "Java programming language",
        "is_custom": false
      },
      {
        "id": "s_javascript",
        "canonical_name": "JavaScript",
        "normalized_name": "javascript",
        "category": "FRONTEND",
        "description": "JavaScript language",
        "is_custom": false
      }
    ]
  }
  ```

#### `POST /api/v1/candidate/cvs/{cvId}/attachments`
- **Role**: `CANDIDATE`
- **Description**: Tải lên tài liệu minh chứng (PDF, PNG, JPG/JPEG <= 10MB) đính kèm cho từng chứng chỉ hoặc ngoại ngữ. Trạng thái minh chứng mặc định là `UPLOADED / UNVERIFIED`.
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file`: MultipartFile
  - `itemType`: `CERTIFICATION | LANGUAGE`
  - `itemId`: ID của chứng chỉ hoặc ngoại ngữ trong bản nháp (ví dụ: `cert_1`, `lang_1`)
- **Response**: `201 Created`
  ```json
  {
    "attachment_id": "att_111",
    "item_type": "CERTIFICATION",
    "item_id": "cert_1",
    "file_name": "aws_certificate.pdf",
    "file_size": 245100,
    "file_type": "application/pdf",
    "status": "UNVERIFIED",
    "preview_url": "/api/v1/candidate/cvs/cv_987654/attachments/att_111",
    "created_at": "2026-10-01T12:00:00Z"
  }
  ```

#### `GET /api/v1/candidate/cvs/{cvId}/attachments/{attachmentId}`
- **Role**: `CANDIDATE | RECRUITER`
- **Description**: Xem nhanh (preview ảnh / inline PDF) hoặc tải xuống file minh chứng đính kèm. Yêu cầu kiểm tra quyền sở hữu candidate ownership.
- **Response**: `200 OK` (Binary stream kèm `Content-Type`, `Content-Disposition: inline`).

#### `DELETE /api/v1/candidate/cvs/{cvId}/attachments/{attachmentId}`
- **Role**: `CANDIDATE`
- **Description**: Xóa file minh chứng đính kèm khi hồ sơ còn ở trạng thái DRAFT.
- **Response**: `200 OK`

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
