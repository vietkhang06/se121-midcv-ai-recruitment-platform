# FIRST VISIT & CANDIDATE ONBOARDING SPECIFICATION (PHASE 5 COMPREHENSIVE BASELINE)

Tài liệu này đặc tả Luồng Trải nghiệm Lần đầu (First Visit Onboarding) và Khảo sát Nhanh Ứng viên (Candidate Quick Onboarding).

---

## 1. FIRST VISIT ONBOARDING MODAL & STATE PERSISTENCE

* **Giao diện:** Banner/Modal xuất hiện duy nhất ở lần đầu khách truy cập vô danh mở nền tảng: *"Bạn đang tìm việc hay đang tìm ứng viên?"*
* **3 Lựa chọn Trải nghiệm:**
  1. `[ Tôi đang tìm việc ]` $\rightarrow$ Chuyển sang bước Khảo sát Nhanh Ứng viên.
  2. `[ Tôi đang tìm ứng viên ]` $\rightarrow$ Định tuyến tới kênh dành cho Nhà tuyển dụng.
  3. `[ Skip ]` $\rightarrow$ Đóng modal và chuyển trực tiếp sang trang xem danh mục việc làm công khai `/jobs`.
* **Quản lý Trạng thái Lưu trữ:** Trạng thái xem onboarding được lưu trữ trong `localStorage.getItem('hasSeenFirstVisitOnboarding')` nhằm đảm bảo prompt không lặp lại phiền phức trong suốt quá trình điều hướng của người dùng.

---

## 2. KHẢO SÁT NHANH VÀ PREFILL TỰ ĐỘNG (PREFILLED REGISTRATION)

* **Nội dung Khảo sát Nhanh:**
  1. Độ tuổi ứng viên (ví dụ: `22` tuổi).
  2. Ngành nghề định hướng chính (ví dụ: `Technology`).
* **Cơ chế Prefill:** Khi ứng viên bấm *Tiếp tục Đăng ký*, dữ liệu Khảo sát Nhanh lập tức được truyền sang Biểu mẫu Đăng ký Tài khoản (`AuthModal.tsx`). Người dùng **tuyệt đối không phải nhập lại tuổi và ngành nghề định hướng**.
