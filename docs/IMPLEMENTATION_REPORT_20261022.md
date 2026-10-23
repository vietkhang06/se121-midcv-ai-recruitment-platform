# Báo cáo tiếp tục triển khai MidCV — 22/10/2026

Báo cáo này ghi nhận kiểm chứng bổ sung trong phiên tiếp tục; các thay đổi sẵn có trong working tree được giữ nguyên. Không stage, commit, push, reset dữ liệu hoặc chạy migration trên DB hiện có.

## Trạng thái hiện tại đã đối chiếu — 22/10/2026

| Yêu cầu | Trạng thái | Kết quả và giới hạn |
|---|---|---|
| API/shared types lint | **Implemented and verified** | Trên 38 file `.ts/.tsx` bị sửa/thêm, cùng một snapshot: **0 ESLint errors, 45 warnings**. Hai file `src/lib/api.ts` và `src/types/index.ts` không còn lỗi hoặc warning. Warnings còn lại được liệt kê trong output lệnh lint; chủ yếu unused symbols/parameters. Không tắt rule. |
| TypeScript và contract tests | **Implemented and verified** | `npx tsc --noEmit` exit 0; `npm run test:contracts` exit 0, **14 passed, 0 failed** sau kiểu CV mới và parser giữ tương thích giá trị technology object, chứng chỉ/ngoại ngữ chuỗi và attachment camel/snake case. |
| Final production build | **Implemented and verified** | Controlled copy `C:\Users\Khang\AppData\Local\Temp\midcv-final-20261022-231638\frontend`; manifest SHA-256 ở `C:\Users\Khang\AppData\Local\Temp\midcv-final-20261022-231638\source-sha256.txt`; **218 input files** được copy và hash đối chiếu với workspace, secrets, dependencies, uploads và generated output loại trừ. `npm ci --no-audit --no-fund --prefer-offline` thêm 368 packages; `npm run build -- --webpack` đạt TypeScript và prerender **33/33 routes**. Đây là snapshot sau các thay đổi frontend cuối. |
| Build tại đường dẫn gốc / EPERM | **Blocked — environment/path still unresolved** | Không lặp lại build lỗi. Bằng chứng hiện có: controlled copy build thành công; lần build gốc trước đó lỗi mkdir trong `frontend/.next`; kết quả chỉ khoanh vùng vào working copy/path/environment, không chứng minh OneDrive là nguyên nhân. Không đổi ACL rộng hoặc tắt security. |
| Backend migration test preparation | **Implemented but not verified against PostgreSQL** | Thêm `DisposableMigrationValidationTest`: fresh Flyway V1–V27; upgrade V20–V27; sau mỗi trường hợp khởi động Spring context với `spring.jpa.hibernate.ddl-auto=validate` và tắt worker ngoài phạm vi kiểm tra. `mvn -o -DskipTests test-compile` exit 0 và class test được tạo. Cần Docker disposable để chạy thật. |
| Disposable PostgreSQL helper | **Implemented but not run** | `scripts/Start-MidcvDisposableDb.ps1` kiểm tra tên container/cổng, chỉ bind `127.0.0.1`, nhận password ẩn, giữ/khôi phục biến môi trường, readiness-check, không tạo volume. `scripts/Test-MidcvDisposableMigrations.ps1` prompt password ẩn rồi chạy fresh và upgrade trong cùng môi trường PowerShell; không ghi password ra file/log/chat. Cổng `55439`, connection URL theo tên DB được in ra, username `midcv_test`. Docker daemon trong phiên Codex vẫn bị từ chối; cần người dùng chạy 2 helper ở terminal Docker-authorized. |
| Browser acceptance | **Blocked — runtime unavailable** | Kiểm tra read-only tại lượt này: không có listener trên `3000`, `8080`, `55439`; chưa có browser workflow thực tế. Chưa xác minh modal center, save/reopen, VI/EN unsaved input, navigation/footer, upload/restart/download/hash/auth. Checklist thủ công: start backend trên disposable DB và frontend; kiểm tra centered modal; lưu/reopen salary currency + Other; chỉnh/lưu/reload draft và sửa trong lúc save; resize chuột/bàn phím; đổi VI/EN khi input chưa lưu; upload evidence, reload/restart backend, download so SHA-256/size; thử owner, recruiter cùng công ty, recruiter khác công ty; kiểm tra navigation/footer. |
| Evidence-file lifecycle | **Implemented but not verified** | Backend/frontend code và regression tests đã được cập nhật, nhưng chưa có runtime/DB để chạy upload thật, reload, preview, download, backend restart hoặc authorized delete. Chưa so sánh byte size/SHA-256 file gốc với file tải về, và chưa xác minh denial cho recruiter ngoài company boundary. Cần chạy checklist browser sau khi disposable DB/runtime sẵn sàng. |
| OAuth Google/GitHub | **Blocked — provider setup/consent pending** | Callback và tên biến đã được xác minh trong phần hướng dẫn bên dưới. Chưa có local credentials/consent; chưa thực hiện registration/login, returning-user persistence, duplicate/cancel/account-conflict acceptance. Cần cấu hình console và `.env` local, rồi báo sẵn sàng; không gửi secret qua chat. |

### Lệnh và môi trường xác minh mới nhất

- Từ `frontend`: lệnh PowerShell lấy file thay đổi bằng `git -C .. diff --name-only -- frontend/src` cộng `git -C .. ls-files --others --exclude-standard -- frontend/src`, lọc `.ts/.tsx`; `npx eslint $files --format json` — **38 files, 0 errors, 45 warnings**.
- Từ `frontend`: `npx tsc --noEmit` — exit 0; `npm run test:contracts` — **14 passed, 0 failed**.
- Bản sao ngoài working copy: `npm ci --no-audit --no-fund --prefer-offline` và `npm run build -- --webpack` — exit 0; 33/33 pages prerendered. SHA-256 manifest lưu cùng snapshot.
- Từ `backend`: `mvn -o -DskipTests test-compile` — **BUILD SUCCESS**, gồm test mới `DisposableMigrationValidationTest`; có dòng đầu `Access is denied.` trước Maven logs nhưng Maven trả thành công. Quan sát sau lệnh: không còn tiến trình `java/javaw/mvn`, thư mục `target` và class được tạo không mang ReadOnly. Cần theo dõi Access denied nếu tái diễn; chưa gắn nguyên nhân chắc chắn.
- Các **47 focused backend tests** đã qua ở lượt trước, với JDK 21 và Byte Buddy `-javaagent`; không chạy lại vì production backend không đổi trong lượt này. Migration DB validation chưa chạy.

### Bước người dùng cần làm để mở DB/runtime

Trong PowerShell terminal có quyền Docker Desktop:

```powershell
.\scripts\Start-MidcvDisposableDb.ps1
```

Ghi lại tên container được helper in ra, sau đó chạy:

```powershell
.\scripts\Test-MidcvDisposableMigrations.ps1 -ContainerName '<container-name-from-output>'
```

Script thứ hai hỏi password ẩn lần nữa và chạy hai DB riêng: một fresh V1–V27, một upgrade V20–V27, sau đó Hibernate validation. Password chỉ tồn tại trong process environment của terminal chạy Maven và được khôi phục; không cần gửi cho tôi. Container không gắn volume: stop/start giữ data; xóa container xóa disposable DB. Cần báo output pass/fail không chứa secret để tiếp tục evidence/browser acceptance.

### OAuth console setup và acceptance đang chờ

Callback đã được đối chiếu với route backend/frontend. Tạo Google OAuth client loại **Web application**, đặt Authorized JavaScript origin `http://localhost:3000` và redirect URI `http://localhost:8080/api/v1/auth/oauth/google/callback`. Tạo GitHub OAuth App với Homepage URL `http://localhost:3000` và Authorization callback URL `http://localhost:8080/api/v1/auth/oauth/github/callback`. Trong `.env` ở root repo (local, không commit), đặt `BACKEND_PUBLIC_URL`, `FRONTEND_PUBLIC_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`; secrets chỉ nhập cục bộ. Chi tiết: [`docs/OAUTH_GITHUB_SETUP.md`](OAUTH_GITHUB_SETUP.md). Người dùng đã nói sẽ tự cấu hình `.env` và báo khi sẵn sàng; không gửi client secret qua chat. Khi có credentials/runtime, phải kiểm tra provider thật: đăng ký/đăng nhập, đăng nhập lại và giữ tài khoản, ngăn trùng, hủy consent và xung đột tài khoản.

## Thay đổi trong lượt tiếp tục

- Refactor mapper Job/CV, `ApiError`, CV draft/versions, taxonomy skill và upload evidence sang DTO/kiểu cụ thể hoặc `unknown` có narrowing. Đối chiếu payload evidence với JSON snake_case trong `CVEvidenceAttachmentResponse`; sửa fixture để phản ánh hợp đồng đó.
- Sửa Hooks ở `/login`, `/oauth/complete`, trang ứng viên, trang chủ, recruiter jobs và Quick Apply: bỏ state dẫn xuất khỏi effect, xử lý fetch async có cleanup, bỏ Hook gọi có điều kiện, đổi catch từ `any` sang `unknown`. Loại bỏ warnings unused trong một số file cùng nhóm và dùng router cho điều hướng nội bộ.
- CV builder có divider resize trực tiếp với pointer và bàn phím, giới hạn hợp lý, bố cục mobile một cột; thanh range vẫn hỗ trợ thay đổi kích thước.
- Tạo bản sao source ngoài OneDrive và chạy sạch `npm ci` + production build. So sánh xác nhận build thành công ngoài đường dẫn gốc và EPERM lặp lại trong `.next` ở đường dẫn gốc.
- Chạy 47 test backend với Byte Buddy agent nạp tĩnh; lần khởi chạy đầu không-agent gặp lỗi pipe attach, lần chạy agent tĩnh hoàn tất thành công.

## Trạng thái tại báo cáo ban đầu (lịch sử; thay bằng bảng đối chiếu hiện tại ở đầu tài liệu)

| Yêu cầu | Trạng thái | Bằng chứng / việc còn lại |
|---|---|---|
| Sửa ESLint errors trong file thay đổi, không tắt rule | **Blocked — còn lỗi mã** | Baseline từ `HEAD` cho tập file tracked đang sửa: 158 errors/85 warnings. Hiện tại: **68 errors/47 warnings**, giảm 90 errors và 38 warnings. Hooks ở profile/login/OAuth/home/recruiter jobs/Quick Apply đã sạch; CV builder, evidence control, analytics, create job và LanguageContext sạch errors. Còn `api.ts` 57 errors, `types/index.ts` 11; đều đã có trong baseline (`api.ts` 111, `types/index.ts` 11), nhưng vẫn thuộc phạm vi API/types đang cần hoàn thiện. Không thêm suppression. |
| Chẩn đoán EPERM `.next` / Access denied `backend/target` | **Implemented and verified (diagnostic); frontend blocker unresolved** | `Get-Process node,java` không tìm thấy process đang chạy; truy vấn CIM và `tasklist` bị từ chối/lỗi thông tin đăng nhập nên không thể xác minh toàn bộ tiến trình. Không process nào được xác định chắc chắn là thuộc tác vụ nên không dừng process. ACL của `.next` và `backend/target` cho tài khoản Modify; không có thuộc tính ReadOnly trên `.next`. File class sinh trong `backend/target/classes-mvn` từng có ReadOnly; đã bỏ cờ chỉ trên generated `.class` trong thư mục đó. Maven clean-build sau đó thành công. Next vẫn lỗi EPERM khi tạo thư mục con trong `.next` trong lúc prerender; nguyên nhân cấp thấp (OneDrive/filter driver/concurrency) chưa phân biệt được. Docker pipe cũng bị từ chối. |
| Production build frontend và test-compile backend trên code cuối | **Implemented and verified ngoài OneDrive; original workspace build blocked** | Bản sao final tại `%LOCALAPPDATA%\Temp\midcv-final-build-20261022-223234` chứa 124 file frontend tracked + implementation files; loại `.git`, dependencies/output, uploads/logs và mọi `.env` bí mật. `npm ci --no-audit --no-fund --prefer-offline` cài 368 packages; `npm run build -- --webpack` thành công, TypeScript đạt và prerender đủ 33/33 route. Cùng build ở repo gốc vẫn thất bại `EPERM mkdir ...\.next\server\app\candidate\cvs`. Build ngoài OneDrive thu hẹp lỗi về working copy/path/environment gốc nhưng không chứng minh OneDrive là nguyên nhân duy nhất. Backend test-compile đạt như bên dưới. |
| Kiểm thử hồi quy tập trung | **Implemented and verified (phạm vi chạy được)** | `npm run test:contracts` — 14/14 đạt, gồm parsing/format VND, dữ liệu null/invalid và application mapping. `npx tsc --noEmit` qua sau sửa fixture và builder. Đây chưa thay thế kiểm thử DB, upload hoặc browser. |
| Xác nhận đơn vị lương lịch sử | **Implemented and verified by user confirmation** | Đã kiểm tra conventions/fixtures; fixtures benchmark chứa cả số USD nhưng không phải dữ liệu lịch sử. Người dùng xác nhận: “mọi tin cũ là VND/tháng”. V25 dùng `DEFAULT 'VND'`, giữ số tiền lịch sử nguyên trạng. Không migration nào được áp dụng. |
| Review V25–V27, entities và API; fresh/upgrade disposable PostgreSQL | **Blocked — môi trường DB** | V25 currency, V26 custom classifications, V27 SHA-256 đã đối chiếu với entity/API; Hibernate `ddl-auto: validate` vẫn bật. Không thể kiểm tra migration thật: Docker daemon named pipe trả `permission denied`; PostgreSQL 17 local có binary nhưng thiếu `vector.control`, trong khi migration V1 yêu cầu pgvector. Không tắt validation và không dùng DB của người dùng. Cần PostgreSQL disposable có pgvector để chạy cả fresh schema và upgrade từ schema hỗ trợ hiện tại. |
| Lifecycle evidence: upload, reload, preview, download, restart, xóa có quyền; hash/size; unauthorized | **Implemented but not verified; một phần bị chặn bởi DB/backend runtime** | Đã rà luồng: file upload mới được giữ sau commit; file được thay/xóa chỉ cleanup sau commit. Đã sửa `deleteCV` để trì hoãn xóa binary đến sau commit, tránh rollback làm mất file. Chưa thực hiện end-to-end thật, so sánh byte size/SHA-256 hoặc xác minh truy cập trái phép vì không có DB/app runtime disposable. Cần kiểm tra lại authorization recruiter theo quan hệ công ty khi có runtime. |
| Xác định đúng CV draft editor, lưu/reload/race/resize/text actions | **Implemented but not browser-verified** | Route nút Chỉnh sửa từ `/candidate/cvs` là `/candidate/cvs/builder?edit=<id>`; đây là manual builder, tách biệt modal review/extraction. Lưu giữ editor mở, revision guard giữ edits phát sinh trong lúc request, load theo `editId` không ghi đè khi đổi VI/EN. Bổ sung divider kéo chuột pointer, bàn phím Left/Right/Home/End, giới hạn 35–65%, mobile một cột; range vẫn là điều khiển bổ sung. TypeScript đạt, lint builder 0 errors/0 warnings. Chưa kiểm thử thao tác browser/overflow thực tế. |
| Google/GitHub thật, callback route, hướng dẫn provider | **Implemented but not verified; chờ cấu hình của người dùng** | Đã đọc `docs/OAUTH_GITHUB_SETUP.md`, đối chiếu callback `/api/v1/auth/oauth/google/callback`, `/api/v1/auth/oauth/github/callback` và frontend `/oauth/callback`, `/oauth/complete`; sửa `useSearchParams` bằng Suspense boundary. Đã ghi hướng dẫn console cụ thể và các biến `BACKEND_PUBLIC_URL`, `FRONTEND_PUBLIC_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`. Người dùng sẽ cấu hình `.env` cục bộ và báo sẵn sàng. Không đọc/in secret, không mock acceptance. Cần round-trip consent thật sau khi người dùng báo. |
| UI browser: modal login, currency persistence, Other, nav, nội dung/footer, VI/EN không mất input | **Implemented but not verified** | Các cập nhật mã đã có trong working tree; chưa mở được browser acceptance trên app đang chạy. Cần browser và backend/DB test khả dụng để xác minh các route thực tế, trạng thái lưu và unsaved input. |

## Lệnh và kết quả lịch sử

- `npx tsc --noEmit` (tại `frontend`) — **exit 0** sau API payload guard cuối lượt này.
- `npm run test:contracts` (tại `frontend`) — **exit 0; 14 passed, 0 failed**.
- `npm ci --no-audit --no-fund` (frontend bản sao ngoài OneDrive) — **exit 0, added 368 packages in 39s**.
- `npm run build -- --webpack` (frontend bản sao final ngoài OneDrive) — **exit 0**, TypeScript đạt, prerender 33/33, traces hoàn tất.
- `npm run build -- --webpack` (frontend gốc) — **exit 1**, lỗi `EPERM: operation not permitted, mkdir ...\frontend\.next\server\app\candidate\cvs`.
- `npx eslint -f json $changed` (PowerShell: `$changed` lấy từ `git diff --name-only -- frontend/src` + `git ls-files --others --exclude-standard -- frontend/src`, lọc `.ts/.tsx`) — hiện **94 errors, 47 warnings**; `api.ts` có 83 errors, `types/index.ts` có 11. `HEAD` baseline tương ứng 158 errors, 85 warnings.
- `mvn -o -DskipTests clean test-compile` (tại `backend`) — **BUILD SUCCESS**, 221 source main + 83 test source; cảnh báo annotation/deprecation/unchecked không làm fail.
- JDK: `openjdk version "21.0.11" 2026-04-21 LTS` (Temurin).
- `mvn -o "-Dtest=OAuthEntityMappingTest,OAuthServiceStateTest,CreateJobSalaryValidationTest,CandidateCvDraftAndEvidenceIntegrationTest,AuditCvLifecycleRegressionTest,AuditDocumentAccessSqlTest,AuditRemediationRegressionTest" "-DargLine=-javaagent:C:\Users\Khang\.m2\repository\net\bytebuddy\byte-buddy-agent\1.14.18\byte-buddy-agent-1.14.18.jar" test` — **BUILD SUCCESS; 47 tests, 0 failures/errors/skips**. Lần chạy đầu không nạp agent tĩnh bị Mockito attach pipe; agent được nạp tĩnh khắc phục.
- `docker info --format '{{.ServerVersion}}'` — lỗi quyền named pipe Docker; PostgreSQL 17 local không có extension pgvector.

## Blocker PostgreSQL ban đầu (lịch sử; helper hiện tại ở đầu tài liệu)

`whoami` trả `king-pc\khang`; Docker CLI 29.5.3, context `desktop-linux`; Docker daemon trả `permission denied` với `npipe:////./pipe/dockerDesktopLinuxEngine`. Cổng TCP 55439 đang trống. Không đổi quyền Docker/nhóm người dùng và không tạo container từ phiên bị từ chối.

Dùng hai helper hiện tại ở đầu tài liệu. Chúng chỉ bind `127.0.0.1`, nhận mật khẩu ẩn và giữ credential trong process của terminal chạy test; không gửi credential qua chat.

## Hành động còn lại tại thời điểm báo cáo trung gian (lịch sử)

1. Hoàn tất thay `any` trong `api.ts` và `types/index.ts`; hiện còn 68 lint errors và 47 warnings trên tập file ảnh hưởng.
2. Lặp lại build cách ly trên snapshot hiện tại; xử lý nguyên nhân tạo thư mục `.next` ở working copy mà không đổi ACL rộng.
3. Khởi tạo disposable PostgreSQL có pgvector để kiểm tra V1…V27 fresh và upgrade, Hibernate validation, cùng test lifecycle evidence/authorization.
4. Dùng browser chạy các acceptance flow và so sánh size/SHA-256 file upload/download.
5. Sau khi người dùng cấu hình `.env` và báo sẵn sàng, kiểm tra provider round-trip Google/GitHub thật.

## Bản ghi tiến độ trung gian đã được thay bằng trạng thái hiện tại ở đầu tài liệu

- `fetchQuickScreenings` đọc payload dưới dạng `unknown` và lọc qua validator runtime; admin endpoint envelopes dùng generic DTO. `npx tsc --noEmit` và 14 contract tests đạt sau các thay đổi này.
- Tại mốc đó, lint còn 68 errors và controlled copy chưa đồng bộ được. Các số liệu này đã được supersede bởi bảng trạng thái hiện tại ở đầu tài liệu: lint 0 errors, và final controlled build có manifest/checksum đã đạt.
