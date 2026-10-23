# Báo cáo tích hợp remediation MidCV — 19/10/2026

## Phạm vi và baseline

- Project root đã xác minh: `C:\Users\Khang\OneDrive\Desktop\SE121\ai-recruitment-platform`.
- Git baseline: branch `master`, HEAD `1c171a24bc4c1374ddef19f33306293135380da8`. Trước tích hợp không có tracked diff; không stage, commit, đổi branch, push, tạo PR hoặc deploy.
- Bộ tài nguyên chuẩn được chọn: `can_them_vao/MidCV_Approved_Remediation_20261019/MidCV_Approved_Remediation/`. Không có ZIP trong cây tài nguyên thực tế. Ba bản sao bên ngoài của `changes.patch`, `HUONG_DAN_CHAY_VA_AP_DUNG.md` và `THAY_DOI_CHI_TIET.md` giống hệt bản trong bundle theo SHA-256. Chỉ áp dụng patch tại project root; không sao chép project `midcv/` lồng vào repo và không sửa `can_them_vao/`.
- Manifest ghi 32 file sửa, 17 file thêm, 0 file xóa. SHA-256 của cả 32 baseline file khớp manifest sau khi chuẩn hóa CRLF của Windows thành LF. `git apply --check` thành công khi loại trừ `frontend/next-env.d.ts`, vốn đã tồn tại từ trước dưới dạng file Next.js bị ignore. Patch đã áp dụng thành công cho 32 file sửa và 16 file thêm.
- Phân loại trước khi áp dụng: 32 file sửa và 16 addition còn thiếu được xếp `NOT INTEGRATED`; `frontend/next-env.d.ts` được xếp `ALREADY PRESENT` nhưng khác nội dung generated của bundle nên được giữ nguyên. Không có tracked diff local nào cần merge; không có mục nào bị `BLOCKED BY AN UNRESOLVED CONFLICT`.

## Nội dung đã tích hợp

| Khu vực | File và symbol chính | Thay đổi | Kiểm chứng liên quan |
|---|---|---|---|
| Phân quyền và vòng đời CV | `AiProcessingController`, `ProcessingLifecycleService`, `CVService`, `CVRepository`, `ConfirmedCvInput` | Chặn xử lý CV/JD legacy sai chủ sở hữu; chỉ cho matching dùng phiên bản CV `CONFIRMED`; xác nhận kiểm tra job đang chạy, trạng thái lỗi và nội dung nghề nghiệp; GET hồ sơ confirmed không ghi lại version lịch sử. | `AuditCvLifecycleRegressionTest`, `AuditRemediationRegressionTest`, `CandidateCvConfirmationIntegrationTest` |
| Preview, nộp đơn và snapshot | `CandidateMatchController`, `ApplicationService`, `ApplicationResponse`, `MatchingEngineService` | Preview không tạo application/kết quả lưu; application gắn với `appliedCvVersion`; snapshot dùng structured content và raw text của đúng version đã nộp; lỗi matching được truyền ra thay vì nuốt lỗi hoặc backfill dữ liệu lịch sử. | `AuditRemediationRegressionTest`, `CandidateCvDraftAndEvidenceIntegrationTest`, `EndToEndCoreProductFlowIntegrationTest` |
| Quyền truy cập tài liệu và scoring policy | `Documents`, `JobQueue`, `JobMatchingPolicyDto`, `JobMatchingPolicyService`, `MatchingEngineService`, `JobMatchingPolicyModal.tsx` | Kiểm tra tenant theo quan hệ company/recruiter thực; dùng trọng số đã lưu và giới hạn GitHub 15%; dữ liệu GitHub thiếu/private/không phù hợp giữ hành vi trung tính; không hợp nhất hai scoring purpose. | `AuditDocumentAccessSqlTest` (SQL trên H2), `AuditRemediationRegressionTest` |
| HR screening | `ScreeningController`, `PipelineWorker`, `ScreeningCvAdapter` | Screening vẫn dùng tài liệu do HR sở hữu, không giả tạo candidate/application/confirmation; tạo embedding và metadata trước matching; adapter chuyển JSON extraction sang schema scoring mà không ghi đè snapshot; JD được ràng buộc theo nội dung hiện tại. | `AuditScreeningPipelineRegressionTest`, `ScreeningCvAdapterTest` |
| Grounding AI | `structured_cv_validator.py` | Loại kỹ năng không có căn cứ trong raw text; GPA/thang điểm không có nguồn thì bỏ hoặc để null kèm warning; không áp dụng grounding lên phần user review. | `test_audit_grounding_regressions.py` |
| Frontend và hợp đồng | `frontend/src/app/candidate/applications/page.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/index.ts`, `frontend/tests/api-contracts.test.mjs` | Hiển thị CV version thực hoặc unknown; nhận số lượng re-score bằng số, kể cả 0, từ chối payload sai; dùng `NEXT_PUBLIC_API_URL` theo dạng origin. | 11 contract tests và `npx tsc --noEmit` |
| Tài liệu và chạy local | `DECISION_LOG.md`, `docs/API_CONTRACT.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/HUONG_DAN_CHAY_BAN_SUA.md`, Compose riêng và script import env | Ghi DEC-08 trước thay đổi; cập nhật contract/trạng thái; thêm hướng dẫn DB dev tách biệt, không chạy database trong lượt này. | Diff, kiểm tra cấu hình Compose |

## Danh sách file sửa

| File | Ghi chú |
|---|---|
| `.gitignore` | Thêm ngoại lệ để `frontend/.env.example` không bị nested `frontend/.gitignore` bỏ qua. |
| `DECISION_LOG.md` | Thêm DEC-08 theo phê duyệt remediation đã có. |
| `README.md` | Hướng dẫn cài frontend dùng pnpm lockfile hiện có; giữ biến API đúng. |
| `ai-worker/app/services/structured_cv_validator.py` | Grounding kỹ năng/GPA. |
| `ai-worker/tests/test_fallback_orchestration.py` | Cập nhật fixture theo grounding contract. |
| `backend/src/main/java/com/platform/recruitment/ai/AiProcessingController.java` | Ownership cho legacy processing. |
| `backend/src/main/java/com/platform/recruitment/ai/ProcessingLifecycleService.java` | Kiểm tra actor/owner cho CV và JD legacy. |
| `backend/src/main/java/com/platform/recruitment/application/ApplicationResponse.java` | Trả version CV thực/unknown. |
| `backend/src/main/java/com/platform/recruitment/application/ApplicationService.java` | Gắn application, kết quả và snapshot với version đã nộp; truyền lỗi. |
| `backend/src/main/java/com/platform/recruitment/candidate/CandidateMatchController.java` | Preview không ghi application/result. |
| `backend/src/main/java/com/platform/recruitment/cv/CVRepository.java` | Khóa parent CV cho lifecycle update. |
| `backend/src/main/java/com/platform/recruitment/cv/CVService.java` | Quy tắc confirm, draft và đọc confirmed profile. |
| `backend/src/main/java/com/platform/recruitment/document/Documents.java` | Authorization theo tenant/company thực. |
| `backend/src/main/java/com/platform/recruitment/embedding/PgvectorCosineSimilarity.java` | Chặn cosine giữa embedding không cùng dimension/model. |
| `backend/src/main/java/com/platform/recruitment/matching/JobMatchingPolicyDto.java` | Validate matching policy. |
| `backend/src/main/java/com/platform/recruitment/matching/JobMatchingPolicyService.java` | Validate/lưu policy và propagate lỗi tính điểm. |
| `backend/src/main/java/com/platform/recruitment/matching/MatchingEngineService.java` | Confirmed CV input, policy weights, preview/snapshot semantics. |
| `backend/src/main/java/com/platform/recruitment/screening/ScreeningController.java` | Chọn JD screening theo nội dung hiện tại. |
| `backend/src/main/java/com/platform/recruitment/worker/JobQueue.java` | Authorization query cho document/job. |
| `backend/src/main/java/com/platform/recruitment/worker/PipelineWorker.java` | Embedding/screening schema adapter và legacy MATCH delegation. |
| `backend/src/test/java/com/platform/recruitment/CandidateCvConfirmationIntegrationTest.java` | Regression confirmation. |
| `backend/src/test/java/com/platform/recruitment/CandidateCvDraftAndEvidenceIntegrationTest.java` | Regression draft/evidence. |
| `backend/src/test/java/com/platform/recruitment/CandidateCvProcessingRuntimeAuditTest.java` | Điều chỉnh audit assertions. |
| `backend/src/test/java/com/platform/recruitment/EndToEndCoreProductFlowIntegrationTest.java` | Điều chỉnh contract version CV. |
| `backend/src/test/java/com/platform/recruitment/RealUploadToReviewIntegrationTest.java` | Điều chỉnh fixture. |
| `backend/src/test/java/com/platform/recruitment/SystemPerformanceAndConcurrencyTest.java` | Điều chỉnh fixture version CV. |
| `docs/API_CONTRACT.md` | Cập nhật response version CV. |
| `docs/IMPLEMENTATION_STATUS.md` | Phân biệt test local với acceptance live. |
| `frontend/.gitignore` | Bỏ ignore cho safe `.env.example`. |
| `frontend/package.json` | Thêm script `test:contracts`; không đổi dependency. |
| `frontend/src/app/candidate/applications/page.tsx` | Version thực/unknown; bỏ một trailing space có sẵn trong patch. |
| `frontend/src/components/recruiter/JobMatchingPolicyModal.tsx` | Hiển thị tín hiệu phụ theo saved policy weight. |
| `frontend/src/lib/api.ts` | Kiểm tra count và map applied CV version. |
| `frontend/src/types/index.ts` | Kiểu version CV có thể unknown. |

## Danh sách file thêm

| File | Ghi chú |
|---|---|
| `ai-worker/tests/test_audit_grounding_regressions.py` | Test grounding tổng hợp. |
| `backend/src/main/java/com/platform/recruitment/cv/ConfirmedCvInput.java` | DTO/input của confirmed CV. |
| `backend/src/main/java/com/platform/recruitment/matching/ScreeningCvAdapter.java` | Adapter riêng cho scoring input của HR screening. |
| `backend/src/test/java/com/platform/recruitment/AuditCvLifecycleRegressionTest.java` | Regression CV lifecycle/ownership. |
| `backend/src/test/java/com/platform/recruitment/AuditDocumentAccessSqlTest.java` | Regression authorization SQL. |
| `backend/src/test/java/com/platform/recruitment/AuditRemediationRegressionTest.java` | Regression preview/version/scoring policy. |
| `backend/src/test/java/com/platform/recruitment/AuditScreeningPipelineRegressionTest.java` | Regression pipeline screening. |
| `backend/src/test/java/com/platform/recruitment/matching/ScreeningCvAdapterTest.java` | Test adapter schema. |
| `docker-compose.remediation.yml` | PostgreSQL dev riêng, port 55432 và volume riêng; chưa khởi chạy. |
| `docs/HUONG_DAN_CHAY_BAN_SUA.md` | Startup/test guide; dùng pnpm vì đây là package manager của destination. |
| `docs/REMEDIATION_API_CONTRACT.md` | Contract bổ sung cho remediation. |
| `docs/REMEDIATION_VALIDATION.md` | Phân loại bằng chứng lịch sử của bundle. |
| `docs/history/IMPLEMENTATION_STATUS_before_approved_remediation.md` | Lưu trạng thái lịch sử trước remediation. |
| `docs/REMEDIATION_INTEGRATION_REPORT_20261019.md` | Báo cáo kết quả thực tế của lượt tích hợp này. |
| `frontend/.env.example` | Ví dụ `NEXT_PUBLIC_API_URL`; không chứa secret. |
| `frontend/tests/api-contracts.test.mjs` | 11 contract tests phía frontend. |
| `scripts/Import-MidcvEnv.ps1` | Import KEY=VALUE an toàn, không in giá trị. |

**Không có file source nào bị xóa.** Bundle liệt kê thêm `frontend/next-env.d.ts`; file này đã tồn tại trước, bị ignore theo quy tắc Next.js và chứa import `./.next/dev/types/...`, khác bản bundle tạo cho `.next/types`. Đã giữ nguyên file hiện có; build thử không làm thay đổi nội dung của nó.

## Sai khác và thay đổi local được giữ nguyên

- Destination có `frontend/pnpm-lock.yaml` và `frontend/pnpm-workspace.yaml`, nhưng không có `frontend/package-lock.json`; vì vậy đổi `npm ci` trong README và startup guide thành `corepack pnpm install --frozen-lockfile`. Không sửa lockfile. `corepack pnpm --version` hiện không tải được pnpm vì DNS không truy cập được `registry.npmjs.org`; dependencies đã có trong `frontend/node_modules` nên các lệnh test/build vẫn chạy được.
- Thêm `!.env.example` vào `frontend/.gitignore` để safe template trong manifest không bị quy tắc `.env*` che khỏi Git status.
- Loại bỏ trailing whitespace trên một dòng trong `frontend/src/app/candidate/applications/page.tsx` sau khi patch báo lỗi whitespace.
- `frontend/next-env.d.ts` được bảo toàn, không ghi đè. Do đó 16/17 addition trong bundle được áp dụng; integration report này là artifact mới thay cho file generated đã có sẵn.
- Các thay đổi untracked đã có trước phiên này vẫn còn: `PROJECT_CONTEXT_AUDIT.json`, `PROJECT_CONTEXT_AUDIT.md`, `docs/BAO_CAO_BTVN3_AGENT_DAT_VE.pdf`, `frontend/pnpm-lock.yaml`, `frontend/pnpm-workspace.yaml`, `package.json`, `package-lock.json` và toàn bộ `can_them_vao/`.
- Không đổi `.env`, `.env.local`, credentials, uploads, database hoặc Docker volume. Không tạo migration. Không đọc/in giá trị secret. Không chạy Docker service.

## Lệnh và kết quả kiểm chứng trong destination

| Lệnh | Working directory | Kết quả |
|---|---|---|
| `git apply --check can_them_vao/MidCV_Approved_Remediation_20261019/MidCV_Approved_Remediation/changes.patch` | Project root | Exit 1 duy nhất vì `frontend/next-env.d.ts` đã tồn tại trong working directory; file này đã được kiểm tra là generated file có sẵn và được bảo toàn. |
| `git apply --check --exclude=frontend/next-env.d.ts can_them_vao/MidCV_Approved_Remediation_20261019/MidCV_Approved_Remediation/changes.patch` | Project root | Exit 0. |
| `git apply --exclude=frontend/next-env.d.ts can_them_vao/MidCV_Approved_Remediation_20261019/MidCV_Approved_Remediation/changes.patch` | Project root | Exit 0; có một trailing-space warning đã được sửa. |
| `mvn "-DargLine=-javaagent:C:\Users\Khang\.m2\repository\net\bytebuddy\byte-buddy-agent\1.14.18\byte-buddy-agent-1.14.18.jar" "-Dtest=AuditRemediationRegressionTest,AuditDocumentAccessSqlTest,AuditCvLifecycleRegressionTest,AuditScreeningPipelineRegressionTest,ScreeningCvAdapterTest,CandidateCvConfirmationIntegrationTest,CandidateCvDraftAndEvidenceIntegrationTest,EndToEndCoreProductFlowIntegrationTest" test` | `backend/` | Exit 0; 56 passed, 0 failed. JDK 21 compile lại 213 main và 80 test source. Các test dùng Mockito/H2, không phải PostgreSQL acceptance. |
| `npm run test:contracts` | `frontend/` | Exit 0; 11 passed. |
| `npx tsc --noEmit` | `frontend/` | Exit 0. |
| `npm run build` | `frontend/` | Exit 1; Next.js không tải được Google Fonts Inter/Newsreader từ `fonts.googleapis.com`. Đây là giới hạn mạng của môi trường; không thay font/kiến trúc. |
| `python -m pytest tests/test_audit_grounding_regressions.py -q` | `ai-worker/` | Exit 0; 8 passed, dùng system Python 3.11.9. Repo `.venv` không có pytest. |
| `python -m pytest tests/test_openai_compatible_client.py -q` | `ai-worker/` | Exit 0; 21 passed. |
| `python -m pytest tests/test_fallback_orchestration.py -p no:asyncio -q -k "test_valid_json_parses_and_validates or test_valid_json_wrapped_in_code_fences or test_malformed_json_syntax_detected or test_invalid_data_types_detected or test_dual_alias_canonical_schema_compatibility or test_sanitize_validation_error_redacts_sensitive_data"` | `ai-worker/` | Exit 0; 6 passed, 16 deselected. Async fallback/repair assertions không nằm trong kết quả này. |
| `python -m pytest tests/test_fallback_orchestration.py -q` | `ai-worker/` | Không hoàn tất; test đầu tiên bị stall trong asyncio trên Python hiện có và được ngắt. Một `asyncio.run(asyncio.sleep(0))` độc lập cũng không kết thúc. Không có assertion failure được ghi nhận; async fallback verification còn pending. |
| `docker compose -f docker-compose.remediation.yml config --quiet` | Project root | Thiếu `DATABASE_PASSWORD` trong root `.env`, exit 1. Với biến placeholder tạm thời, config parse exit 0; không khởi động service/container. |
| `git diff --check` | Project root | Exit 0. Không stage file. |

Maven thử ban đầu bị chặn bởi class bytecode cũ hỏng trong ignored `backend/target` và Byte Buddy self-attach bị môi trường chặn. Đã compile lại source tree mà không chạy `mvn clean` hoặc xóa target, nạp agent Byte Buddy có sẵn, rồi chạy lại 56 regression tests thành công. Để ép full compile, metadata `LastWriteTime` của 293 Java source/test files được làm mới tạm thời; sau lần compile bị ngắt, chúng được đặt về cùng một mốc sớm hơn output build. Byte nội dung không đổi và Git diff không ghi nhận thay đổi ở các file ngoài danh sách trên, nhưng timestamp gốc riêng của từng file không được khôi phục chính xác.

## Hướng dẫn chạy theo cấu hình destination

1. Tạo root `.env` từ `.env.example` nếu chưa có và điền giá trị local cần thiết. Không đưa credentials vào Git.
2. Nếu muốn dùng database dev cô lập, import env rồi kiểm tra Compose trước khi tự khởi động: `. .\scripts\Import-MidcvEnv.ps1`; `docker compose -p midcv-remediation -f docker-compose.remediation.yml config --quiet`; sau đó có thể chạy `docker compose -p midcv-remediation -f docker-compose.remediation.yml up -d postgres`. DB này dùng port 55432/volume riêng. Lượt tích hợp này chỉ parse config, không bật DB.
3. Worker: import env ở root, chuyển vào `ai-worker`, tạo/activate Python venv, cài `requirements.txt`, chạy `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`.
4. Backend: import env, chuyển vào `backend`, chạy `mvn -DskipTests package`, rồi `mvn spring-boot:run`.
5. Frontend: dùng `frontend/.env.local` với `NEXT_PUBLIC_API_URL=http://localhost:8080`; frontend client tự thêm `/api/v1`. Cài dependency bằng `corepack pnpm install --frozen-lockfile` theo pnpm lockfile hiện tại, rồi `npm run dev` hoặc `npm run build` và `npm run start`.

Chưa nghiệm thu PostgreSQL/pgvector live, provider/LLM thật, OAuth, browser E2E hoặc luồng 15 bước chạy thật. Các test mock/H2 và frontend build không thay thế những kiểm chứng đó; không kết luận toàn hệ thống đã sẵn sàng production.
