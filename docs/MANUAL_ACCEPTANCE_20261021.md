# Checklist nghiệm thu thủ công — 21/10/2026

`NOT TESTED` là trạng thái hiện tại nếu chưa có bằng chứng từ môi trường thật. Không chuyển thành PASS chỉ dựa trên unit/mock test.

## Tiền điều kiện

- PostgreSQL 16 + pgvector dùng database disposable, backend/frontend/worker khởi động theo `STARTUP_20261021.md`.
- OAuth credentials thật cấu hình trong môi trường backend; callback URL khớp origin; không ghi secret vào ảnh/log.
- Ghi lại browser, thời điểm, request/status (đã loại bỏ token/PII), ảnh UI và DB assertions không chứa dữ liệu nhạy cảm.

## OAuth Google và GitHub — NOT TESTED

1. Mở `/login`, chọn từng provider, hoàn tất consent; kỳ vọng vào trang ứng viên và session hiện hành.
2. Lặp lại đăng nhập; kỳ vọng cùng user, không tạo trùng.
3. Hủy consent, dùng state sai/hết hạn/replay, provider trả lỗi; kỳ vọng thông báo tiếng Việt, không session mới, không lộ phản hồi nhạy cảm.
4. Thử tài khoản local cùng email; kỳ vọng không auto-merge. Đăng nhập rồi chủ động liên kết; thử callback xung đột danh tính.
5. GitHub private email: nhập email tại `/oauth/complete`, xác minh qua luồng email; kiểm tra OAuth token không lộ cho browser và role luôn CANDIDATE.
6. Chụp network redirect và xác nhận URL không chứa access/refresh/JWT; kiểm tra ticket chỉ dùng một lần và hết hạn.

## GitHub sở hữu tài khoản / scan — NOT TESTED

1. Kết nối GitHub có quyền read:user/user:email; không chấp thuận quyền repo.
2. So username OAuth với username scan: chỉ cùng danh tính đã kết nối mới thành `OWNED`; username tự nhập khác vẫn `UNVERIFIED_PUBLIC`.
3. Đồng bộ lại và kiểm tra thời gian, trạng thái, nguồn evidence, giới hạn dữ liệu public; fork/archived/partial/empty/rate-limit không được mô tả là kỹ năng đã xác minh.
4. Xác nhận CV đã review không bị ghi đè; điểm GitHub không quá trọng số 15% và công thức hiện hành không đổi.

## CV builder — NOT TESTED trên browser

1. Đăng nhập candidate, vào `/candidate/cvs/builder`; nhập mọi trường cá nhân/liên hệ, Unicode tiếng Việt, link hợp lệ và các mục lặp.
2. Thêm/sửa/xóa kinh nghiệm, học vấn, kỹ năng, dự án, chứng chỉ, ngôn ngữ; đổi template, xác nhận preview giữ nguyên dữ liệu.
3. Lưu nháp, tải lại; kỳ vọng round-trip. Thử API lỗi khi lưu và rời trang khi có thay đổi chưa lưu; nội dung không mất.
4. Xác nhận CV; sửa lại theo vòng đời version hiện có. CV version đã nộp phải bất biến.
5. Kiểm tra mobile/tablet/desktop, bàn phím/focus, tên dài/URL dài/mục nhiều trang và không có tràn ngang. PDF/export chỉ nghiệm thu nếu chức năng được bật: kiểm tra text selectable, tiếng Việt, thứ tự đọc, ngắt trang.

## Lương — NOT TESTED trên browser/DB

1. Tạo tin với số VND/tháng nhỏ, lớn, 0, bỏ trống; parse vi-VN/en-US; lưu rồi sửa/lưu lại.
2. Kỳ vọng số API không scale, `salaryCurrency=VND`, `salaryPeriod=MONTH`; trống là null/không công bố, thương lượng có flag riêng.
3. Negative, giá trị phân số/không hợp lệ, max < min phải bị từ chối; lọc và mọi trang hiển thị cùng đơn vị.
4. Xác nhận dữ liệu lịch sử còn nguyên numeric value; không migration/reset DB thật.

## Bằng chứng tự động hiện có

- Backend focused regressions: 62 tests passed.
- Frontend contracts/money: 14 tests passed; TypeScript check passed.
- Worker grounding audit: 8 tests passed.
- Chưa có browser, provider round-trip hoặc database disposable migration acceptance.
