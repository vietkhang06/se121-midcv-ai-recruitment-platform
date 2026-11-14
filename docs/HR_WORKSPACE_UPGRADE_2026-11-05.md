# Nâng cấp không gian HR và quản lý CV ứng viên

Ngày hoàn tất: 2026-11-05

## Phạm vi

- Làm mới trang chủ HR, thanh điều hướng và sidebar theo nhóm nghiệp vụ.
- Hoàn thiện màn hình quản lý CV ứng viên với tìm kiếm, lọc theo tin/chiến dịch/trạng thái/quyền AI, sắp xếp, cập nhật trạng thái và xuất CSV.
- Hoàn thiện chiến dịch tuyển dụng: tạo, sửa, xóa, gắn nhiều tin và xem hồ sơ thực thuộc chiến dịch.
- Làm mới chi tiết CV ứng tuyển với snapshot CV bất biến, thông tin ứng viên, quyết định tuyển dụng, lịch sử xử lý và kết quả AI theo quyền.
- Phân biệt HR Thường và HR Pro ở cả giao diện lẫn API. Standard Extra không mở chi tiết AI; Mid Eco Plus và Mid Max mở Pro đến hạn dịch vụ.
- Bổ sung 20 vị trí CNTT chuyên sâu, nâng tổng danh mục lên 539 vị trí; frontend và backend dùng cùng một tệp dữ liệu.

## Chính sách chấm điểm AI

Một hồ sơ chỉ được đưa vào pipeline AI khi đồng thời thỏa mãn:

1. Ứng viên chủ động chọn đồng ý phân tích AI khi ứng tuyển.
2. Tin đang ở trạng thái `PUBLISHED` và có mã gói đăng tin hỗ trợ.
3. Tin chọn ít nhất một vị trí chuyên môn trong danh mục midCV được hỗ trợ.

Nếu thiếu một điều kiện, API trả `aiScoringAvailable=false`, mã lý do cụ thể và giao diện hiển thị **Chưa khả dụng**. Hệ thống không tạo vector, không gọi matching và không xếp hạng hồ sơ đó.

Phạm vi matching vẫn là đa ngành theo đề cương đồ án. Các vị trí CNTT được gắn cờ ưu tiên và chi tiết hơn; GitHub chỉ là tín hiệu bổ sung cho vị trí phù hợp, không phải điều kiện bắt buộc cho toàn hệ thống.

| Quyền HR | Dữ liệu được xem |
|---|---|
| Thường | Phù hợp / Cân nhắc / Không phù hợp / Chưa khả dụng |
| Pro | Điểm tổng, điểm thành phần, nhận xét, evidence và tín hiệu GitHub nếu có |

Backend xóa điểm số và chi tiết khỏi response cho tài khoản thường, kể cả khi gọi trực tiếp endpoint inspection, ranking hoặc tính lại điểm.

## Dữ liệu thật

Các màn hình mới đọc trực tiếp từ API jobs, applications, campaigns, entitlements và matching. Trạng thái tuyển dụng, chiến dịch, quota, kết quả AI, snapshot CV và lịch sử quyết định đều lấy từ cơ sở dữ liệu; không có hàng ứng viên hoặc điểm số mẫu trong giao diện.

## Kiểm chứng đã chạy

- Backend Java 21: `mvn -DskipTests package` — thành công.
- Policy không mock: `AiScreeningAccessPolicyTest` — thành công.
- Frontend: `npm run build` — thành công, 51 route được dựng.
- API contracts: `npm run test:contracts` — 46/46 thành công.
- ESLint giới hạn trên toàn bộ file thay đổi của đợt này — thành công.
- Hai tệp taxonomy đã được parse JSON và đối chiếu byte-for-byte — thành công.
- Script khởi động tự chọn cổng Mailpit còn trống và đồng bộ cổng SMTP vào `.env`, tránh lỗi cổng 1025 đã được sử dụng.

Các bài kiểm thử tích hợp PostgreSQL/live AI vẫn cần chạy trong stack Docker của dự án vì môi trường đóng gói không cung cấp Docker daemon. Script khởi động hiện có sẽ tự chạy migration `V36` khi backend kết nối PostgreSQL.
