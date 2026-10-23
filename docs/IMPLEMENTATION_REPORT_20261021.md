# Báo cáo triển khai — MidCV (21/10/2026)

## Phạm vi và baseline

Đã đọc AGENTS.md cùng sáu tài liệu SSOT (`CORE_PRODUCT_FLOW`, `DOMAIN_RULES`, `IMPLEMENTATION_STATUS`, `ACCEPTANCE_CRITERIA`, `API_CONTRACT`, `IMPLEMENTATION_PHASES`), các remediation report/contract/validation, config và mã liên quan. Branch `master`, HEAD `1c171a24bc4c1374ddef19f33306293135380da8`. Git status trước khi sửa đã có nhiều thay đổi và file chưa track từ remediation trước; không reset, xóa, stage hoặc commit. Nội dung đó được giữ nguyên.

Baseline focused trước thay đổi: backend remediation tests 56 passed; frontend contracts 11 passed; TypeScript passed; worker grounding audit 8 passed. Môi trường tại lượt kiểm tra: Java 21.0.11, Node 24.15.0, Python 3.11.9. Không có bằng chứng dịch vụ PostgreSQL/worker/provider đang chạy.

## Kết quả theo yêu cầu

1–2. **Google/GitHub OAuth:** thêm authorization-code callback server-side, state hash dùng một lần, PKCE verifier, internal return path allowlist, Google OIDC RS256/JWKS/issuer/audience/expiry/nonce/email verification, identity theo provider + subject. Dùng ticket ngắn hạn đổi sang JWT hiện có; không đưa JWT/access token vào URL. Không auto-merge email trùng; link chỉ từ phiên đã xác thực. Tài khoản tạo từ provider nhận role candidate. GitHub email private/thiếu có bước hoàn tất email và xác minh bằng flow hiện tại. Nút login/registration được nối backend; không cung cấp social signup recruiter bỏ qua onboarding.
3. **GitHub:** account OAuth chỉ dùng read:user/user:email; không lưu provider access token, không xin private repositories. Account ownership được đối chiếu với username quét; username nhập tay là `UNVERIFIED_PUBLIC`, không được đưa vào scoring. Công thức và trần trọng số GitHub 15% giữ nguyên. Link xong cần sync lại để profile/scoring được tính lại. Không tuyên bố đã nghiệm thu retry/rate-limit/provider live.
4–6. **CV builder:** thay trang giả lập bằng editor nháp thật nối API hiện có; hỗ trợ thông tin liên hệ/profile, kỹ năng và các section lặp experience/project/education/certification/language; hai template chỉ trình bày dữ liệu người dùng nhập; lưu/cập nhật/xác nhận, cảnh báo dirty navigation, lỗi giữ dữ liệu. Sửa CV đã xác nhận theo lifecycle draft/version hiện hành. Không thêm field nhạy cảm hay thành tích giả.
7. **Visual:** tinh chỉnh thực chất trang builder và các thành phần liên quan OAuth, GitHub, form lương/hiển thị lương theo style hiện hữu; chưa hoàn tất sweep/visual QA toàn bộ candidate/recruiter/auth/results ở browser do không có phiên dịch vụ/browser acceptance.
8. **Lương:** DEC-09 ghi nhận xác nhận người dùng: VND/tháng. Giữ nguyên số lịch sử, không scaling/FX. API vẫn numeric, `salaryCurrency=VND`, `salaryPeriod=MONTH`, `salaryNegotiable` tách riêng; trống là null/không công bố, 0 vẫn là 0. Thêm validation âm/range đảo/nghĩa negotiable và parser/formatter locale. Migration V23 additive.

## Tệp thay đổi

Git status hiện có 61 tracked paths modified và 45 untracked paths (106 paths tổng); có file remediation trước đó trong số này, nên đây là tổng cây làm việc cuối lượt, không đồng nghĩa tất cả do lượt này tạo. Không có tệp nào bị xóa. Các nhóm chính do triển khai lần này:

- OAuth backend/config/migrations: `backend/src/main/java/com/platform/recruitment/auth/OAuth*.java`, thay đổi `AuthService`, `application.yml`; migrations `V21`–`V24`; `.env.example`.
- GitHub ownership/scoring/API: `ProcessingLifecycleService`, `GitHubProfile`, `GitHubScoringService`, `MatchInspectionResponse`.
- Lương: `CreateJobRequest`, `Job`, `JobResponse`, `JobService`, `V23`; frontend `money.ts`, API/types/i18n/locales và trang/filter/card liên quan.
- CV/OAuth UI: `frontend/src/app/candidate/cvs/builder/page.tsx`, login/register, profile, `frontend/src/app/oauth/*`, component GitHub.
- Kiểm thử bổ sung: OAuth state, salary validation, frontend money/contracts.
- Tài liệu: `DECISION_LOG.md`, `docs/API_CONTRACT.md`, `docs/IMPLEMENTATION_STATUS.md` và bốn tài liệu mới: báo cáo này, `OAUTH_GITHUB_SETUP.md`, `MANUAL_ACCEPTANCE_20261021.md`, `STARTUP_20261021.md`.

Để xem từng đường dẫn chính xác, dùng `git status --short`; không sửa/xóa file baseline ngoài phạm vi.

## Kiểm tra và kết quả

- Baseline backend: 56 tests passed.
- Baseline frontend contract: 11 passed; TypeScript check passed.
- Worker audit: 8 passed.
- Sau triển khai backend command focused theo hướng dẫn startup: 62 tests passed, 0 failure/error.
- Sau triển khai `npm run test:contracts`: 14 passed.
- Sau triển khai `npx tsc --noEmit`: passed.
- `npm run build`: thất bại do Turbopack không khởi tạo được subprocess khi xử lý `globals.css` (`node process exited before we could connect to it`, exit 0) trong sandbox; không còn lỗi tải Google Fonts vì `next/font/google` đã được thay bằng font stack local/system. Cần chạy build ở môi trường desktop/dev bình thường để loại trừ giới hạn subprocess.
- Không thực hiện browser, OAuth provider round-trip, database migration trên disposable PostgreSQL hoặc PDF/export. Do vậy không đánh dấu acceptance chức năng nào là hoàn tất.
- Một lần chạy suite GitHub cũ mở rộng gặp lỗi: fixture kỳ vọng chấm điểm profile mặc định unverified và dùng CV draft trái với `ConfirmedCvInput`; một test cache khởi tạo Java HttpClient bị chặn selector loopback trong sandbox. Không nới production gates hay xóa test. Đây là phát hiện ở suite chưa chạy trong baseline nên không gắn nhãn chắc chắn là regression/pre-existing; cần cập nhật fixture theo contract hiện hành và chạy trong môi trường phù hợp.

Lệnh Maven cần `-DargLine` javaagent để tránh self-attach treo trong sandbox. Lệnh cụ thể có trong `STARTUP_20261021.md`.

## Giới hạn và bước nghiệm thu còn lại

- Cần đăng ký Google/GitHub OAuth apps và nhập secrets trực tiếp vào môi trường local; sau đó làm checklist round-trip thật.
- Cần tạo database disposable riêng, review migrations V21–V24 rồi chạy Flyway và kiểm tra schema/dữ liệu lịch sử. Không động vào DB hiện hữu.
- Cần browser QA responsive/keyboard/error states và kiểm tra builder/template; kiểm tra PDF nếu chức năng export được bật.
- Cần xác minh quy trình scan lặp, rate limits/partial errors và persistence evidence trong dịch vụ thật.
- Full end-to-end Phase 0–10 vẫn `NOT_STARTED` theo tiêu chí SSOT. Không có tuyên bố production-ready.





## Danh sách trạng thái Git đầy đủ tại thời điểm lập báo cáo

Danh sách dưới đây bao gồm cả thay đổi/untracked đã tồn tại từ remediation trước; Git status baseline đã được ghi nhận trước chỉnh sửa. Không có đường dẫn bị xóa. Đây là inventory nguyên trạng để review, không gán toàn bộ quyền tác giả cho lượt này.

``text
 M .env.example
 M DECISION_LOG.md
 M README.md
 M ai-worker/app/services/structured_cv_validator.py
 M ai-worker/tests/test_fallback_orchestration.py
 M backend/src/main/java/com/platform/recruitment/ai/AiProcessingController.java
 M backend/src/main/java/com/platform/recruitment/ai/ProcessingLifecycleService.java
 M backend/src/main/java/com/platform/recruitment/application/ApplicationResponse.java
 M backend/src/main/java/com/platform/recruitment/application/ApplicationService.java
 M backend/src/main/java/com/platform/recruitment/auth/AuthService.java
 M backend/src/main/java/com/platform/recruitment/candidate/CandidateMatchController.java
 M backend/src/main/java/com/platform/recruitment/cv/CVRepository.java
 M backend/src/main/java/com/platform/recruitment/cv/CVService.java
 M backend/src/main/java/com/platform/recruitment/document/Documents.java
 M backend/src/main/java/com/platform/recruitment/embedding/PgvectorCosineSimilarity.java
 M backend/src/main/java/com/platform/recruitment/github/GitHubProfile.java
 M backend/src/main/java/com/platform/recruitment/job/CreateJobRequest.java
 M backend/src/main/java/com/platform/recruitment/job/Job.java
 M backend/src/main/java/com/platform/recruitment/job/JobResponse.java
 M backend/src/main/java/com/platform/recruitment/job/JobService.java
 M backend/src/main/java/com/platform/recruitment/matching/GitHubScoringService.java
 M backend/src/main/java/com/platform/recruitment/matching/JobMatchingPolicyDto.java
 M backend/src/main/java/com/platform/recruitment/matching/JobMatchingPolicyService.java
 M backend/src/main/java/com/platform/recruitment/matching/MatchInspectionResponse.java
 M backend/src/main/java/com/platform/recruitment/matching/MatchingEngineService.java
 M backend/src/main/java/com/platform/recruitment/screening/ScreeningController.java
 M backend/src/main/java/com/platform/recruitment/worker/JobQueue.java
 M backend/src/main/java/com/platform/recruitment/worker/PipelineWorker.java
 M backend/src/main/resources/application.yml
 M backend/src/test/java/com/platform/recruitment/CandidateCvConfirmationIntegrationTest.java
 M backend/src/test/java/com/platform/recruitment/CandidateCvDraftAndEvidenceIntegrationTest.java
 M backend/src/test/java/com/platform/recruitment/CandidateCvProcessingRuntimeAuditTest.java
 M backend/src/test/java/com/platform/recruitment/EndToEndCoreProductFlowIntegrationTest.java
 M backend/src/test/java/com/platform/recruitment/RealUploadToReviewIntegrationTest.java
 M backend/src/test/java/com/platform/recruitment/SystemPerformanceAndConcurrencyTest.java
 M docs/API_CONTRACT.md
 M docs/IMPLEMENTATION_STATUS.md
 M frontend/.gitignore
 M frontend/package.json
 M frontend/src/app/candidate/applications/page.tsx
 M frontend/src/app/candidate/cvs/builder/page.tsx
 M frontend/src/app/candidate/profile/page.tsx
 M frontend/src/app/globals.css
 M frontend/src/app/jobs/[id]/page.tsx
 M frontend/src/app/jobs/page.tsx
 M frontend/src/app/layout.tsx
 M frontend/src/app/login/page.tsx
 M frontend/src/app/page.tsx
 M frontend/src/app/recruiter/jobs/[id]/page.tsx
 M frontend/src/app/recruiter/jobs/new/page.tsx
 M frontend/src/app/recruiter/page.tsx
 M frontend/src/app/register/page.tsx
 M frontend/src/components/application/QuickApplyModal.tsx
 M frontend/src/components/jobs/JobCard.tsx
 M frontend/src/components/recruiter/GitHubAssessmentCard.tsx
 M frontend/src/components/recruiter/JobMatchingPolicyModal.tsx
 M frontend/src/lib/api.ts
 M frontend/src/lib/i18n.ts
 M frontend/src/locales/en.ts
 M frontend/src/locales/vi.ts
 M frontend/src/types/index.ts
?? PROJECT_CONTEXT_AUDIT.json
?? PROJECT_CONTEXT_AUDIT.md
?? ai-worker/tests/test_audit_grounding_regressions.py
?? backend/AdminAuditLog-bytecode.txt
?? backend/src/main/java/com/platform/recruitment/auth/OAuthAccount.java
?? backend/src/main/java/com/platform/recruitment/auth/OAuthController.java
?? backend/src/main/java/com/platform/recruitment/auth/OAuthFlowException.java
?? backend/src/main/java/com/platform/recruitment/auth/OAuthLoginState.java
?? backend/src/main/java/com/platform/recruitment/auth/OAuthLoginTicket.java
?? backend/src/main/java/com/platform/recruitment/auth/OAuthPendingRegistration.java
?? backend/src/main/java/com/platform/recruitment/auth/OAuthRepositories.java
?? backend/src/main/java/com/platform/recruitment/auth/OAuthService.java
?? backend/src/main/java/com/platform/recruitment/cv/ConfirmedCvInput.java
?? backend/src/main/java/com/platform/recruitment/matching/ScreeningCvAdapter.java
?? backend/src/main/resources/db/migration/V21__add_oauth_identity_and_login_flow.sql
?? backend/src/main/resources/db/migration/V22__track_github_account_ownership.sql
?? backend/src/main/resources/db/migration/V23__explicit_job_salary_terms.sql
?? backend/src/main/resources/db/migration/V24__add_oauth_email_completion.sql
?? backend/src/test/java/com/platform/recruitment/AuditCvLifecycleRegressionTest.java
?? backend/src/test/java/com/platform/recruitment/AuditDocumentAccessSqlTest.java
?? backend/src/test/java/com/platform/recruitment/AuditRemediationRegressionTest.java
?? backend/src/test/java/com/platform/recruitment/AuditScreeningPipelineRegressionTest.java
?? backend/src/test/java/com/platform/recruitment/auth/OAuthServiceStateTest.java
?? backend/src/test/java/com/platform/recruitment/job/CreateJobSalaryValidationTest.java
?? backend/src/test/java/com/platform/recruitment/matching/ScreeningCvAdapterTest.java
?? docker-compose.remediation.yml
?? docs/BAO_CAO_BTVN3_AGENT_DAT_VE.pdf
?? docs/HUONG_DAN_CHAY_BAN_SUA.md
?? docs/IMPLEMENTATION_REPORT_20261021.md
?? docs/MANUAL_ACCEPTANCE_20261021.md
?? docs/OAUTH_GITHUB_SETUP.md
?? docs/REMEDIATION_API_CONTRACT.md
?? docs/REMEDIATION_INTEGRATION_REPORT_20261019.md
?? docs/REMEDIATION_VALIDATION.md
?? docs/STARTUP_20261021.md
?? docs/history/IMPLEMENTATION_STATUS_before_approved_remediation.md
?? frontend/.env.example
?? frontend/pnpm-lock.yaml
?? frontend/pnpm-workspace.yaml
?? frontend/src/app/oauth/callback/page.tsx
?? frontend/src/app/oauth/complete/page.tsx
?? frontend/src/lib/money.ts
?? frontend/tests/api-contracts.test.mjs
?? frontend/tests/money.test.mjs
?? package-lock.json
?? package.json
?? scripts/Import-MidcvEnv.ps1
````
