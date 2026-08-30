# 24. MA TRẬN TRUY XUẤT YÊU CẦU (REQUIREMENT TRACEABILITY MATRIX - RTM)

Tài liệu này xác lập ma trận liên kết khép kín 100% giữa Functional Requirements $\rightarrow$ Use Cases $\rightarrow$ REST APIs $\rightarrow$ UI Screens $\rightarrow$ ERD Tables $\rightarrow$ Test Cases.

---

## MA TRẬN TRUY XUẤT CHI TIẾT (FULL TRACEABILITY MATRIX)

| Requirement ID | Requirement Name | Use Case ID | API Endpoint | UI Screen ID | DB Tables | Test Case ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FR-AUTH-001` | Đăng ký Tài khoản | `UC-01` | `POST /auth/register` | `05 Register` | `users`, `candidate_profiles`, `recruiter_profiles` | `TC-AUTH-001` |
| `FR-AUTH-002` | Đăng nhập & JWT Auth | `UC-02` | `POST /auth/login` | `04 Login` | `users` | `TC-AUTH-002` |
| `FR-CAND-001` | Quản lý Profile Candidate | `UC-03` | `GET /candidates/profile` | `06 Profile` | `candidate_profiles` | `TC-CAND-001` |
| `FR-CV-001` | Upload & Storage File CV | `UC-04` | `POST /candidates/cv` | `07 CV Upload` | `cvs`, `cv_sections` | `TC-CV-001` |
| `FR-JOB-001` | Tạo & Đăng Bài Tuyển dụng | `UC-08`, `UC-10`| `POST /jobs` | `11 Create Job` | `jobs`, `job_requirements`, `companies` | `TC-JOB-001` |
| `FR-APP-001` | Nộp đơn Ứng tuyển | `UC-07` | `POST /jobs/{id}/applications` | `03 Job Detail` | `applications` | `TC-APP-001` |
| `FR-AI-001` | AI Document Text Parsing | `UC-04`, `UC-08`| N/A (Internal Worker) | N/A (Background) | `candidate_skills`, `experiences`, `cvs` | `TC-AI-001` |
| `FR-MATCH-001`| AI Hybrid Matching Engine | `UC-13` | `POST /jobs/{id}/matching` | N/A (Background) | `match_results`, `match_factors` | `TC-MATCH-001`|
| `FR-RANK-001` | Candidate Ranking List | `UC-14` | `GET /jobs/{id}/ranking` | `13 Candidate Ranking` | `match_results`, `applications` | `TC-RANK-001` |
| `FR-EXPLAIN-001`| Xem Minh chứng AI Explanation| `UC-15` | `GET /applications/{id}/match-result`| `15 AI Explanation` | `match_results`, `evidences` | `TC-EXPLAIN-001`|
