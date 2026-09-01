# HR JOB MANAGEMENT SPECIFICATION (PHASE 6 BASELINE)

Tài liệu này đặc tả Phân hệ Quản lý Bài tuyển dụng dành cho HR (`/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/[id]`).

---

## 1. QUẢN LÝ TIN TUYỂN DỤNG (`/recruiter/jobs`)

* Tìm kiếm từ khóa theo tiêu đề bài tuyển dụng.
* Bộ lọc trạng thái: `PUBLISHED`, `DRAFT`, `CLOSED`.
* Các lối tắt thao tác: Xem chi tiết JD, Xem Đơn ứng tuyển, Xem Bảng Xếp Hạng AI Engine.

---

## 2. TẠO BÀI TUYỂN DỤNG MỚI (`/recruiter/jobs/new`)

* **Biểu mẫu Cấu trúc:** Nhập Tiêu đề, Ngành nghề (`Technology`, `Marketing`, `Design`, `Finance`, `HR`), Hình thức làm việc, Cấp bậc, Địa điểm, Mức lương min/max.
* **Mô tả & Trách nhiệm:** Nhập mô tả công việc chung và danh sách trách nhiệm chính.
* **Phân tách Kỹ năng Bắt buộc vs Ưu tiên:**
  * **Required Skills (Bắt buộc):** Các kỹ năng quyết định điều kiện lọc cứng (Gate baseline).
  * **Preferred Skills (Ưu tiên):** Các kỹ năng chỉ cộng điểm thưởng (Point bonus), không phạt trừ điểm khi thiếu.
* **Câu hỏi Tuyển dụng (Application Questions):** Cho phép đặt câu hỏi cụ thể theo bài tuyển dụng để ứng viên trả lời khi Quick Apply.
