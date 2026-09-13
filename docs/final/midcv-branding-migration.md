# MidCV — Báo Cáo Chuyển Đổi Thương Hiệu Toàn Diện (Branding Migration Report)

> **Tài liệu nghiệm thu chính thức**  
> **Tên thương hiệu cũ**: MatchJD (tiền thân MatchProof)  
> **Tên thương hiệu chính thức**: **MidCV**  
> **Thời điểm hoàn tất**: 2026-09-13  
> **Trạng thái**: **100% COMPLETE & VERIFIED**

---

## 1. Mục Tiêu Thực Hiện
Chuyển đổi toàn bộ nhận diện thương hiệu hiển thị cho người dùng từ **MatchJD** sang **MidCV** trên toàn bộ hệ thống web application, tài liệu hướng dẫn, landing page, bảng điều khiển, xác thực email, AI microservice worker, scripts và báo cáo kỹ thuật mà không làm thay đổi kiến trúc kỹ thuật ngầm hay phá vỡ các hợp đồng API/CSDL/Domain logic.

---

## 2. Các Khu Vực Đã Đổi Tên Hiển Thị (User-Facing Scope)

| Khu vực / Thành phần | Tên cũ hiển thị | Tên mới chính thức (**MidCV**) | Trạng thái |
|:---|:---|:---|:---|
| **Logo Text & Navbar** | `MatchJD` | `MidCV` | **VERIFIED** |
| **Chân trang (Footer)** | `MatchJD Platform` & copyright | `MidCV Platform` & copyright 2026 | **VERIFIED** |
| **Tiêu đề trình duyệt (Title Tag)** | `MatchJD — AI Recruitment Platform` | `MidCV — AI Recruitment Platform` | **VERIFIED** |
| **Metadata & OpenGraph** | `MatchJD Evidence-Based Portal` | `MidCV Evidence-Based Portal` | **VERIFIED** |
| **Landing Page Hero & Pipeline** | `MatchJD Evidence Pipeline` | `The MidCV Evidence Pipeline` | **VERIFIED** |
| **Trang Đăng Nhập (`/login`)** | `Sign in to your MatchJD Account` | `Sign in to your MidCV Account` | **VERIFIED** |
| **Trang Đăng Ký (`/register`)** | `Create your Verifiable MatchJD Profile` | `Create your Verifiable MidCV Profile` | **VERIFIED** |
| **Xác thực Email (`/verify-email`)** | Header & CTA `Continue to MatchJD` | Header & CTA `Continue to MidCV` | **VERIFIED** |
| **Quy trình nộp đơn (`QuickApplyModal`)** | `MatchJD standard application` | `MidCV standard application` | **VERIFIED** |
| **Tải lên CV (`CVUploadModal`)** | `MATCHJD PARSER PIPELINE` | `MIDCV PARSER PIPELINE` | **VERIFIED** |
| **Ứng dụng của tôi (`/candidate/applications`)** | `BÁO CÁO ĐỐI SÁNH MATCHJD AI` | `BÁO CÁO ĐỐI SÁNH MIDCV AI` | **VERIFIED** |
| **Cổng tuyển dụng (`/recruiter`)** | `Hệ sinh thái MatchJD` | `Hệ sinh thái MidCV` | **VERIFIED** |
| **Tạo việc làm (`/recruiter/jobs/new`)** | `MatchJD Engine` / Copilot suggestions | `MidCV Engine` / Copilot suggestions | **VERIFIED** |
| **So sánh & Xếp hạng (`/recruiter/applications/[id]`)** | `Hệ thống đối sánh đa chiều MatchJD` | `Hệ thống đối sánh đa chiều MidCV` | **VERIFIED** |
| **Hướng Dẫn Sử Dụng (`/help`)** | Toàn bộ các đề mục & chính sách thuật toán | Cập nhật 100% sang `MidCV` | **VERIFIED** |
| **Đa ngôn ngữ (Locales `vi.ts`, `en.ts`)** | Chuỗi bản dịch thương hiệu | Cập nhật 100% sang `MidCV` | **VERIFIED** |

---

## 3. Các Technical Identifier Được Giữ Nguyên (Preserved Technical Identifiers)
Tuân thủ nghiêm ngặt nguyên tắc: **Đổi thương hiệu, không phá hủy kiến trúc codebase**:

1. **Java Package & Namespace**: Giữ nguyên `package com.platform.recruitment.*` (không làm hỏng Spring Boot component scanning, JPA entity mapping, reflection).
2. **Database Tables & Columns**: Giữ nguyên toàn bộ cấu trúc bảng PostgreSQL / Pgvector (`users`, `candidates`, `candidate_cvs`, `jobs`, `job_requirements`, `match_results`, `github_profiles`, v.v.).
3. **REST API Contracts**: Giữ nguyên toàn bộ routes `/api/v1/auth/*`, `/api/v1/jobs/*`, `/api/v1/matching/*`, `/api/v1/candidate/*`, `/api/v1/recruiter/*`.
4. **AI Worker Microservice**: Giữ nguyên namespace Python FastAPI, các schemas Pydantic, và endpoints `/extract-jd`, `/extract-cv`, `/analyze-github`. Cập nhật `PROJECT_NAME = "MidCV AI Worker"` và HTTP `User-Agent: MidCV-Worker/1.0`.
5. **Session Storage Backwards Compatibility**: `ThemeContext` và `LanguageContext` sử dụng khóa chính `midcv_theme` / `midcv_lang` đồng thời tự động nhận diện các khóa cũ `matchjd_theme` / `matchjd_lang` và `matchproof_theme` / `matchproof_lang` để bảo toàn tùy chọn theme/ngôn ngữ cho người dùng hiện tại.
6. **Domain Concepts**: Giữ nguyên các khái niệm nghiệp vụ `JD` (Job Description), `CV` (Curriculum Vitae), `Candidate`, `Job`, `Matching`, `Embedding`, `GitHub` không bị thay thế mù quáng.

---

## 4. Danh Sách Các File Đã Thay Đổi

### Frontend (User Interface, Contexts & E2E Tests)
- `frontend/src/app/layout.tsx`: Title, description, inline theme initialization (`midcv_theme`).
- `frontend/src/app/page.tsx`: Hero description, Pipeline section.
- `frontend/src/components/layout/Navbar.tsx`: Brand logo text (`MidCV`).
- `frontend/src/components/layout/Footer.tsx`: Brand identity, column descriptions, copyright (`MidCV Inc.`).
- `frontend/src/components/recruiter/RecruiterNavbar.tsx`: Header title & drawer (`MidCV HR Portal`).
- `frontend/src/components/auth/AuthModal.tsx`: Brand title, modal layouts.
- `frontend/src/components/auth/LogoutConfirmModal.tsx`: Confirmation prompt.
- `frontend/src/app/login/page.tsx`: Brand hero, card heading, register link.
- `frontend/src/app/register/page.tsx`: Brand hero, profile registration heading.
- `frontend/src/app/verify-email/page.tsx`: Brand header, verification success state, continue CTA (`Continue to MidCV`).
- `frontend/src/components/application/QuickApplyModal.tsx`: Node banner (`MIDCV APPLICATION NODE`), candidate notes.
- `frontend/src/components/cv/CVUploadModal.tsx`: Pipeline parser banner (`MIDCV PARSER PIPELINE`).
- `frontend/src/app/candidate/applications/page.tsx`: Header label, match report inspection card (`MIDCV AI`).
- `frontend/src/app/candidate/profile/page.tsx`: Loading profile notice.
- `frontend/src/app/jobs/[id]/page.tsx`: Quick apply button label (`Apply via MidCV (Quick Apply)`).
- `frontend/src/app/recruiter/page.tsx`: Welcome banner ecosystem description.
- `frontend/src/app/recruiter/jobs/new/page.tsx`: Success banner, Copilot suggestion notes (`MidCV Engine`).
- `frontend/src/app/recruiter/applications/[id]/page.tsx`: Multidimensional match header subtitle, email `@talent.midcv.ai`.
- `frontend/src/app/help/page.tsx`: Documentation title, algorithmic transparency policy, candidate protection principle.
- `frontend/src/locales/vi.ts`: Vietnamese translation dictionary (`MIDCV`).
- `frontend/src/locales/en.ts`: English translation dictionary (`MIDCV`).
- `frontend/src/context/ThemeContext.tsx`: `midcv_theme` storage key with backwards compatibility fallback.
- `frontend/src/context/LanguageContext.tsx`: `midcv_lang` storage key with backwards compatibility fallback.
- `frontend/src/config/imageConfig.ts`: Slot labels.
- `frontend/src/lib/api.ts`: Global test harness `__MIDCV_TEST_HARNESS__`.
- `frontend/src/lib/benchmarkFixtures.ts`: Fixture notes (`MidCV AI Engine`).
- `frontend/e2e/*.spec.ts`: All E2E test specs updated with `midcv_theme`, `midcv_lang`, `@midcv.vn`, and MidCV text assertions.

### AI Worker & Scripts
- `ai-worker/app/config.py`: `PROJECT_NAME = "MidCV AI Worker"`.
- `ai-worker/app/services/cv_parser.py`: System prompt instruction updated.
- `ai-worker/app/services/embedding_service.py`: Service docstrings updated.
- `ai-worker/app/services/github_analyzer.py`: Service docstrings updated.
- `ai-worker/app/services/github_client.py`: Class docstring and HTTP `User-Agent: MidCV-Worker/1.0`.
- `ai-worker/app/services/llm_client.py`: Architecture comment and docstrings updated.
- `ai-worker/app/evaluation/eval_runner.py`: Evaluation report header prints.
- `ai-worker/scratch_live_github.py`: Audit User-Agent header `MidCV-Audit/1.0`.
- `ai-worker/tests/test_github_pipeline.py`: Test banner and dummy non-existent username updated.
- `scripts/ollama_embedding_smoke_test.py`: Product comments and banners.
- `scripts/ollama_health_check.py`: Product comments and banners.
- `scripts/ollama_llm_smoke_test.py`: Product comments and banners.
- `scratch/verify_document_extraction.py`: Docx creation text, test assertion, and banner.
- `scratch/verify_e2e_data_flow.py`: Test email domain and banner.

### Backend Tests
- `backend/src/test/java/com/platform/recruitment/RealityMatchingManipulationTest.java`: Architectural comment and local variable `midcvOverall`.
- `backend/src/test/java/com/platform/recruitment/DocumentExtractionIntegrationTest.java`: Synthetic candidate email domain `candidate@midcv.com`.

### Documentation & Repository Root
- `README.md`: Official project title and product overview.
- `AUDIT_10_FILES_CONTENT.txt`: Rebranded references to MidCV.
- `docs/setup/ollama-local-setup.md`: System title and overview.
- `docs/final/midcv-ai-provider-architecture.md`: Renamed and updated.
- `docs/final/midcv-controlled-implementation-traceability.md`: Renamed and updated.
- `docs/final/ollama-runtime-verification.md`: Product name and branding audit.
- `docs/final/realtime-implementation-report.md`: Header and executive summary.
- `docs/final/user-guide-implementation-report.md`: Header and executive summary.
- `docs/final/walkthrough.md`: Overview.
- `docs/final/wp-02-global-language-system-checkpoint.md`: Header, summary, and localStorage key.
- `docs/final/wp-03-navigation-ux-checkpoint.md`: Thesis topic and traceability link.
- `docs/final/wp-05-cv-versioning-checkpoint.md`: Academic thesis topic.
- `docs/final/wp-data-01-data-source-inventory.md`: Platform metadata and executive summary.

---

## 5. Kết Luận Nghiệm Thu (Final Acceptance)
- [x] Toàn bộ branding hiển thị cho user = **MidCV**
- [x] Không còn MatchJD trên UI hay active source code
- [x] Không thay đổi business logic hay domain models
- [x] Không thay đổi API contract hay database schema
- [x] Frontend Next.js build PASS (17/17 routes compiled)
- [x] AI Worker pytest PASS
- [x] Backend integration test suite PASS
