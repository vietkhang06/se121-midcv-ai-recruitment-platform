# PROMPT THỰC THI — HOÀN THIỆN M06 & M07

## Vai trò và phạm vi

Đóng vai Senior Full-stack Engineer, QA Lead và Application Security Engineer. Chỉ thay đổi M06 Candidate/CV và M07 Job/Application cùng test trực tiếp của chúng. Không thay đổi scoring, ranking, taxonomy, embedding hoặc GitHub OAuth.

## Bước 1 — Kiểm tra hiện trạng

1. Đọc SSOT: `CORE_PRODUCT_FLOW`, `DOMAIN_RULES`, `IMPLEMENTATION_STATUS`, `ACCEPTANCE_CRITERIA`, `API_CONTRACT`, `IMPLEMENTATION_PHASES`.
2. Kiểm tra Git branch/working tree; giữ nguyên thay đổi có sẵn của người dùng.
3. Lập trace Backend → Database → Frontend → Test cho CAN-01..11 và APP-01..11.
4. Chạy baseline test tập trung trước khi sửa. Phân biệt lỗi có sẵn và regression mới.
5. Không coi task DONE chỉ vì endpoint/component tồn tại.

## Bước 2 — Hoàn thiện M06

### M06-A: Upload thống nhất và an toàn

- Đường upload sản phẩm phải chấp nhận PDF, DOC, DOCX, PNG, JPG/JPEG, WEBP theo SSOT.
- Chặn file rỗng, quá 10 MiB, extension không hỗ trợ và magic bytes không khớp.
- Không tạo DB/file rác khi validation thất bại.
- File gốc được hash SHA-256 và không bị ghi đè bởi edit/confirm.

### M06-B: Draft, Builder và version

- Builder phải load/save/reload mọi section và template mà không làm mất trường không được chỉnh sửa.
- Save thất bại phải giữ nội dung đang nhập; không báo thành công giả.
- Confirm tạo/khóa đúng version; DRAFT không được dùng để apply/matching.
- Export/preview phải dùng dữ liệu vừa lưu.

### M06-C: Default, quota, delete, attachment

- Một candidate có tối đa một CV mặc định.
- Không vượt quota khi tạo đồng thời.
- Xóa CV mặc định phải chọn fallback xác định hoặc trả trạng thái không có default.
- Không xóa/ghi đè artifact đã được application snapshot tham chiếu.
- Attachment kiểm tra ownership, loại/size và persistence.

## Bước 3 — Hoàn thiện M07

### M07-A: JD lifecycle

- Chỉ HR đúng công ty và công ty đủ điều kiện mới tạo/sửa/publish/close.
- Publish chặn deadline quá hạn, vacancy không hợp lệ và dữ liệu lương không hợp lệ.
- Application bị chặn khi Job chưa publish, đã close, deadline hết hạn hoặc vacancy đã đủ.

### M07-B: Application consistency và concurrency

- Unique rule: một Candidate chỉ có một application cho một Job, độc lập CV; retry/double-click trả conflict và không tạo record/snapshot thứ hai.
- Hai request đồng thời phải được bảo vệ ở database, không chỉ check Java.
- Application pin đúng CONFIRMED CV version và JD version tại thời điểm submit.
- Snapshot CV/JD/page bất biến sau khi CV/JD được chỉnh sửa.
- Consent false vẫn tạo đơn nhưng không score; worker lỗi không rollback application đã commit.

### M07-C: Decision propagation

- HR đúng company mới xem/cập nhật application.
- Status transition dùng expected status/atomic compare-and-set; stale update trả 409.
- Mỗi transition ghi audit log và phát notification sau commit.
- Candidate đọc được trạng thái cuối cùng qua API lịch sử/chi tiết.

## Điều kiện hoàn thành đo được

### Correctness

- Tất cả unit/integration/contract tests tập trung M06–M07 PASS.
- Có test concurrent apply thật với hai transaction/thread và xác nhận đúng một application/snapshot.
- Có test CV/JD snapshot vẫn giữ dữ liệu cũ sau khi nguồn thay đổi.
- Có test deadline/vacancy, consent true/false và stale HR decision.

### Hiệu suất

- List API bắt buộc phân trang và sort whitelist; không load toàn bộ CV/application vào bộ nhớ.
- Submit application thực hiện trong một transaction ngắn; không gọi worker/LLM chặn transaction.
- Không thêm polling hoặc request trùng; frontend chống double-submit khi request đang chạy.

### Bảo mật và toàn vẹn

- Candidate B không đọc/sửa/xóa CV của Candidate A.
- HR công ty B không đọc snapshot/application công ty A.
- Validation lỗi không để lại file hoặc DB record mồ côi.
- Không log token, secret, CV raw content hoặc dữ liệu cá nhân không cần thiết.

### Stability gate

- Backend focused tests PASS.
- Frontend contract tests, TypeScript, lint/build liên quan PASS.
- Playwright M06–M07 PASS khi live stack khả dụng; nếu thiếu external worker phải ghi BLOCKED, không giả PASS.
- Module boundary check không có regression mới do lần sửa này.

## Báo cáo cuối

Liệt kê: file thay đổi, lỗi gốc, giải pháp, ý nghĩa nghiệp vụ, tests/lệnh/kết quả, phần chưa kiểm chứng và rủi ro còn lại. Không push/merge nếu chưa được yêu cầu.
