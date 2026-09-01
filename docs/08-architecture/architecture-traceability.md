# ARCHITECTURE TRACEABILITY MATRIX (PHASE 6 BASELINE)

Tài liệu này đặc tả Ma trận Truy xuất Kỹ thuật (Architecture Traceability Matrix) liên kết khép kín 100% giữa Requirement $\rightarrow$ Use Case $\rightarrow$ Domain Entity $\rightarrow$ Architecture Component $\rightarrow$ Database Table $\rightarrow$ REST API $\rightarrow$ UI Screen $\rightarrow$ Automated Test Case ID.

---

## MA TRẬN TRUY XUẤT CÁC TÍNH NĂNG HR PORTAL & AI CANDIDATE INSPECTION (PHASE 6 BASELINE TRACEABILITY)

| Req ID | Business Requirement | Use Case | Domain Entity | Architecture Component | DB Table | REST API Endpoint | UI Screen ID | Automated Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-HR-DASH`| HR Overview Dashboard & Thống kê bài tuyển dụng | `UC-HR-DASH` | `RecruiterProfile`, `Job` | HRDashboardPage | `recruiter_profiles`, `jobs` | `GET /api/v1/recruiter/dashboard` | `01 HR Dashboard (/recruiter)` | `Next.js Build Test` |
| `REQ-HR-GATE`| Company Verification Gate (Khóa Publish khi PENDING/REJECTED) | `UC-HR-GATE` | `Company` | CompanyVerificationBanner, CreateJobPage | `companies` | `POST /api/v1/jobs` | `02 Company (/recruiter/company)` | `CompanyVerificationRuleTest` |
| `REQ-HR-JOB` | Quản lý Bài tuyển dụng & Phân tách Kỹ năng Bắt buộc/Ưu tiên | `UC-HR-JOB` | `Job`, `JobRequirement` | RecruiterJobsListPage, CreateJobPage | `jobs`, `job_requirements` | `GET/POST /api/v1/recruiter/jobs` | `03 Jobs List (/recruiter/jobs)` | `Next.js Build Test` |
| `REQ-HR-APP` | Quản lý Đơn Ứng tuyển theo Bài đăng | `UC-HR-APP` | `Application`, `ApplicationCVSnapshot` | JobApplicationsPage | `applications`, `application_cv_snapshots` | `GET /api/v1/jobs/{id}/applications` | `04 Job Apps (/recruiter/jobs/[id]/applications)` | `Next.js Build Test` |
| `REQ-HR-RANK`| Bảng Xếp Hạng Ứng Viên AI Engine (Phase 4 Backend Sourced) | `UC-HR-RANK` | `CandidateRanking` | CandidateRankingTable, CandidateRankingPage | `match_results` | `GET /api/v1/jobs/{id}/ranking` | `05 Ranking (/recruiter/jobs/[id]/ranking)` | `CandidateRankingTest` |
| `REQ-HR-INSP`| Đánh giá Chi tiết Đối sánh Ứng viên 11 Mục | `UC-HR-INSP` | `MatchResult`, `MatchFactor` | ScoreBreakdownCard, CandidateInspectionPage | `match_results`, `match_factors` | `GET /api/v1/applications/{id}/match-inspection` | `06 Inspection (/recruiter/applications/[id])` | `ScoreReconstructionTest` |
| `REQ-HR-GH`  | Neutral GitHub Assessment & Fallback Ngành Phi kỹ thuật | `UC-HR-GH` | `GitHubAssessment` | GitHubAssessmentCard | `github_assessments` | `GET /api/v1/candidates/{id}/github-assessment` | `06 Inspection (/recruiter/applications/[id])` | `GitHubEntityPersistenceTest` |
| `REQ-HR-COMP`| Tool So Sánh Ứng Viên Song Song (Candidate Comparison) | `UC-HR-COMP` | `CandidateRanking` | CandidateCompareModal | `N/A` | `N/A` | `Compare Modal` | `Next.js Build Test` |
| `REQ-HR-SEC` | Bảo mật Phân quyền Recruiter Cross-Company Access Control (HTTP 403) | `UC-HR-SEC` | `RecruiterProfile` | ApplicationService, GlobalExceptionHandler | `recruiter_profiles` | `GET /api/v1/jobs/{id}/applications` | `All HR Screens` | `RecruiterSecurityOwnershipTest` |

---

## MA TRẬN TRUY XUẤT CÁC TÍNH NĂNG CANDIDATE EXPERIENCE & CV BUILDER (PHASE 5 BASELINE)

| Req ID | Business Requirement | Use Case | Domain Entity | Architecture Component | DB Table | REST API Endpoint | UI Screen ID | Automated Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-UI-VER` | Thống nhất phiên bản Next.js 16 (16.3.3) | `UC-UI-VER` | `N/A` | Next.js 16 Framework | `N/A` | `N/A` | `All Screens` | `npm run build` |
| `REQ-UI-DUP` | Khống chế Nộp trùng lặp phía Database & Backend (HTTP 409) | `UC-UI-DUP` | `Application` | ApplicationService | `applications (uk_candidate_job)` | `POST /api/v1/applications` | `Quick Apply Modal` | `ApplicationDuplicateProtectionTest` |
| `REQ-UI-ONB` | First Visit Onboarding (Tìm việc/Tìm ứng viên/Skip) & Khảo sát | `UC-UI-ONB` | `User` | FirstVisitModal | `users` | LocalState / Auth | `First Visit Modal` | `Next.js Build Test` |
| `REQ-UI-JOB` | Public Job Discovery & Chi tiết bài đăng công khai 100% | `UC-UI-JOB` | `Job` | JobFilter, JobCard, JobDetailPage | `jobs` | `GET /api/v1/jobs` | `01 Jobs Page (/jobs)` | `Next.js Build Test` |
| `REQ-UI-LIB` | Thư viện Multi-CV, Upload PDF/DOCX (AI Extraction & Review) | `UC-UI-LIB` | `CV` | CVCard, CVUploadModal | `cvs` | `GET/POST /api/v1/cvs` | `04 CV Library (/candidate/cvs)` | `Next.js Build Test` |
| `REQ-UI-BLD` | Industry-aware CV Template Recommendation & Live Preview | `UC-UI-BLD` | `CV` | CVBuilderPage | `cv_sections` | `POST /api/v1/cvs/builder` | `05 Builder (/candidate/cvs/builder)` | `Next.js Build Test` |
