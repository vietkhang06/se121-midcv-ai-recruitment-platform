# F01 — Baseline và map UC theo source hiện tại

Nguồn định danh UC: `docs/phase-0/09_USE_CASES.md`, không tự đặt lại số UC.

Baseline gốc: ZIP đính kèm `se121-midcv-ai-recruitment-platform-master(3).zip`.
SHA-256 archive và inventory từng file ở `task-evidence/20261030/source-baseline.json`.
Archive comment chứa `ba33cccbf11ed4a47631ab735af60c2c9b0451a1`; đây là commit hint do archive cung cấp, **không chứng minh HEAD/branch/working tree ở máy người dùng**.

Chạy `scripts/Capture-MidcvBaseline.ps1` trong Git checkout thật để khóa HEAD, branch, status và hash tracked files. Các tài liệu audit cũ có chữ WORKING/COMPLETED là tài liệu lịch sử, không được dùng thay cho live evidence của bản này.

Quy ước: “Có source” chỉ mô tả route/service tìm thấy; không tương đương “đã nghiệm thu”. “Regression” là test có thực chạy, nhiều test dùng mock; không đại diện UI/DB/provider thật.

Tất cả endpoint trong bảng có tiền tố `/api/v1`.

| UC gốc | Route/API hiện có | Nơi triển khai chính | Liên quan task | Trạng thái kiểm chứng bản giao |
|---|---|---|---|---|
| UC-01 Register | `POST /auth/register/candidate`, `/auth/register/recruiter`; verify/resend | `auth/AuthController`, `AuthService`; `/register`, `AuthModal` | A02/A03 | Có source; regression service. SMTP/provider thật chưa nghiệm thu. |
| UC-02 Login | `POST /auth/login`, `/auth/refresh`, `/auth/logout`; session API; OAuth start/callback/exchange | `AuthService`, `AuthSessionService`, `SessionController`, `OAuthController`; `AuthContext`, `lib/api.ts` | A01–A03 | Regression loại/expiry/rotation/replay và browser state. HTTP PostgreSQL/OAuth thật chờ chạy. |
| UC-03 Manage Candidate Profile | `GET/PUT /candidate/profile`; draft/confirm CV | `CandidateController`, `CandidateService`, `CVService`; `/candidate/profile`, review modal | D03 | Có source; hồi quy CV. UI lưu và reload cần live acceptance. |
| UC-04 Upload CV | `POST /candidate/cvs/upload`; status, events, review, confirm | `CVController`, `CVService`, `Documents`, `CvProcessingSseService`; upload/review modal | D01/D02/R01 | Test file/PDF/DOCX với JDBC mock và parser thật. HTTP/rollback DB/OCR/LLM thật chưa nghiệm thu. |
| UC-05 Search Jobs | `GET /jobs` phân trang; catalog và filter phía client | `JobController`, `JobService`, `RealApiClient.fetchJobCatalog`; `/jobs` | Rà ghost UI | Catalog nhiều trang có contract test; dữ liệu live/browser chờ chạy. |
| UC-06 View Job | `GET /jobs/{id}` | `JobService.mapToResponse`; `/jobs/[id]` | D03 | Có source, regression public access. Không khẳng định đã mở UI với live DB. |
| UC-07 Apply Job | `POST /candidate/applications`; `GET /candidate/applications` | `ApplicationController`, `ApplicationService`; `QuickApplyModal` | D03 | Có source; không chạy mới luồng upload→confirm→apply toàn stack. |
| UC-08 Create Job | `POST /jobs/draft` | `JobController`, `JobService`; `/recruiter/jobs/new` | D03 | Có source; cần nghiệm thu HR/company/DB thật. |
| UC-09 Edit Job | `PUT /jobs/{id}` | `JobController.updateJob`, `JobService.updateJob` | D03 | API tồn tại; bảng này không xác nhận UI có form sửa đầy đủ. |
| UC-10 Publish Job | `POST /jobs/{id}/publish`, `/close` | `JobService`, suspension guard; recruiter jobs pages | D03 | Có source; kiểm tra company VERIFIED/ACTIVE thật còn chờ. |
| UC-11 View Applications | `GET /recruiter/jobs/{jobId}/applications` và `/ranked` | `ApplicationController`, `ApplicationService` | D03 | Có source; quan hệ và phân quyền cần regression HTTP thật. |
| UC-12 View Candidate | `GET /recruiter/applications/{applicationId}` | `ApplicationService`; `/recruiter/applications/[id]` | D03 | Có source; sửa nút copy link. Chưa chạy browser với ứng viên thật. |
| UC-13 Run Matching | `POST /matching/jobs/{jobId}/candidates/{candidateId}`; preview `/candidate/match/{jobId}` | `MatchingController`, `MatchingEngineService`, `CandidateMatchController` | D03 | Transaction authorization/mapping được sửa; không chạy mới embeddings/LLM/pgvector thật. |
| UC-14 View Ranking | `GET /matching/jobs/{jobId}/rankings` | `CandidateRankingService`, `MatchResultRepository`; recruiter ranking page | D03 | Fetch contract regression; HTTP có fixture lazy chuẩn bị, chưa chạy live. |
| UC-15 View Matching Explanation | `GET /matching/applications/{id}/inspection` | `MatchingController`, `MatchingEngineService.getMatchInspection`; detailed match UI | D03 | Authorization/mapping trong transaction; HTTP thật chưa nghiệm thu. |

`TaskHttpAcceptanceTest` có fixture DB cho kiểm tra OSIV, **không** được dùng để khẳng định matching bằng AI trên dữ liệu tuyển dụng thật đã chạy.

## Task bổ sung và API chính

| Task | API/phần phụ trách | Kết luận hiện tại |
|---|---|---|
| F01 | Manifest source, bảng này, `Capture-MidcvBaseline.ps1` | Khóa ZIP gốc được; HEAD thực còn chờ capture tại checkout. |
| A01 | `AuthSessionService`, `JwtTokenProvider`, `JwtAuthenticationFilter` | Source và regression; HTTP thật chờ. |
| A02 | `SessionController`, `PasswordResetService`, `SmtpEmailService`, `SessionList` | Source và regression; SMTP live chờ. |
| A03 | `OAuthController`, `OAuthService`, `OAuthStateConsumer`, callback UI | Source/security regression; consent/callback thật chờ. |
| D01 | V29, `DisposableMigrationValidationTest`, helper PowerShell | Mã compile; PostgreSQL fresh/upgrade chưa chạy. |
| D02 | `Documents.upload`, `RequestIdFilter`, HTTP acceptance fixture | Kịch bản tái hiện/rollback mới chưa chạy. Không tự kết luận nguyên nhân upload500 gốc. |
| D03 | OSIV=false, controller transaction, ranking transaction | Source và hồi quy liên quan; HTTP fixture mới chưa chạy. |
| R01 | DB event cursor, auth recheck, client reconnect/abort | Parser/reconnect/regression qua; restart và lease live chờ. |
