# ADR-009: CƠ CHẾ LƯU SNAPSHOT BẢN NGUYÊN PHONG CV CHO ĐƠN ỨNG TUYỂN

## Status
**ACCEPTED**

## Context
Khi ứng viên nộp đơn (Apply) cho một bài tuyển dụng, ứng viên sử dụng một bản CV từ thư viện cá nhân. Sau khi nộp đơn, ứng viên có thể tiếp tục chỉnh sửa, bổ sung kỹ năng hoặc xóa file CV đó trong thư viện. Nếu hệ thống không lưu vết, đơn ứng tuyển cũ sẽ bị sai lệch nội dung so với thời điểm nộp đơn thực tế.

## Decision
Áp dụng **Cơ chế Immutable CV Snapshot (`ApplicationCVSnapshot`)**: Tại thời điểm Candidate nộp đơn ứng tuyển, Backend tự động nhân bản dữ liệu văn bản thô và JSON cấu trúc của CV được chọn vào bảng `application_cv_snapshots`. Mọi chỉnh sửa CV về sau trong thư viện của Candidate sẽ **không bao giờ làm thay đổi** bản snapshot đã nộp.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Đảm bảo tính toàn vẹn dữ liệu lịch sử ứng tuyển $100\%$.
  * Báo cáo AI Matching và màn hình HR xem xét hồ sơ luôn phản ánh đúng thực tế thời điểm ứng tuyển.
* **Đánh đổi (Trade-offs):**
  * Tốn thêm dung lượng lưu trữ CSDL cho bảng snapshot. (Đã đánh giá hoàn toàn xứng đáng cho tính đúng đắn nghiệp vụ).
