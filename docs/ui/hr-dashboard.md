# HR DASHBOARD & COMPANY VERIFICATION SPECIFICATION (PHASE 6 BASELINE)

Tài liệu này đặc tả Phân hệ HR Overview Dashboard (`/recruiter`) và Cổng Kiểm soát Xác minh Doanh nghiệp (Company Verification Gate).

---

## 1. HR OVERVIEW DASHBOARD (`/recruiter`)

* **Banner Xác minh Doanh nghiệp:** Hiển thị trạng thái `VERIFIED`, `PENDING` hoặc `REJECTED`.
* **Thống kê Tổng quan:** Hiển thị số lượng bài tuyển dụng active, draft, published, tổng số đơn nộp và đơn mới.
* **Danh sách Bài đăng Mới nhất:** Cung cấp lối tắt nhanh tới trang Quản lý đơn nộp và Bảng Xếp Hạng AI Engine.

---

## 2. CỔNG KIỂM SOÁT XÁC MINH (COMPANY VERIFICATION GATE)

* **Quy tắc Nghiệp vụ:**
  * Doanh nghiệp có trạng thái `PENDING` hoặc `REJECTED` được phép tạo và lưu bài tuyển dụng dạng **DRAFT (Nháp)**.
  * Thao tác **PUBLISH (Xuất bản)** bài tuyển dụng công khai bị khóa 100% (kiểm soát ở cả giao diện và Backend authority API).
  * Chỉ doanh nghiệp có trạng thái `VERIFIED` mới có quyền chuyển bài đăng sang `PUBLISH`.
