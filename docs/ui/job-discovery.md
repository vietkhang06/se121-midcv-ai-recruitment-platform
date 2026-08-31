# PUBLIC JOB DISCOVERY SPECIFICATION (PHASE 5 CORRECTION BASELINE)

Tài liệu này đặc tả Luồng Tìm kiếm và Khám phá Việc làm Công khai (`/jobs` và `/jobs/[id]`) và Chính sách Quyền xem chi tiết.

---

## 1. CHÍNH SÁCH QUYỀN XEM CHI TIẾT VIỆC LÀM (JOB DETAIL PUBLIC POLICY)

> **CHÍNH SÁCH CHÍNH THỨC:**
> **Trang Chi tiết việc làm (`/jobs/[id]`) là CÔNG KHẠI 100% cho mọi khách xem vô danh.**
>
> Khách truy cập không cần đăng nhập vẫn có thể xem đầy đủ:
> * Tiêu đề vị trí, tên công ty, địa điểm, mức lương công khai, hình thức làm việc.
> * Nội dung chi tiết mô tả công việc, trách nhiệm chính.
> * Yêu cầu kỹ năng bắt buộc (Required Skills) và kỹ năng ưu tiên (Preferred Skills).
> * Quyền lợi đãi ngộ và thông tin công ty.
>
> **Chỉ khi người dùng thực hiện thao tác ĐƠN NỘP (Quick Apply), hệ thống mới kích hoạt Auth Gate Modal yêu cầu Đăng nhập / Đăng ký.**

---

## 2. TRANG DANH MỤC VIỆC LÀM (`/jobs`)

* **Thanh tìm kiếm Từ khóa:** Tìm kiếm theo vị trí việc làm, công nghệ (`Java`, `Marketing`, `Figma`, `MISA`...).
* **Bộ lọc Đa chỉ tiêu:** Ngành nghề (`Technology`, `Marketing`, `Design`, `Finance`, `HR`), Địa điểm (`Hồ Chí Minh`, `Hà Nội`, `Đà Nẵng`, `Remote`), Hình thức (`Full-time`, `Part-time`, `Hybrid`, `Remote`).
* **Thẻ Việc làm (Job Card):** Hiển thị tiêu đề, tên công ty, huy hiệu Verified Company, mức lương công khai, hình thức, ngày đăng và danh sách thẻ kỹ năng bắt buộc/ưu tiên.
