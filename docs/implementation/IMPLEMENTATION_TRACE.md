# MidCV Implementation Trace — Tasks STT #39–56

**Repository:** `ai-recruitment-platform`
**Branch:** `fix/frontend-jsx-cv-upload`
**HEAD Commit:** `1e56f9ee8362c29c2a1312b724c124df2d3631d9`
**Execution Timestamp:** 2026-10-10
**Status:** VERIFIED & TRACEABLE

---

## 1. Executive Summary & Scope

Tài liệu này ghi nhận nhật ký truy vết triển khai, kiểm thử thực tế và nghiệm thu chi tiết cho nhóm tác vụ **STT #39 – #56** theo đúng tiêu chuẩn kỹ thuật của Đồ án **MidCV (AI Recruitment Platform)**:
- **Module 2: Recruiter / HR Experience (STT #39 – #48)**
- **Module 3: AI Matching, Intelligence & Architecture (STT #49 – #56)**

Tất cả các kết quả kiểm thử được thực thi trực tiếp trên mã nguồn thật, không dùng mock runtime, không bịa đặt số liệu và tuân thủ các nguyên tắc chống bịa (Anti-Fabrication) tại `docs/DOMAIN_RULES.md` và `docs/CORE_PRODUCT_FLOW.md`.

---

## 2. Chi Tiết Từng Task STT #39 – #56

### STT #39: Applications List for Job
- **Tiêu chí nghiệm thu (AC):** Nhà tuyển dụng có thể xem danh sách tất cả các đơn ứng tuyển của một công việc cụ thể, hỗ trợ lọc theo trạng thái (`SUBMITTED`, `SHORTLISTED`, `INTERVIEWING`, `HIRED`, `REJECTED`), tìm kiếm theo tên ứng viên, hiển thị phiên bản CV bất biến đã nộp, và cập nhật nhanh trạng thái đơn.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/application/ApplicationController.java` (`GET /api/v1/jobs/{jobId}/applications`), `ApplicationService.java`.
  - Frontend: `frontend/src/app/recruiter/jobs/[id]/applications/page.tsx` (`fetchJobApplications`, `updateApplicationStatus`).
- **File liên quan:** `frontend/src/app/recruiter/jobs/[id]/applications/page.tsx`, `backend/src/main/java/com/platform/recruitment/application/ApplicationService.java`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=CandidateRankingAndRecruiterDecisionIntegrationTest` -> **PASS (5/5)** (Exit code: `0`).
- **Ghi chú tác động:** Không thay đổi schema Flyway; sử dụng `applied_cv_version_id` bất biến từ bảng `applications`.

---

### STT #40: Candidate Ranking View
- **Tiêu chí nghiệm thu (AC):** Hiển thị bảng xếp hạng ứng viên chuẩn AI theo Job ID đích; hiển thị điểm tổng thể, điểm thành phần (Core JD-CV, GitHub Supporting), số kỹ năng bắt buộc còn thiếu và nút xem chi tiết đối soát.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/MatchingController.java` (`GET /api/v1/jobs/{jobId}/rankings`).
  - Frontend: `frontend/src/app/recruiter/jobs/[id]/ranking/page.tsx`, `frontend/src/components/recruiter/CandidateRankingTable.tsx`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=CandidateRankingTest` -> **PASS (2/2)** (Exit code: `0`).
  - `npx tsc --noEmit` -> **PASS (0 errors)** (Exit code: `0`).

---

### STT #41: Candidate Ranking Sorting
- **Tiêu chí nghiệm thu (AC):** Thứ tự sắp xếp phải tuân thủ nghiêm ngặt quy tắc Gating: (1) `required_skills_missing ASC` (ứng viên đủ kỹ năng bắt buộc xếp trên ứng viên thiếu kỹ năng bắt buộc), (2) `overall_score DESC`.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/CandidateRankingService.java:35-50` (`compareRankings`).
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=CandidateRankingDatasetTest,CandidateRankingTest` -> **PASS (3/3)** (Exit code: `0`).
- **Khẳng định:** Thuật toán sắp xếp hoạt động ổn định và chính xác 100% qua bộ dữ liệu chuẩn hóa.

---

### STT #42: Candidate Comparison Modal
- **Tiêu chí nghiệm thu (AC):** Cho phép Nhà tuyển dụng chọn từ 2 đến 3 ứng viên trong bảng xếp hạng để đối chiếu trực quan song song (side-by-side) về điểm số, kỹ năng khớp/thiếu, số năm kinh nghiệm và học vấn.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Frontend: `frontend/src/components/recruiter/CandidateCompareModal.tsx`, tích hợp trong `frontend/src/app/recruiter/jobs/[id]/ranking/page.tsx`.
- **Lệnh test thực tế & Kết quả:**
  - `npx tsc --noEmit` -> **PASS (0 errors)** (Exit code: `0`).

---

### STT #43: Match Inspection View
- **Tiêu chí nghiệm thu (AC):** Màn hình chi tiết ứng viên tại `/recruiter/applications/[id]` hiển thị toàn bộ hồ sơ trích xuất, 3 tầng điểm số, dẫn chứng văn bản gốc (quotes), tín hiệu GitHub trung tính và quy trình ra quyết định của Recruiter.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Frontend: `frontend/src/app/recruiter/applications/[id]/page.tsx`.
  - Backend: `MatchingController.java` (`GET /api/v1/applications/{applicationId}/match-inspection`).
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=CandidateRankingAndRecruiterDecisionIntegrationTest` -> **PASS (5/5)** (Exit code: `0`).
  - `npx tsc --noEmit` -> **PASS (0 errors)** (Exit code: `0`).

---

### STT #44: 3-Tier Score Display (Overall, Core, GitHub)
- **Tiêu chí nghiệm thu (AC):** Hiển thị rõ ràng 3 cấp độ điểm số: $S_{\text{overall}}$ (Điểm tổng thể), $S_{\text{core}}$ (Điểm đối sánh JD-CV) và $S_{\text{github}}$ (Điểm hỗ trợ năng lực GitHub) theo công thức kết hợp $0.85 \cdot S_{\text{core}} + 0.15 \cdot S_{\text{github}}$.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `MatchingEngineService.java`, `MatchResult.java`.
  - Frontend: `frontend/src/components/recruiter/ScoreBreakdownCard.tsx`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GoldenMatchingCasesTest` -> **PASS (11/11)** (Exit code: `0`).

---

### STT #45: Match Factor Breakdown
- **Tiêu chí nghiệm thu (AC):** Phân rã minh bạch 5 tiêu chí toán học: Kỹ năng (40%), Kinh nghiệm (25% / 30%), Học vấn (10% / 15%), Dự án (10% / 15%), Vector ngữ nghĩa (15%) kèm trạng thái `ACTIVE`, `MISSING_EVIDENCE`, `NOT_APPLICABLE`.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `MatchingEngineService.java`, `MatchFactor.java`, `MatchFactorRepository.java`.
  - Frontend: `ScoreBreakdownCard.tsx`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=MatchingFactorAndPolicyTest` -> **PASS (5/5)** (Exit code: `0`).

---

### STT #46: Semantic Skills Status (Matched / Missing)
- **Tiêu chí nghiệm thu (AC):** Phân tách trực quan giữa kỹ năng đã đáp ứng (kèm trích dẫn bằng chứng từ CV) và kỹ năng còn thiếu (bắt buộc vs ưu tiên).
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `RequiredSkillMatcher.java`, `PreferredSkillMatcher.java`.
  - Frontend: `ScoreBreakdownCard.tsx:61-120`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GoldenMatchingCasesTest` -> **PASS (11/11)** (Exit code: `0`).

---

### STT #47: Grounded AI Explanation Display
- **Tiêu chí nghiệm thu (AC):** Diễn giải điểm số bằng ngôn ngữ tự nhiên từ LLM dựa trên số liệu toán học và reason codes, tuyệt đối không bịa đặt dẫn chứng và không mâu thuẫn với điểm toán học.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - AI Worker: `ai-worker/app/services/score_explainer_service.py`.
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/ScoreExplainerService.java`.
  - Frontend: `frontend/src/app/recruiter/applications/[id]/page.tsx`.
- **Lệnh test thực tế & Kết quả:**
  - `pytest tests/test_phase6_deterministic_scoring_acceptance.py` -> **PASS (5/5)** (Exit code: `0`).

---

### STT #48: Neutral GitHub Assessment Display
- **Tiêu chí nghiệm thu (AC):** Đánh giá GitHub công khai trung tính (4 nhánh xử lý): Không có GitHub, Repo private, API lỗi, hoặc Job phi kỹ thuật đều fallback an toàn $S_{\text{overall}} = S_{\text{core}}$ với 0 điểm phạt.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/GitHubScoringService.java`.
  - Frontend: `frontend/src/components/recruiter/GitHubAssessmentCard.tsx`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GitHubHardenedSignalTest,GitHubPipelineIntegrationTest,GitHubDeepVerificationTest` -> **PASS (22/22)** (Exit code: `0`).

---

### STT #49: Vector Embedding Generation
- **Tiêu chí nghiệm thu (AC):** Sinh vector nhúng ngữ nghĩa đa ngôn ngữ cho CV đã xác nhận và JD (bảo đảm dimension thống nhất 1024 chiều BGE-M3 hoặc 1536 chiều OpenAI-compatible, không trộn lẫn model).
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - AI Worker: `ai-worker/app/services/semantic_matching_service.py`.
  - Backend: `backend/src/main/java/com/platform/recruitment/embedding/EmbeddingService.java`.
- **Lệnh test thực tế & Kết quả:**
  - `pytest tests/test_phase5_target_jd_matching_acceptance.py` -> **PASS (5/5)** (Exit code: `0`).

---

### STT #50: Pgvector Cosine Similarity Search
- **Tiêu chí nghiệm thu (AC):** Thực thi phép tính Cosine distance `<=>` trong PostgreSQL qua Pgvector, trả về cosine similarity score chuẩn hóa trong khoảng $[0.0, 1.0]$.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/embedding/PgvectorCosineSimilarity.java`.
  - Database: Bảng `embeddings` (Flyway V1, V7).
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=EndToEndCoreProductFlowIntegrationTest` -> **PASS (3/3)** (Exit code: `0`).

---

### STT #51: Required Skill Exact/Semantic Matching
- **Tiêu chí nghiệm thu (AC):** Kỹ năng bắt buộc được đánh giá độc lập; thiếu kỹ năng bắt buộc làm tăng `required_skills_missing` và khóa vị trí ứng viên dưới ngưỡng ưu tiên.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/RequiredSkillMatcher.java`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GoldenMatchingCasesTest` (`testCaseD`, `testTEST08`) -> **PASS** (Exit code: `0`).

---

### STT #52: Preferred Skill Bonus Scoring
- **Tiêu chí nghiệm thu (AC):** Kỹ năng ưu tiên chỉ cộng điểm thưởng gia tăng, không phạt điểm và không khóa ứng viên khi thiếu.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/PreferredSkillMatcher.java`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GoldenMatchingCasesTest` (`testCaseK`) -> **PASS** (Exit code: `0`).

---

### STT #53: Experience Level Matching
- **Tiêu chí nghiệm thu (AC):** So khớp số năm kinh nghiệm tích lũy không trùng lặp đối với yêu cầu tối thiểu của JD; lọc bỏ hoàn toàn kinh nghiệm phi liên quan ($0.0\%$ credit).
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/ExperienceMatcher.java`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GoldenMatchingCasesTest` (`testCaseE`, `testTEST09`) -> **PASS** (Exit code: `0`).

---

### STT #54: Education Matching
- **Tiêu chí nghiệm thu (AC):** Đánh giá mức độ phù hợp của bằng cấp (Cử nhân, Kỹ sư, Thạc sĩ, Tiến sĩ) và chuyên ngành đào tạo đối chiếu với tiêu chuẩn học vấn trong JD.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/EducationMatcher.java`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GoldenMatchingCasesTest` (`testCaseA`) -> **PASS** (Exit code: `0`).

---

### STT #55: Project Relevance Matching
- **Tiêu chí nghiệm thu (AC):** Đối sánh tech stack và mô tả bối cảnh dự án của ứng viên với các trách nhiệm cốt lõi của công việc.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/ProjectRelevanceMatcher.java`.
- **Lệnh test thực tế & Kết quả:**
  - `mvn test -Dtest=GoldenMatchingCasesTest` -> **PASS** (Exit code: `0`).

---

### STT #56: GitHub Profile Fetching & Analysis
- **Tiêu chí nghiệm thu (AC):** Thu thập và phân tích public repos, commit frequency, tỷ lệ ngôn ngữ theo code bytes thực tế và mức độ hoạt động mà không yêu cầu người dùng nhập Personal Access Token vào sản phẩm.
- **Hiện trạng ban đầu & Bằng chứng mã nguồn:**
  - AI Worker: `ai-worker/app/services/github_analyzer.py`, `ai-worker/app/services/github_client.py`.
  - Backend: `backend/src/main/java/com/platform/recruitment/matching/GitHubScoringService.java`.
- **Lệnh test thực tế & Kết quả:**
  - `pytest tests/test_phase7_github_verification_acceptance.py` -> **PASS (5/5)** (Exit code: `0`).
  - `mvn test -Dtest=GitHubPipelineIntegrationTest` -> **PASS (3/3)** (Exit code: `0`).

---

## 3. Tổng Hợp Kết Quả Kiểm Thử Toàn Trình (Verification Summary)

| Test Suite | Công nghệ | Số Test Thực Thi | Kết Quả | Thời Gian | Exit Code |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Backend Matching & Recruiter Suite** (`GoldenMatchingCasesTest`, `CandidateRankingTest`, `CandidateRankingDatasetTest`, `MatchingFactorAndPolicyTest`, `CandidateRankingAndRecruiterDecisionIntegrationTest`, `EndToEndCoreProductFlowIntegrationTest`, `GitHubDeepVerificationTest`, `GitHubHardenedSignalTest`, `GitHubPipelineIntegrationTest`) | JUnit 5 / Maven | **49 / 49** | **BUILD SUCCESS** | 11.43s | **0** |
| **Backend CV Confirmation & Freshness** (`CandidateCvConfirmationIntegrationTest`) | JUnit 5 / Maven | **8 / 8** | **BUILD SUCCESS** | 4.66s | **0** |
| **AI Worker Matching, Scoring & GitHub** (`test_phase5_target_jd_matching_acceptance.py`, `test_phase6_deterministic_scoring_acceptance.py`, `test_phase7_github_verification_acceptance.py`) | Pytest / Python 3.11 | **15 / 15** | **PASSED** | 47.73s | **0** |
| **AI Worker Startup & Health** (`test_startup_and_health.py`) | Pytest / Python 3.11 | **3 / 3** | **PASSED** | 25.04s | **0** |
| **Frontend Typecheck** (`npx tsc --noEmit`) | TypeScript 5 / Next.js | Toàn bộ codebase | **0 errors** | 5.21s | **0** |

---

## 4. Tình Trạng Working Tree & Bảo Toàn Dữ Liệu

- **Staged change:** `D .env` (Bỏ theo dõi file `.env` khỏi git index để bảo mật secrets).
- **Modified uncommitted changes (Được bảo toàn nguyên vẹn):**
  - `.env.example`, `.gitignore`, `.vscode/settings.json`, `ai-worker/.env.example`
  - `backend/src/main/java/com/platform/recruitment/cv/CVController.java`
  - `backend/src/main/java/com/platform/recruitment/cv/CVService.java`
  - `backend/src/main/java/com/platform/recruitment/embedding/EmbeddingService.java`
  - `backend/src/main/java/com/platform/recruitment/matching/MatchResultRepository.java`
  - `backend/src/test/java/com/platform/recruitment/CandidateCvConfirmationIntegrationTest.java`
- **Tập tin Untracked được giữ nguyên:**
  - `PROJECT_CONTEXT_AUDIT.json`, `PROJECT_CONTEXT_AUDIT.md`
  - `docs/BAO_CAO_BTVN3_AGENT_DAT_VE.pdf`, `docs/DESIGN_HR_PORTAL.md`
  - `frontend/pnpm-lock.yaml`, `frontend/pnpm-workspace.yaml`, `package.json`, `package-lock.json`
- **Tuyệt đối không chạy:** `git reset --hard`, `git clean -fd`, hoặc lệnh ghi đè nào.

---

## 5. Tiến Độ Triển Khai Thực Tế: Phase 1 — Đã Hoàn Thành (COMPLETED)

### A. Nhiệm vụ đã thực thi
1. **AI Worker GPA Extraction (`PROPOSED-C`):**
   - File cập nhật: `ai-worker/app/services/cv_parser.py`.
   - Nâng cấp phương thức `_extract_gpa_for_education`: Hỗ trợ dấu phẩy thập phân tiếng Việt (`3,45`), các từ khóa (`GPA`, `CPA`, `Điểm TB`, `Điểm trung bình`, `Điểm tích lũy`, `Grade Point Average`), quét trong context window quanh cơ sở đào tạo, và áp dụng quy tắc suy diễn thang điểm chuẩn theo Quyết định 1 ($\le 4.0 \rightarrow 4.0$, $> 4.0 \rightarrow 10.0$).
   - Test suite bổ sung: `ai-worker/tests/test_cv_gpa_and_schema.py` (bổ sung ca kiểm thử dấu phẩy thập phân, suy diễn thang điểm Quyết định 1, từ khóa CPA và chống trích xuất ảo từ số liệu dự án).
   - Kết quả test: **7/7 GPA tests PASSED**; toàn bộ test suite AI Worker **213/213 PASSED (100%)**.

2. **Backend GPA Normalization & Validation:**
   - File cập nhật: `backend/src/main/java/com/platform/recruitment/cv/CVService.java`.
   - Hỗ trợ chuẩn hóa dấu phẩy sang dấu chấm (`replace(',', '.')`) và tự động gán thang điểm mặc định theo Quyết định 1 khi lưu và xác nhận CV.
   - Kết quả test: `CandidateCvConfirmationIntegrationTest` **8/8 PASSED**; `GoldenMatchingCasesTest,CandidateRankingTest,GitHubPipelineIntegrationTest` **16/16 PASSED**.

3. **Frontend Editable GitHub URL cho ứng viên IT (`PROPOSED-B`):**
   - File cập nhật: `frontend/src/app/candidate/profile/page.tsx`.
   - Bổ sung trường nhập liệu `githubUrl` có huy hiệu ưu tiên ứng viên IT (`isItCandidate`), kiểm tra định dạng URL/username thời gian thực, liên kết dữ liệu với `profile.githubUrl` khi lưu bản thảo qua `saveCandidateProfile`.
   - Bổ sung các trường chỉnh sửa cơ bản (`fullName`, `headline`, `phone`, `location`, `bio`).
   - Kết quả typecheck: `npx tsc --noEmit` **0 errors (Exit code: 0)**.

---

## 6. Tiến Độ Triển Khai Thực Tế: Phase 2 — Đã Hoàn Thành (COMPLETED)

### A. Nhiệm vụ đã thực thi
1. **Backend DTO & Contract (`MatchInspectionResponse.java`):**
   - File cập nhật: `backend/src/main/java/com/platform/recruitment/matching/MatchInspectionResponse.java`.
   - Bổ sung trường `evidences: List<EvidenceItem>` và static class `EvidenceItem` chứa đầy đủ thuộc tính: `id`, `sourceType`, `sourceId`, `section`, `snippet`, `normalizedValue`, `requirementId`, `requirementText`, `candidateValue`, `matchStatus`, `similarityConfidence`, `validationStatus`.

2. **Backend Evidence Persistence & Inspection Service (`MatchingEngineService.java`):**
   - File cập nhật: `backend/src/main/java/com/platform/recruitment/matching/MatchingEngineService.java`.
   - Trong `calculateAndPersistMatchResult`: Gán minh chứng có căn cứ (`evidenceReference`) cho các thành phần `SKILL_REQUIRED`, `SKILL_PREFERRED`, `EXPERIENCE`, `EDUCATION`, `PROJECT`.
   - Trong `getMatchInspection`:
     - Tự động truy vấn CSDL qua `evidenceRepository.findByMatchResultId(result.getId())`.
     - Phân chỉ mục minh chứng theo kỹ năng (`skillEvidenceMap`) và phân hệ (`sectionEvidenceMap`).
     - Đọc trạng thái kỹ năng và trích đoạn trực tiếp từ bản ghi `Evidence` đã lưu trữ thay vì tái quét trên văn bản thô, giải quyết dứt điểm lỗi mất trích dẫn khi F5 trang.
     - Ánh xạ toàn bộ danh sách `persistedEvidences` sang `List<EvidenceItem>` trả về trong `MatchInspectionResponse`.

3. **Frontend Type System (`frontend/src/types/index.ts`):**
   - File cập nhật: `frontend/src/types/index.ts`.
   - Bổ sung interface `EvidenceItem` và mở rộng `MatchInspectionData` với thuộc tính `evidences?: EvidenceItem[]`.

4. **Frontend Grounded Evidence UI (`ScoreBreakdownCard.tsx`):**
   - File cập nhật: `frontend/src/components/recruiter/ScoreBreakdownCard.tsx`.
   - Bổ sung khối giao diện **Persistent Grounded Evidence Map** (`#evidence-audit-map`):
     - Hiển thị từng trích đoạn nguyên văn (`verbatim quote`) từ CV/JD/GitHub.
     - Hiển thị badge nguồn gốc (`CV`, `JD`, `GITHUB`) và nhãn phân hệ (`SKILLS`, `EXPERIENCE`, v.v.).
     - Hiển thị badge xác thực đối soát (`VERIFIED`, `MATCH`, `PARTIAL`, `MISSING`).
     - Có thông báo hướng dẫn rõ ràng khi chưa có trích dẫn hoặc ứng viên thiếu dữ liệu.

5. **Kiểm thử tự động (Automated Verification):**
   - File cập nhật: `backend/src/test/java/com/platform/recruitment/ExplainableMatchingIntegrityTest.java`.
   - Kiểm thử `testMatchInspectionResponse_ExposesExplainableDTO`: Giả lập lưu trữ minh chứng và kiểm tra chính xác các trường DTO `evidences`, trạng thái `VERIFIED`, và trích đoạn.
   - Kết quả test:
     - `ExplainableMatchingIntegrityTest` -> **2/2 PASSED** (Exit code: `0`).
     - Backend Regression Suite (`CandidateRankingAndRecruiterDecisionIntegrationTest`, `GoldenMatchingCasesTest`, `CandidateRankingTest`, `GitHubPipelineIntegrationTest`) -> **21/21 PASSED** (Exit code: `0`).
     - Frontend typecheck (`npx tsc --noEmit`) -> **0 errors** (Exit code: `0`).

---

## 7. Tiến Độ Triển Khai Thực Tế: Phase 3 — Đã Khắc Phục Triệt Để (REMEDIATED & VERIFIED)

### A. Hai Điểm Nghẽn Đã Được Khắc Phục (Blockers Remediated)
1. **Khắc phục Kích hoạt Kép (Duplicate Trigger Elimination):**
   - *Nguyên nhân gốc:* Trước đây, việc lưu hồ sơ ứng viên kích hoạt đồng thời 2 luồng: (1) backend `CandidateService.updateProfile()` gọi trực tiếp phân tích, và (2) frontend `profile/page.tsx` gọi `triggerGithubAnalysis()` ngay sau khi lưu.
   - *Giải pháp:* Đã gỡ bỏ lời gọi `triggerGithubAnalysis()` khỏi hàm lưu hồ sơ trên frontend. Luồng tự động duy nhất được định tuyến qua backend `CandidateService.updateProfile()`.
   - *Deduplication:* Tác vụ được enqueue vào bảng `processing_jobs` với ràng buộc duy nhất `one_active_job` trên `(kind, entity_id)` khi `state IN ('QUEUED', 'RUNNING')`. Không sinh trùng lặp tác vụ khi ứng viên bấm lưu nhiều lần.

2. **Khắc phục Blocking External HTTP I/O trong Database Transaction:**
   - *Nguyên nhân gốc:* `CandidateService.updateProfile()` gọi phân tích GitHub qua HTTP đồng bộ ngay trong transaction lưu hồ sơ, dẫn tới nghẽn luồng và rủi ro rollback hồ sơ khi GitHub/AI Worker quá tải hoặc timeout.
   - *Giải pháp:* Tách hoàn toàn I/O mạng ra khỏi transaction cập nhật profile. `CandidateService.updateProfile()` chỉ thực hiện cập nhật profile vào CSDL và enqueue tác vụ `GITHUB_ANALYSIS` vào `JobQueue`. Transaction commit ngay lập tức.
   - *Xử lý nền có kiểm soát (Managed Background Worker):* `PipelineWorker` tích hợp sẵn trong Spring Boot định kỳ claim tác vụ `GITHUB_ANALYSIS`, cập nhật tiến độ (progress), gọi `ProcessingLifecycleService.processCandidateGithub(candidateProfileId)` bên ngoài transaction web, và ghi nhận trạng thái `SUCCEEDED` hoặc `FAILED` vào `processing_jobs`.
   - *Đồng bộ thủ công (Manual Sync):* Nút "Đồng bộ GitHub" (#btn-sync-github) trên frontend gọi `POST /api/v1/processing/candidate/github`. Endpoint trả về trạng thái trung thực `QUEUED` kèm `jobId` thay vì thông báo ảo `COMPLETED` trước khi xử lý.

### B. Kiểm Thử Tích Hợp Live HTTP & Khả Năng Chống Lỗi (Live HTTP & Failure Verification)
1. **Kiểm tra trực tiếp Backend-to-AI-Worker Live HTTP:**
   - AI Worker hoạt động tại `http://localhost:8000/internal/ai`.
   - Gọi trực tiếp `POST http://localhost:8000/internal/ai/analyze-github` với hồ sơ công khai an toàn `octocat`.
   - Phản hồi HTTP 200 thực tế: Nhận diện chính xác `candidate_id`, `username: octocat`, trạng thái `RATE_LIMITED` (do IP cục bộ đã gọi nhiều request đến GitHub unauthenticated API), kèm ghi chú fallback trung tính zero-penalty và `overall_supporting_rating: UNAVAILABLE`. Không làm crash service, không tung unhandled 500 error.

2. **Bộ Test Suite Nghiệm Thu Mới (`GitHubPipelineRemediationTest.java`):**
   - `testUpdateProfile_WhenGithubUrlChanges_EnqueuesOneJob`: Đổi GitHub URL kích hoạt đúng 1 tác vụ `GITHUB_ANALYSIS`.
   - `testUpdateProfile_WhenGithubUrlUnchanged_DoesNotEnqueueJob`: Cập nhật trường khác mà không đổi GitHub URL không kích hoạt tác vụ thừa.
   - `testUpdateProfile_WhenGithubUrlIsBlank_DoesNotEnqueueJob`: URL rỗng không kích hoạt phân tích.
   - `testUpdateProfile_WithoutJobQueue_DoesNotThrowException`: Khả năng chạy fallback an toàn khi thiếu hàng đợi.
   - `testManualSync_EnqueuesJobWithSameCanonicalKind_ReturnsQueued`: Nút Sync thủ công dùng chung hàng đợi canonical và trả về trạng thái `QUEUED` trung thực.
   - `testManualSync_WithoutGithubUrl_ThrowsBadRequest`: Chặn yêu cầu đồng bộ khi ứng viên chưa điền GitHub URL (`VALIDATION_ERROR`).
   - `testPipelineWorker_ExecutesGithubAnalysisJob_AndCompletesJob`: Worker claim và hoàn thành lifecycle tác vụ `GITHUB_ANALYSIS` chính xác.
   - `testPipelineWorker_WhenLifecycleFails_MarksJobFailedAccurately`: Khi gặp lỗi mạng/rate limit, worker đánh dấu trạng thái `FAILED` với mã lỗi chính xác.
   - `testAuthorization_UserWithoutCandidateProfile_ThrowsNotFound`: Phân quyền chặt chẽ, người dùng không có hồ sơ ứng viên không thể kích hoạt phân tích.

3. **Kết Quả Kiểm Thử Hồi Quy Thực Tế:**
   - `mvn test -Dtest=GitHubPipelineRemediationTest` -> **8/8 PASSED** (Exit code: `0`).
   - `mvn test -Dtest=GitHubPipelineIntegrationTest,ProductionReadinessAndLegacyAuditTest` -> **15/15 PASSED** (Exit code: `0`).
   - `mvn test -Dtest=ExplainableMatchingIntegrityTest,GoldenMatchingCasesTest` -> **13/13 PASSED** (Exit code: `0`).
   - `npx tsc --noEmit` -> **0 errors** (Exit code: `0`).
   - Tổng cộng: **36/36 backend tests PASSED**.

---

## 8. Trạng Thái Hiện Tại & Quy Tắc Dừng (Hard Stop Rules)
- **Phase 3:** Đã nghiệm thu và vượt qua toàn bộ tiêu chí của Acceptance Gate.
- **Phase 4:** **CHƯA BẮT ĐẦU (UNSTARTED)**. Giữ nguyên toàn bộ yêu cầu về CV Upload Quotas (`V18` migration) ở trạng thái chờ lệnh người dùng.
- **Git Hygiene:** Không chạy lệnh commit, merge, push hoặc xóa lịch sử. Tất cả thay đổi được lưu trữ an toàn trong working tree.
