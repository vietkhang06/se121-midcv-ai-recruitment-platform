# midCV — Nâng cấp sản phẩm 04/11/2026

Phạm vi đầu vào: `se121-midcv-ai-recruitment-platform-master(5).zip`, danh sách task, đề cương và 25 ảnh tham chiếu. Giao diện điều chỉnh theo phong cách midCV sẵn có; không sao chép thương hiệu TopCV. Không thay phiên bản thư viện Java, Python hoặc frontend.

## Phân loại và trạng thái

| Nhóm | Nội dung | Kết quả / giới hạn |
|---|---|---|
| Tài khoản ứng viên | Thường / xác thực email / Pro | Suy ra từ email_verified và account_plan thật. Pro do admin cấp qua chức năng hiện có, không tự nâng cấp từ trình duyệt. |
| CV Builder | 4 mẫu Tiêu chuẩn, Tiêu chuẩn (Ít kinh nghiệm), Sáng tạo, Ấn tượng | Thư viện card có bộ lọc; mẫu, ảnh, font, cỡ chữ, giãn dòng, màu, thứ tự và ẩn mục được lưu trong phiên bản CV. |
| Ảnh CV | Tải / đổi / xóa | JPG/PNG/WebP tối đa 5 MB; cắt giữa khung và giảm xuống 360×440. Không có công cụ kéo vùng crop tự do. Ảnh không tham gia scoring. |
| Soạn CV | Thêm / sửa / xóa các thẻ | Kinh nghiệm, dự án, học vấn, chứng chỉ, ngôn ngữ; xem trước và in PDF. Hồ sơ đã xác nhận được tạo bản DRAFT mới khi sửa. |
| Cổng tài khoản | Đăng nhập / đăng ký riêng ứng viên và HR | `/jobseekers/*` và `/employers/*`. Backend kiểm tra expectedRole trước khi cấp token ở luồng đăng nhập này; các URL `/login`, `/register` cũ vẫn hoạt động. |
| Đăng ký HR | Người đại diện, điện thoại, email, mật khẩu, tên công ty, MST, địa chỉ | Persist thật. Email kích hoạt qua SMTP; thẩm định doanh nghiệp theo hồ sơ riêng. |
| Xác minh cấp 1/2/3 | Email → doanh nghiệp → uy tín | Cấp 2 mặc định 5 tin đang hoạt động và 100 hồ sơ khác nhau. Cấp 3 do admin duyệt có lý do; không tự tăng theo thời gian hoặc gói Pro. |
| Giấy phép / điện thoại | Hồ sơ gửi duyệt | PDF/PNG/JPEG tối đa 5 MB, kiểm tra chữ ký tệp, quyền tải riêng admin. Điện thoại, MST, giấy phép do admin kiểm tra thủ công; chưa có SMS OTP. Khoảng 2 ngày là thời gian dự kiến, không phải tác vụ tự duyệt. |
| JD | Mô tả, yêu cầu ứng viên, quyền lợi, địa điểm, thời gian, cách thức, hạn nộp | Lưu và đọc qua API/DB; hạn nộp được chặn ở backend theo giờ Việt Nam. |
| Trình định dạng | Font, cỡ, đậm/nghiêng/gạch chân, tiêu đề, đầu mục, căn lề, undo/redo | Dùng chức năng trình duyệt, không thêm dependency. Pasted text và HTML hiển thị được giới hạn theo allowlist; không chạy script/iframe/event handler. |
| Middy AI | Gợi ý viết mô tả và yêu cầu | Có endpoint worker/backend và giao diện xem trước, HR bấm áp dụng. Cần LLM_PRIMARY thật. Chưa kiểm thử lời gọi model do không có endpoint/key trong file gửi kèm; không sinh nội dung giả khi lỗi. |
| Ứng tuyển | Chọn CV trong kho / tải file / thư giới thiệu | Dùng lại pipeline tải và rà soát có sẵn; chỉ CV CONFIRMED mới nộp. Đã kiểm thử thao tác chọn CV và nộp qua trình duyệt thật. Chưa kiểm thử OCR/LLM trên file upload mới trong phiên này. |
| Đồng ý AI | Checkbox mặc định bỏ chọn, lưu theo từng đơn | Backend chặn calculate, inspection, batch recalculation và tác vụ MATCH cho đơn không đồng ý. CV vẫn nộp được, HR thấy Chưa khả dụng. |
| Danh mục nghề | 436 nhóm ISCO-08 + 83 vị trí midCV | Tổng 519 mục có nguồn/mã; ưu tiên CNTT, giao diện 3 cột, tìm không dấu, chọn nhiều và lọc theo mã đã lưu trong JD. Danh sách không tuyên bố chứa mọi chức danh trên internet. |
| Doanh nghiệp | Giới thiệu có định dạng | Tách riêng description khỏi reviewNotes. Thay đổi tên/MST/địa chỉ/điện thoại sau xác minh yêu cầu thẩm định lại. |
| Không gian HR | Tổng quan / quản lý CV / chiến dịch | Thống kê từ API thật, bộ lọc tin/chiến dịch/trạng thái, sắp xếp, chọn và xuất CSV. Không có số liệu dashboard giả. |
| Chiến dịch | Tạo, sửa, tạm dừng, lưu trữ, xóa, gắn tin | Ràng buộc quyền doanh nghiệp trong transaction; xóa chiến dịch giữ nguyên JD và hồ sơ. Trạng thái chiến dịch chỉ tổ chức quản lý, không tự đóng JD. |
| Chi tiết hồ sơ | CV snapshot + thư giới thiệu + điểm và minh chứng | Phiên bản CV khi ứng tuyển được giữ; hồ sơ không đồng ý AI vẫn xem được. Luồng quyết định của HR hiện có được giữ lại. |
| Gói dịch vụ / credit | Standard Extra / Mid Eco Plus / Mid Max | Ví bắt đầu 0; admin cấp credit đã đối soát; mua gói có khóa ví và requestId chống trừ lặp. Có thời hạn ưu tiên tin và thêm lượt mở CV. Chưa có thanh toán ngân hàng. |
| Mailpit | SMTP và hộp thư web | Đã nhận thư thật và kích hoạt tài khoản bằng liên kết trong thư. Mailpit giữ thư cục bộ để phát triển, không chuyển thư ra Gmail/Outlook. Muốn gửi ra ngoài cần SMTP thực tế. |

## Điều chỉnh theo đề cương

Đối sánh JD–CV hỗ trợ đa ngành và không bị khóa theo gói Pro hoặc nghề IT. GitHub chỉ bổ trợ khi vị trí phù hợp. Điểm và giải thích hỗ trợ HR; con người quyết định tuyển dụng. Các nhãn Phù hợp/Cân nhắc/Không phù hợp trong ảnh không được gán bằng ngưỡng mới tùy ý: giao diện hiển thị điểm thật và tiêu chí từ engine hiện có.

Không suy diễn đồng ý AI cho đơn cũ. Migration đặt `ai_analysis_consent=false` với dữ liệu hiện có; kết quả cũ không được đưa vào ranking/inspection khi không có đồng ý. Không xóa hồ sơ hoặc CV gốc. CV chưa xác nhận vẫn phải qua bước rà soát trước đối sánh.

## Gói dịch vụ nội bộ

| Gói | Credit | Ưu tiên tin | Lượt mở CV thêm |
|---|---:|---:|---:|
| Standard Extra | 20 | 7 ngày | 20 |
| Mid Eco Plus | 50 | 14 ngày | 60 |
| Mid Max | 100 | 30 ngày | 150 |

Đây là cấu hình khởi tạo của midCV, không phải giá TopCV và không phải giá bằng VNĐ. Giá lưu ở `recruiter_service_packages`. Gói không bỏ qua xác minh doanh nghiệp hoặc sự đồng ý AI. Lượt xem chỉ tính một lần cho mỗi đơn ứng tuyển; xem lại không trừ tiếp. 100 lượt mặc định của cấp 2 là hạn mức toàn thời gian, không tự đặt lại hàng tháng. Tin được ưu tiên trong kết quả sau khi lọc, không tạo việc làm giả.

## Kiểm thử thật và phạm vi bằng chứng

`verification/live-results.json` và `verification/live-console.txt` ghi nhận 41 kiểm tra PASS trên Spring Boot/Java 21, PostgreSQL 16.15 + Pgvector 0.6.0, SMTP/Mailpit 1.30.4 và Next.js production. Có trình duyệt Chromium thật: thư viện mẫu, đổi/lưu/tải lại font, danh mục nghề, nộp CV khi bỏ chọn AI, lưu JD đậm chữ, giao diện HR và snapshot.

- Cài overlay vào bản gốc, kiểm tra cài lại và từ chối ghi đè file đã sửa khác: PASS (installer-checks.json).
- Backend `mvn -DskipTests clean package`: PASS. Có biên dịch test source, không khẳng định test assertion từ lệnh này.
- Frontend `npm run build`: PASS.
- Frontend `npm run test:contracts`: 46/46 PASS trước khi format; chạy lại kết quả cuối trong báo cáo xác minh.
- Python: kiểm tra cú pháp endpoint Middy và bộ chạy live: PASS.
- Không có model AI bên ngoài trong môi trường nghiệm thu này; không đánh dấu LLM/OCR/GitHub toàn trình đã nghiệm thu.
- Bộ test cũ có lỗi trước nâng cấp. Báo cáo so sánh riêng ghi rõ các lỗi đó; không tuyên bố toàn bộ `mvn test` xanh.

## Quy mô và việc còn lại

Bản này được kiểm thử chức năng với dữ liệu thật của bộ test tạo trong DB riêng. Dashboard hiện tổng hợp các API theo từng JD, phù hợp quy mô đồ án; chưa đo hiệu năng khi có hàng nghìn tin/hồ sơ. Chưa kiểm thử đồng thời ở tải lớn, thanh toán ngân hàng, nhà cung cấp SMS hoặc chất lượng model/OCR. Các mục đó không được coi là đã hoàn thành chỉ vì có source hoặc nút giao diện.
