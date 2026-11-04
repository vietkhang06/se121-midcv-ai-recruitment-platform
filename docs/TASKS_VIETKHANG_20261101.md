# SE121 — Source update cho các task Việt Khang (01/11/2026)

Đây là danh sách file và hướng kiểm thử từ source ZIP đã nhận. Các task nghiệp vụ Q01–Q03, N01–N02 đã có code đáng kể trong bản V30; phần tiếp tục này giữ nguyên implementation đó, bổ sung security/deployment/backup/E2E/release evidence để hoàn thành các gap trong bảng task.

## 1. Nội dung trong gói patch

| Task | File mới/sửa trong patch | Thay đổi |
|---|---|---|
| Q01 | `backend/src/test/java/com/platform/recruitment/TaskHttpAcceptanceTest.java`; `backend/src/main/java/com/platform/recruitment/admin/dto/CompanyReviewRequest.java` | Bổ sung HTTP lifecycle HR submit → Admin review/request changes → HR sửa/resubmit → Admin approve và đối chiếu 5 audit events. Sửa DTO để `status` chỉ bắt buộc ở generic transition (service đã validate), không bắt buộc ở canonical action endpoints. Giữ nguyên `SuspensionAppealService` V30 có row lock/audit; regression còn suspension khác vẫn giữ target SUSPENDED. |
| Q02 | `backend/src/test/java/com/platform/recruitment/TaskHttpAcceptanceTest.java` | Bổ sung HTTP test đối soát `totalElements` của users/jobs/reports/taxonomy/audit với SQL count và kiểm tra HR/Candidate bị chặn các API Admin. Giữ nguyên `AdminService` V30. |
| Q03 | `backend/src/main/java/com/platform/recruitment/ai/AiClient.java`; `backend/src/test/java/com/platform/recruitment/ai/AiSettingsPersistenceTest.java` | Giữ scope `BACKEND_SCREENING`, worker env primary/fallback, trace requested/resolved model và redaction. Bổ sung fallback từ DB legacy loopback sang `OLLAMA_URL` container-reachable; giữ nguyên URL private đã lưu. Thêm regression cho hai trường hợp; vẫn cần live trace sau config save/restart. |
| N01 | Không ghi đè file nghiệp vụ V30 | `InboxService`, `InboxEmailDispatcher` và `InboxOutboxTransactionTest` đã có transactional outbox, retry/backoff và recipient preference. SMTP thật/Mailpit vẫn cần nghiệm thu. |
| N02 | `backend/src/test/java/com/platform/recruitment/TaskHttpAcceptanceTest.java` | Giữ nguyên idempotency, changed-body 409, read/unread, block và participant/tenant check; bổ sung HTTP assertion rằng Admin outsider cũng không đọc được chat riêng. |
| S01 | `backend/src/main/java/com/platform/recruitment/config/SecurityConfig.java`; `backend/src/main/resources/application.yml`; `backend/src/main/resources/application-prod.yml`; `backend/src/test/java/com/platform/recruitment/SpringSecurityRbacAndMultiTenantIntegrationTest.java`; `backend/src/test/java/com/platform/recruitment/TaskHttpAcceptanceTest.java`; `docs/SECURITY_HTTP_MATRIX_20261101.md` | CORS exact-origin qua env, cấm wildcard credentialed CORS, thêm PATCH, cho phép health nội bộ; thêm preflight test và HTTP role/token/tenant matrix. |
| Z01 | `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/next.config.ts`, `docker-compose.production.yml`, `Caddyfile`, `.env.production.example`, `scripts/Deploy-MidcvProduction.ps1` | Multi-stage images, healthchecks, persistent volumes, Caddy TLS, deployment log và image pin để rollback. |
| Z02 | `scripts/midcv_backup.py`, `scripts/__init__.py`, `scripts/tests/test_midcv_backup.py`, `.gitignore` | PostgreSQL custom dump + uploads tar + manifest SHA-256 từng file; verify catalog; restore chỉ vào DB và volume mới, không overwrite production. |
| E01 | `frontend/e2e/fullstack-live-acceptance.spec.ts`, `frontend/playwright.config.ts`, `scripts/Test-MidcvRestartPersistence.ps1` | Live login, role/token/tenant checks, browser session, network failure injection và restart persistence probe dùng conversation/message thật. |
| E04 | `docs/releases/RELEASE_ACCEPTANCE_E04_20261101.md` | Checklist 15 UC, P0 gate, business task evidence, independent review và release sign-off; mặc định NOT_VERIFIED/NO-GO. |

Các implementation Q01–Q03/N01–N02 đã có trong ZIP nguồn V30 và được giữ nguyên, không chép đè lại bằng bản code mới. Những đường dẫn của module nghiệp vụ được dẫn ở mục 2 chỉ để bạn đối chiếu trong source hiện tại.

## 2. Nghiệm thu Q01–Q03, N01–N02 đang có trong source

- Q01: `SuspensionAppealService` khóa appeal khi xử lý và ghi audit. HTTP test `businessCompanyOnboardingVerificationChangesAndAudit` xác minh lifecycle HR submit → Admin review/request changes → HR sửa/resubmit → Admin approve và đếm audit events. HTTP test `businessCompanySuspensionAppealAndAudit` xác minh suspend → HR appeal → Admin review/approve. Regression `BusinessTaskRegressionTest.appealApprovalDoesNotClaimActiveWhileAnotherSuspensionRemains` xác minh còn suspension khác thì target vẫn SUSPENDED. Cần chạy các test này qua PostgreSQL/HTTP thật.
- Q02: `AdminPortalController` và `AdminService` xử lý users/jobs/reports/taxonomy/audit. Test HTTP mới trong `TaskHttpAcceptanceTest.businessAdminDataCountsReconcileAcrossUsersJobsReportsTaxonomyAndAudit` dùng SQL đếm users, jobs, reports, taxonomy và audit để đối chiếu `totalElements`, đồng thời kiểm tra HR/Candidate bị từ chối. Cần chạy test trên DB ephemeral; thử thêm thao tác lại report đã resolved/dismissed.
- Q03: Admin scope là backend screening; worker giữ primary/fallback theo environment. `AiClient` dùng `OLLAMA_URL` khi DB còn giá trị loopback legacy của migration (không trỏ về chính container), nhưng vẫn ưu tiên URL private đã lưu. Cần lưu runtime JSON trước/sau, xác nhận không có API key; chạy screening thật, ghi requested/resolved model; restart backend và worker rồi lặp lại.
- N01: `InboxService` tạo notification/outbox trong transaction; `InboxEmailDispatcher` xử lý bằng transaction riêng và retry. H2 transaction tests không chứng minh SMTP thật. Phải stop SMTP/Mailpit, quan sát attempts/next_attempt_at, bật lại và xác nhận sent_at + mail nhận được.
- N02: Chat idempotency cùng clientId/cùng body trả lại message; cùng clientId/khác body phải 409. Chạy hai participant, HR khác tenant và Admin outsider; đánh dấu read, block, restart backend, kiểm tra unread/history còn nguyên.

## 3. Lệnh kiểm thử

Tại root source:

```powershell
# Backend + worker + frontend regression theo script nguồn hiện có
python scripts/Verify-MidcvBusinessTasks.py

# Backend HTTP + PostgreSQL ephemeral/loopback, bao gồm security tenant matrix mới
python scripts/Verify-MidcvBusinessTasks.py --http --port 55439

# Java security filter/CORS unit slice (nếu đã cài Maven/JDK 21)
cd backend
mvn -Dtest=SpringSecurityRbacAndMultiTenantIntegrationTest test

# Backup manifest/path traversal/checksum unit tests (không cần Docker)
cd ..
python -m unittest discover -s scripts/tests -p "test_*.py" -v

# Frontend contract tests/build/E2E; chạy từ frontend
cd frontend
npm ci
npm run test:contracts
npm run build
npm run test:e2e -- fullstack-live-acceptance.spec.ts
```

### Biến môi trường live E2E

Không ghi password vào file `.spec.ts`, Git hay command log. Set các biến trong terminal session riêng:

- `MIDCV_E2E_API_URL`, `MIDCV_E2E_WEB_URL` (tuỳ chọn)
- `MIDCV_E2E_CANDIDATE_EMAIL`, `MIDCV_E2E_CANDIDATE_PASSWORD`
- `MIDCV_E2E_HR_A_EMAIL`, `MIDCV_E2E_HR_A_PASSWORD`
- `MIDCV_E2E_HR_B_EMAIL`, `MIDCV_E2E_HR_B_PASSWORD`
- `MIDCV_E2E_ADMIN_EMAIL`, `MIDCV_E2E_ADMIN_PASSWORD`
- `MIDCV_E2E_HR_A_JOB_ID`, `MIDCV_E2E_HR_A_APPLICATION_ID` (ID thuộc công ty A)

Bài restart cần thêm `MIDCV_E2E_PARTICIPANT_EMAIL`, `MIDCV_E2E_PARTICIPANT_PASSWORD`, `MIDCV_E2E_CONVERSATION_ID`, `MIDCV_E2E_PERSISTENCE_MESSAGE_ID`, rồi chạy:

```powershell
./scripts/Test-MidcvRestartPersistence.ps1 -AllowRestart
```

Script này restart service `backend` của `docker-compose.production.yml` và xác minh message ID có thật trước/sau. Chỉ chạy trên môi trường mà nhóm cho phép restart; không dùng trong giờ hoạt động production.

## 4. Production deploy và backup

Lưu ý quan trọng: backend/worker chạy trong container nên `localhost:11434` bên trong container không phải Ollama trên máy host. Mẫu production dùng `host.docker.internal:11434` thông qua `host-gateway`; trước khi nghiệm thu, phải có Ollama đang chạy và truy cập được từ Docker host/container, đồng thời pull `bge-m3` (embedding) và `OLLAMA_CHAT_MODEL` nếu bật fallback. Nếu dùng máy Ollama riêng, thay cả `OLLAMA_URL` và `OLLAMA_BASE_URL` bằng URL private có thể truy cập từ container. Không expose Ollama port trực tiếp ra Internet.

```powershell
# 1. Copy .env.production.example thành .env.production, điền secret thật.
# 2. Kiểm tra cấu hình; không commit .env.production.
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet

# 3. Deploy; yêu cầu xác nhận rõ đây là host cần triển khai.
./scripts/Deploy-MidcvProduction.ps1 -AllowProduction

# 4. Backup và kiểm tra checksum.
python scripts/midcv_backup.py --env-file .env.production backup
python scripts/midcv_backup.py --env-file .env.production verify --backup-dir backups/midcv_backup_<timestamp>

# 5. Restore thử sang tài nguyên tên mới, không đụng production.
python scripts/midcv_backup.py --env-file .env.production restore --backup-dir backups/midcv_backup_<timestamp> --target-db midcv_recovery_20261101 --target-uploads-volume midcv_recovery_uploads_20261101
```

Script restore cố ý tạo database/volume mới và không tự chuyển backend production sang chúng. Cần attach manifest, `docker compose ps`, health status, logs deploy/rollback, SQL đối chiếu và SHA-256 vào thư mục evidence của release.

## 5. Giới hạn xác minh của bản source này

Trong runtime thực hiện chỉnh sửa, không có Docker CLI, Maven executable, PostgreSQL server hoặc `frontend/node_modules`; vì vậy Docker image build, Maven test, real HTTP/PostgreSQL, SMTP, OAuth, real LLM, process restart và production deployment **chưa được chạy tại đây**. Các file đã được static review và Python backup helper được thiết kế để unit-test độc lập. Chỉ đổi trạng thái task sang DONE sau khi nhóm chạy các lệnh trên và lưu raw evidence thực tế.
