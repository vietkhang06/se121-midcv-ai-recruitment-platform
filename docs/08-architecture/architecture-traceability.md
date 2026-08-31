# ARCHITECTURE TRACEABILITY MATRIX (PHASE 5 FINAL CORRECTION BASELINE)

Tài liệu này đặc tả Ma trận Truy xuất Kỹ thuật (Architecture Traceability Matrix) liên kết khép kín 100% giữa Requirement $\rightarrow$ Use Case $\rightarrow$ Domain Entity $\rightarrow$ Architecture Component $\rightarrow$ Database Table $\rightarrow$ REST API $\rightarrow$ UI Screen $\rightarrow$ Automated Test Case ID.

---

## MA TRẬN TRUY XUẤT CÁC TÍNH NĂNG FRONTEND CANDIDATE EXPERIENCE & CV BUILDER (PHASE 5 FINAL CORRECTION BASELINE)

| Req ID | Business Requirement | Use Case | Domain Entity | Architecture Component | DB Table | REST API Endpoint | UI Screen ID | Automated Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-UI-VER` | Thống nhất phiên bản Next.js 16 (16.3.3) trên toàn hệ thống | `UC-UI-VER` | `N/A` | Next.js 16 Framework | `N/A` | `N/A` | `All Screens` | `npm run build` |
| `REQ-UI-DUP` | Khống chế Nộp trùng lặp phía Database & Backend (HTTP 409) | `UC-UI-DUP` | `Application` | ApplicationService, GlobalExceptionHandler | `applications (uk_candidate_job)` | `POST /api/v1/applications` | `Quick Apply Modal` | `ApplicationDuplicateProtectionTest` |
| `REQ-UI-ONB` | First Visit Onboarding (Tìm việc/Tìm ứng viên/Skip) & Khảo sát | `UC-UI-ONB` | `User` | FirstVisitModal | `users` | LocalState / Auth | `First Visit Modal` | `Next.js Build Test` |
| `REQ-UI-JOB` | Public Job Discovery & Chi tiết bài đăng công khai 100% | `UC-UI-JOB` | `Job`, `JobRequirement` | JobFilter, JobCard, JobDetailPage | `jobs`, `job_requirements` | `GET /api/v1/jobs` | `01 Jobs Page (/jobs)` | `Next.js Build Test` |
| `REQ-UI-AUTH`| Auth Gate Modal (Đăng nhập & Đăng ký prefill dữ liệu) | `UC-UI-AUTH` | `User` | AuthModal | `users` | `POST /api/v1/auth/login` | `Auth Gate Modal` | `Next.js Build Test` |
| `REQ-UI-PROF`| Quản lý Hồ sơ cá nhân Ứng viên Đa ngành | `UC-UI-PROF` | `CandidateProfile` | CandidateProfilePage | `candidate_profiles` | `GET/PUT /api/v1/candidates/profile` | `03 Profile (/candidate/profile)` | `Next.js Build Test` |
| `REQ-UI-LIB` | Thư viện Multi-CV, Upload PDF/DOCX (AI Extraction & Review) | `UC-UI-LIB` | `CV`, `CVVersion` | CVCard, CVUploadModal | `cvs`, `cv_versions` | `GET/POST /api/v1/cvs` | `04 CV Library (/candidate/cvs)` | `Next.js Build Test` |
| `REQ-UI-BLD` | Industry-aware CV Template Recommendation & Live Preview | `UC-UI-BLD` | `CV`, `CVSection` | CVBuilderPage | `cv_sections` | `POST /api/v1/cvs/builder` | `05 Builder (/candidate/cvs/builder)` | `Next.js Build Test` |
| `REQ-UI-PDF` | Xác minh chất lượng Xuất PDF khớp Live Preview | `UC-UI-PDF` | `CV` | CVBuilderPage | `N/A` | `N/A` | `Live Preview Modal` | `pdf-export-verification.md` |
| `REQ-UI-RSP` | Xác minh giao diện Responsive trên Desktop, Tablet & Mobile | `UC-UI-RSP` | `N/A` | Tailwind CSS Responsive Layouts | `N/A` | `N/A` | `All Screens` | `responsive-ui-verification.md` |
