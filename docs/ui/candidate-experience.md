# CANDIDATE EXPERIENCE FRONTEND SPECIFICATION (PHASE 5 CORRECTION BASELINE)

Tài liệu này đặc tả Kiến trúc Trải nghiệm Nền tảng Giao diện dành cho Ứng viên (Candidate Experience UI System) và Chính sách Auth Gate tiêu chuẩn.

---

## 1. CHÍNH SÁCH AUTH GATE TIÊU CHUẨN (AUTHENTICATION GATE POLICY)

| Loại Hành động | Quyền Truy cập | Chi tiết Luồng Trải nghiệm |
| :--- | :--- | :--- |
| **Công khai (Public)** | Khách vô danh / Đã đăng nhập | Xem Trang chủ, Tìm kiếm/Lọc việc làm (`/jobs`), Xem chi tiết bài tuyển dụng (`/jobs/[id]`). |
| **Bảo vệ (Protected)** | Yêu cầu Đăng nhập Ứng viên | Nộp đơn Quick Apply, Quản lý Hồ sơ cá nhân (`/candidate/profile`), Thư viện CV (`/candidate/cvs`), CV Builder (`/candidate/cvs/builder`), Lịch sử nộp đơn (`/candidate/applications`). |

---

## 2. QUY TRÌNH XỬ LÝ CV VÀ CHỐNG NỘP TRÙNG LẶP

1. **Vòng đời Xử lý CV Upload:** `UPLOADING` $\rightarrow$ `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` $\rightarrow$ `REVIEW` $\rightarrow$ `SAVED` (hoặc `FAILED` có nút thử lại).
2. **Review Dữ liệu Trích xuất:** Cho phép ứng viên kiểm tra và sửa thông tin trích xuất từ AI Worker trước khi lưu chính thức.
3. **Chống Nộp Trùng Lặp (Duplicate Submission Prevention):** Vô hiệu hóa nút bấm Submit khi yêu cầu nộp đơn đang trong tiến trình xử lý.
