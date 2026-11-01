# MidCV — C02, J01, P01–P02, G01, Q01–Q03, N01–N02

Ngày lập: 31/10/2026 (Asia/Bangkok). Nguồn: bản `MidCV_TaskFix_20261030.zip` đã giao và hai ảnh task mới. Đây là bản tiếp tục của MidCV/SE121. Không áp dụng code CampusJob/NestJS gửi nhầm.

## Phạm vi và trạng thái

| Task | Thay đổi trong bản này | Bằng chứng còn phải chạy trên môi trường thật |
|---|---|---|
| C02 | Khóa CV khi thay đổi minh chứng; chỉ sửa bản DRAFT; quyền HR theo công ty và attachment có trong snapshot đã nộp; giữ tệp/row lịch sử khi thay/xóa minh chứng đang được snapshot tham chiếu; kiểm tra size/SHA; header tải riêng tư | HTTP + PostgreSQL + khởi động lại tiến trình; ma trận quyền bên dưới |
| J01 | Luồng tạo/xem/sửa bằng PUT/xóa nháp; đóng/xuất bản; chặn HR tự gỡ trạng thái kiểm duyệt; tìm kiếm keyword/location tại server; lưu responsibilities; giữ currency/OTHER; tải hết các trang quản lý và đếm đơn theo totalElements | CRUD/search/publish và quyền hai công ty trên trình duyệt/HTTP thật |
| P01 | Dùng khóa candidate/CV và khóa đọc job khi nộp; giữ unique(candidate,job); chỉ dùng phiên bản mới nhất đã CONFIRMED; snapshot có trigger bất biến; không xóa CV đã dùng nộp đơn | 6 request đồng thời → 1 lần 201, 5 lần 409; sửa CV không đổi snapshot |
| P02 | Khóa đơn khi quyết định; expectedStatus chống quyết định trên dữ liệu cũ; không ghi thêm audit/notification cho retry cùng trạng thái; lỗi ghi audit phải làm thất bại giao dịch | Quyền HR, CAS 409, trạng thái/audit/notification trước–sau |
| G01 | Mỗi lần quét cập nhật identity/url; chỉ OWNED khi identity khớp URL và liên kết OAuth; thiếu status không coi là SYNCED; xóa dữ liệu repo cũ cả khi lần mới rỗng/unavailable; không giữ hoạt động cũ | OAuth GitHub thật, repo thật, nhánh hết quota/unavailable/không ownership/không GitHub |
| Q01 | Khóa appeal lúc xử lý; audit review/cancel; audit duyệt appeal phản ánh đúng trường hợp vẫn còn đình chỉ khác; giữ workflow xác minh/đình chỉ hiện có | Onboard → verification → suspend → appeal → approve/reject, audit thật |
| Q02 | `/admin/users` có một nguồn phân trang và lọc kết hợp; CV count theo candidate_profile.id; phân biệt DEACTIVATED với SUSPENDED; chặn xử lý lại report; chỉ phục hồi job bị đình chỉ của công ty hợp lệ; audit lỗi không bị nuốt | Ma trận quyền Admin và đối soát SQL cho users/jobs/reports/taxonomy/audit |
| Q03 | Phạm vi Admin là BACKEND_SCREENING; worker giữ cấu hình môi trường PRIMARY/fallback; API runtime không trả key; trace requested/resolved model; cấu hình DB không được rò qua cache trước commit; lỗi lưu cấu hình không báo thành công | Đổi cấu hình, chạy lại tác vụ, ghi trace thật; restart backend/worker và đối chiếu lần nữa |
| N01 | Giữ transactional notification/outbox hiện có; bổ sung kiểm tra thật trên H2 về trước/sau commit, rollback, retry/backoff, opt-out và tài khoản không hoạt động | PostgreSQL + SMTP/Mailpit; xem outbox/SMTP sau commit và sau retry |
| N02 | Retry cùng clientId phải có cùng nội dung; nội dung khác trả 409; giữ kiểm tra ownership/application và durable SQL; mở rộng ca read/block/retry | HTTP/PostgreSQL, quyền hai công ty, unread và restart backend |

Các test Mockito/H2/HTTP loopback là bằng chứng hồi quy, không thay thế OAuth, nhà cung cấp LLM, SMTP hoặc PostgreSQL thật. Xem `task-evidence/20261031-business/verification.json` và log cùng thư mục. Chưa đánh dấu các task là nghiệm thu đầy đủ khi thiếu các bước live tương ứng.

## Migration và dữ liệu

- Thêm **V30**, không sửa checksum V1–V29.
- `cv_evidence_attachments.retired` giữ lịch sử đã dùng trong đơn; chỉ một minh chứng hiện hành cho mỗi mục CV. Nếu dữ liệu cũ trùng mục, migration giữ bản mới nhất làm hiện hành và giữ các bản còn lại dưới dạng lịch sử.
- Snapshot của đơn không được UPDATE các trường nghiệp vụ sau khi đã tạo; lỗi SQL khi cố sửa là chủ đích của trigger.
- `jobs.responsibilities` là JSONB riêng, không nhập vào file CV gốc và không làm mất nội dung JD.
- Tệp legacy chưa có SHA không tự biến thành tệp đã được xác minh. Đối chiếu SHA ở C02 phải dùng tệp mới tải hoặc metadata SHA thực tế.
- Luôn giữ `UPLOAD_DIR`/`FILE_STORAGE_PATH` là cùng một đường dẫn bền vững qua các lần khởi động. Khi chạy source ở thư mục khác, dùng đường dẫn tuyệt đối tới đúng kho tệp; không chuyển database sang một kho uploads trống rồi kết luận mất dữ liệu.

## Chạy bộ kiểm tra lặp lại

Tại root dự án, dùng CMD hoặc terminal bình thường:

```text
python scripts\Verify-MidcvBusinessTasks.py
```

Script chọn JDK 21 từ `MIDCV_JDK21_HOME`, `JAVA_HOME` hoặc các thư mục JDK đã cài, rồi xác nhận Maven thực sự chạy Java 21. Nó không đổi cấu hình Java toàn hệ thống. Nếu chưa tìm được JDK:

```bat
set "MIDCV_JDK21_HOME=C:\Users\Khang\.jdks\jbr-21.0.11"
python scripts\Verify-MidcvBusinessTasks.py
```

Bộ kiểm tra chạy clean/test/package backend, 4 kiểm tra cấu hình worker độc lập, npm ci, contract tests, TypeScript và build frontend. Chỉ backend: thêm `--backend-only`. Log và exit code nằm trong `diagnostics/business-tasks-<timestamp>-<id>/`. Không in token, mật khẩu database hay API key vào báo cáo.

## HTTP/PostgreSQL trên database mới

Bật Docker Desktop, bảo đảm cổng chọn chưa bị chiếm. Lệnh sau tạo container pgvector PostgreSQL 16 mới, chỉ bind loopback, hỏi mật khẩu thử nghiệm bằng input ẩn, tạo database tên ngẫu nhiên `midcv_task_<hex>` rồi chạy `TaskHttpAcceptanceTest`:

```text
python scripts\Verify-MidcvBusinessTasks.py --http --port 55439
```

Có thể dùng container thử nghiệm đang chạy:

```text
python scripts\Verify-MidcvBusinessTasks.py --http --container TEN_CONTAINER_THU_NGHIEM --port 55439
```

Không dùng container production. Khi chọn container có sẵn, script chỉ tạo database mới; nếu tạo không được thì dừng. Không drop/clean database đã tồn tại. Test còn kiểm tra URL đúng prefix test và loopback trước khi khởi tạo Spring. Database/container được giữ để kiểm tra sau chạy; tự dừng/xóa đúng container vừa tạo sau khi không còn cần bằng chứng.

Suite HTTP dùng mail MOCK và tắt worker nền để tách kiểm thử nghiệp vụ. Nó kiểm tra API/DB/filesystem thật, nhưng **không nghiệm thu SMTP, GitHub OAuth hoặc chất lượng AI**. Các ca gồm auth/reset/upload ở bản trước và 8 ca mới: concurrent apply/snapshot, confirmed gate, quyết định/audit/CAS, chat/read/block/retry/ownership, job CRUD/search/OTHER/salary, minh chứng/hash/quyền, Admin counts/roles và company suspension/appeal/audit.

Fresh/upgrade V20→V30 và Hibernate validate: dùng `scripts/Test-MidcvDisposableMigrations.ps1` trên container thử nghiệm như hướng dẫn bản trước. Nếu máy chặn PowerShell script, dùng workflow HTTP Python phía trên cho fresh migration; không cần thay ExecutionPolicy toàn máy. Nghiệm thu upgrade vẫn phải có log của bài migration riêng, không suy ra từ fresh.

## Ma trận quyền cần ghi lại

| Thao tác | Anonymous | Chủ CV | Candidate khác | HR công ty nhận đơn | HR công ty khác | Admin |
|---|---|---|---|---|---|---|
| GET minh chứng trong snapshot đã nộp | 401 | 200 | 403 | 200 | 403 | 200 |
| GET minh chứng chưa có trong đơn công ty | 401 | 200 | 403 | 403 | 403 | 200 |
| POST/DELETE minh chứng trên DRAFT | 401 | 201/200 | 403 | 403 | 403 | 403 |
| Thay minh chứng trên CONFIRMED | 401 | 409 | 403 | 403 | 403 | 403 |
| Tạo/sửa/xuất bản/đóng tin | 401 | 403 | 403 | Theo công ty và trạng thái | 403 đối với tin khác | 403 ở API đăng tin; dùng API moderation |
| Xem/sửa trạng thái đơn | 401 | 403 ở route recruiter | 403 | 200 | 403 | 403 ở route recruiter |
| Admin users/jobs/reports/taxonomy/audit | 401 | 403 | 403 | 403 | 403 | 200 |
| Chat theo application | 401 | Chỉ participant | 404 | Chỉ participant đúng công ty hiện tại | 404 | 404 nếu không phải participant |

HR bị đình chỉ hoặc công ty bị đình chỉ không được gửi chat hay xử lý tuyển dụng. Admin không có quyền đọc chat riêng chỉ vì mang vai trò Admin. Upload/delete minh chứng yêu cầu tài khoản được hoạt động.

## Ca kiểm thử product và bằng chứng cần giữ

1. **C02 upload/download:** upload PDF/PNG/JPEG hợp lệ; lưu response `attachment_id`, `file_size`, `sha256`, request ID. Download, so byte length và SHA-256 với file đầu vào. Windows: `Get-FileHash -Algorithm SHA256` trong PowerShell hoặc `certutil -hashfile <file> SHA256` trong CMD.
2. **C02 restart:** giữ nguyên DB và đường dẫn uploads tuyệt đối, dừng rồi chạy lại backend, đăng nhập lại nếu cần. Tải cùng attachment ID; size/hash phải giữ nguyên. Không dùng lần tạo lại service trong unit test để thay bằng chứng restart tiến trình.
3. **C02 lịch sử:** nộp hồ sơ có minh chứng, mở chỉnh sửa tạo DRAFT mới, thay/xóa minh chứng ở bản mới. HR vẫn tải được minh chứng cũ thuộc snapshot; HR không đọc được attachment mới chưa nộp. Xóa CV đã nộp trả 409.
4. **J01:** tạo draft OTHER với ba nhãn tùy chỉnh, lương USD/EUR/VND; reload rồi sửa cùng ID. Phần trách nhiệm công việc phải còn nguyên. Publish chỉ khi công ty VERIFIED/ACTIVE; search keyword/location phải gọi `/jobs?query=...&location=...`; đóng tin làm mất khỏi danh sách công khai. Chỉ draft được xóa.
5. **P01:** gửi 6 request apply cùng job/candidate đồng thời. Kỳ vọng đúng một 201, năm 409; đếm DB một application và một snapshot. DRAFT/không sở hữu CV/khác công ty không vượt gate. Sau sửa CV, snapshot cũ không đổi.
6. **P02:** HR công ty A đọc đơn A và quyết định có note; ghi status và audit trước/sau. HR công ty B bị chặn. Gửi expectedStatus cũ sau khi người khác đã quyết định phải 409. Retry cùng trạng thái không nhân notification/audit.
7. **G01:** liên kết GitHub OAuth thật; consent/callback không dùng mock. So username liên kết với URL đang quét; đối chiếu repository thật. Sau đổi URL sang tài khoản khác phải UNVERIFIED_PUBLIC. Kết quả unavailable/rỗng không giữ repo/hoạt động của lần trước. Thiếu GitHub hoặc ownership không trở thành lý do tự động loại ứng viên.
8. **Q01:** HR cập nhật và gửi hồ sơ doanh nghiệp; Admin tiếp nhận/yêu cầu bổ sung/duyệt/từ chối đúng workflow. Đình chỉ khóa nghiệp vụ. HR gửi appeal, Admin review/approve hoặc reject; audit phải phản ánh trạng thái thật. Nếu còn đình chỉ khác, target vẫn SUSPENDED.
9. **Q02:** dùng ba vai trò và anonymous gọi các API trong ma trận. So totalElements/totalUsers/status counts/CV count với SQL trên DB thử nghiệm. Danh sách ALL phải một page server, không ghép hai page candidate/recruiter. DEACTIVATED không hiển thị thành SUSPENDED.
10. **Q03:** Admin lưu model backend mới, chạy tác vụ sàng lọc rồi bấm “Đọc lại cấu hình và trace”. Giữ request ID, requestedModel, resolvedModel và thời gian. `NOT_REPORTED` nghĩa là provider không báo resolved model, không được tự suy đoán. Restart backend, kiểm tra cấu hình DB còn; chạy lại tác vụ để có trace mới. Đổi worker `.env` rồi restart worker; kiểm tra `/internal/ai/runtime-config` và response `requestedModel/resolvedModel` của `/structure-cv`. Hai phạm vi độc lập được ghi rõ trên UI.
11. **N01:** bật SMTP/Mailpit thực tế theo cấu hình Inbox hiện có, opt-in email. Tạo sự kiện ứng tuyển/quyết định hoặc chat. So notification, unread và inbox_email_outbox sau commit. Dừng SMTP, tạo sự kiện, quan sát attempts/next_attempt_at; khởi động SMTP và chờ lịch retry, kiểm tra sent_at và mail nhận được. Không đánh dấu PASS chỉ vì có row outbox hoặc API trả 200. Outbox là at-least-once, có thể trùng mail nếu SMTP nhận rồi DB commit thất bại.
12. **N02:** HR mở thread từ đơn thuộc công ty; candidate nhận/send/read. Retry cùng clientId/body trả cùng message ID; khác body trả 409. Candidate block → tin mới bị chặn; chỉ blocker unblock. Restart backend với cùng DB, kiểm tra message ID/body và unread; HR chuyển công ty mất quyền thread cũ.

Mỗi ca ghi PASS/FAIL/BLOCKED, thời gian, phiên bản source, request ID, HTTP status và giá trị trước/sau. Che token, OAuth code, API key và mật khẩu khi chia sẻ bằng chứng. Các log hồi quy trong bản giao không phải log nghiệm thu product trên máy người dùng.
