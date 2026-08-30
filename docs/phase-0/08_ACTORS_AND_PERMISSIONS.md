# 08. PHÂN TÍCH TÁC NHÂN VÀ BẢNG PHÂN QUYỀN (ACTORS & PERMISSIONS MATRIX)

Tài liệu này đặc tả danh sách Tác nhân (Actors) tham gia hệ thống và Bảng phân quyền chi tiết (Access Control Matrix / RBAC).

---

## 1. DANH SÁCH TÁC NHÂN (ACTORS DEFINITION)

### 1.1 Candidate (Ứng viên)
* **Mô tả:** Người dùng cá nhân truy cập nền tảng để tìm kiếm cơ hội việc làm, tạo hồ sơ, tải CV và ứng tuyển.
* **Mục tiêu:** Nộp CV thành công, xem thông tin JD chi tiết, theo dõi trạng thái ứng tuyển.

### 1.2 HR / Recruiter (Nhà tuyển dụng)
* **Mô tả:** Đại diện tuyển dụng của các doanh nghiệp/công ty.
* **Mục tiêu:** Đăng tin tuyển dụng (JD), xem danh sách ứng viên nộp đơn, chạy đối sánh AI Matching, xem bảng xếp hạng ứng viên và phân tích minh chứng.

### 1.3 System Administrator (Quản trị viên Hệ thống)
* **Mô tả:** Quản trị viên chịu trách nhiệm quản lý tài khoản người dùng, giám sát hạ tầng và quản lý cấu hình AI Service.

### 1.4 System AI Engine (Tác nhân Hệ thống AI)
* **Mô tả:** Mô-đun AI bất đồng bộ chịu trách nhiệm đọc CV/JD, trích xuất thực thể, tính vector embedding, chạy algorithm đối sánh và sinh giải thích.

---

## 2. MA TRẬN PHÂN QUYỀN TRUY CẬP (ACCESS CONTROL MATRIX - RBAC)

| Quyền hạn / Tài nguyên (Resource & Action) | Guest (Chưa đăng nhập) | Candidate | HR / Recruiter | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Xem danh sách Job / Chi tiết Job** | $\checkmark$ | $\checkmark$ | $\checkmark$ | $\checkmark$ |
| **Đăng ký / Đăng nhập** | $\checkmark$ | $\checkmark$ | $\checkmark$ | $\checkmark$ |
| **Quản lý Candidate Profile cá nhân** | $\boldsymbol{\times}$ | $\checkmark$ (Chính chủ) | $\boldsymbol{\times}$ | $\checkmark$ |
| **Upload CV / Quản lý CV cá nhân** | $\boldsymbol{\times}$ | $\checkmark$ (Chính chủ) | $\boldsymbol{\times}$ | $\checkmark$ |
| **Nộp đơn ứng tuyển (Apply Job)** | $\boldsymbol{\times}$ | $\checkmark$ | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ |
| **Xem lịch sử ứng tuyển cá nhân** | $\boldsymbol{\times}$ | $\checkmark$ (Chính chủ) | $\boldsymbol{\times}$ | $\checkmark$ |
| **Tạo / Sửa / Đóng bài đăng Job** | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\checkmark$ (Thuộc Cty) | $\checkmark$ |
| **Xem Danh sách Ứng viên cho Job** | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\checkmark$ (Thuộc Job) | $\checkmark$ |
| **Xem File CV của Ứng viên** | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\checkmark$ (Ứng viên đã nộp) | $\checkmark$ |
| **Kích hoạt AI Matching / Re-matching** | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\checkmark$ (Thuộc Job) | $\checkmark$ |
| **Xem Candidate Ranking & AI Score** | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\checkmark$ (Thuộc Job) | $\checkmark$ |
| **Xem Detail AI Evidence Explanation** | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\checkmark$ (Thuộc Job) | $\checkmark$ |
| **Quản lý User / Cấu hình AI API Keys** | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\boldsymbol{\times}$ | $\checkmark$ |

---

## 3. QUY TẮC BẢO VỆ TÀI NGUYÊN BẰNG ENDPOINT (SECURITY ENFORCEMENT RULES)

1. **Candidate Boundary:** Một Candidate $A$ tuyệt đối không thể truy cập hoặc xem file CV/Profile của Candidate $B$. Nếu cố tình gọi API `/api/candidates/{id}/cv` của người khác $\rightarrow$ Hệ thống trả về `403 Forbidden`.
2. **HR Boundary:** Một HR thuộc Công ty $X$ tuyệt đối không được phép xem danh sách ứng viên, báo cáo AI Matching hoặc chỉnh sửa Job thuộc sở hữu của HR Công ty $Y$. Nếu vi phạm $\rightarrow$ Trả về `403 Forbidden`.
3. **Document Privacy:** File CV được bảo vệ ở tầng Storage. Mọi liên kết xem file đều là Temporary Signed URL hoặc Stream qua Backend API kiểm tra token.
