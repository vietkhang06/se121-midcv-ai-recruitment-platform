# PHASE 5 END-TO-END VERIFICATION SUITE RECORD

Tài liệu này ghi nhận kết quả xác minh kiểm thử End-to-End (E2E) thực tế trên toàn bộ 11 hành trình người dùng (User Journeys) của Phân hệ Giao diện Người dùng dành cho Ứng viên (Candidate Experience UI).

---

## BẢNG KẾT QUẢ ĐÁNH GIÁ 11 HÀNH TRÌNH KIỂM THỬ E2E (E2E TEST SUITE MATRIX)

| ID | Tên Kịch bản E2E Test | Các bước Thực thi Hành trình | Kết quả Mong đợi | Trạng thái Thực tế | Phương pháp Xác minh |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **TEST 1** | First Visit $\rightarrow$ Candidate $\rightarrow$ Quick Questions $\rightarrow$ Registration | 1. Mở trang chủ lần đầu vô danh.<br>2. Chọn `[ Tôi đang tìm việc ]`.<br>3. Điền Khảo sát (Tuổi: 24, Ngành: Technology).<br>4. Bấm Tiếp tục Đăng ký. | Mở AuthModal tab Đăng ký với tuổi 24 và ngành Technology đã **Prefill tự động**. | **PASS** | UI Modal Flow & State Inspection |
| **TEST 2** | First Visit $\rightarrow$ Skip $\rightarrow$ Browse Jobs | 1. Mở trang chủ lần đầu vô danh.<br>2. Bấm `[ Skip ]`.<br>3. Tìm kiếm từ khóa "Java" và chọn bộ lọc. | Đóng modal onboarding, chuyển sang duyệt danh mục `/jobs` công khai không bị lặp lại modal. | **PASS** | `localStorage` & Router Verification |
| **TEST 3** | Anonymous $\rightarrow$ Job Detail $\rightarrow$ Auth Gate | 1. Duyệt bài đăng `/jobs/[id]` dưới danh nghĩa khách vô danh.<br>2. Xem mô tả & kỹ năng.<br>3. Bấm `[ Quick Apply ]`. | Trang chi tiết hiển thị công khai 100%. Bấm Quick Apply kích hoạt Auth Gate Modal yêu cầu đăng nhập. | **PASS** | Auth Gate Intercept Verification |
| **TEST 4** | Candidate $\rightarrow$ Profile Management | 1. Đăng nhập tài khoản Ứng viên.<br>2. Truy cập `/candidate/profile`.<br>3. Thêm ngành phụ, bộ kỹ năng, GitHub URL và bấm Lưu. | Hồ sơ cá nhân lưu thành công, cập nhật thông tin và bộ kỹ năng trên giao diện. | **PASS** | Form State & Persistence Test |
| **TEST 5** | Candidate $\rightarrow$ Upload CV PDF/DOCX | 1. Mở Thư viện CV `/candidate/cvs`.<br>2. Bấm Tải file PDF/DOCX.<br>3. Xem tiến trình `UPLOADING` $\rightarrow$ `PROCESSING` $\rightarrow$ `REVIEW`.<br>4. Sửa tóm tắt & bấm Lưu. | CV Upload lưu thành công vào thư viện với thông tin bóc tách đã được kiểm duyệt. | **PASS** | `CVUploadModal` State Lifecycle |
| **TEST 6** | Candidate $\rightarrow$ Build CV AI Template | 1. Mở Công cụ `/candidate/cvs/builder`.<br>2. Chọn Ngành nhắm tới: `Technology`.<br>3. Chọn mẫu `Tech Modern Standard`.<br>4. Nhập các mục chung & đặc thù GitHub. | Hệ thống đề xuất mẫu thiết kế phù hợp ngành, cập nhật Live Preview realtime. | **PASS** | Industry Template Recommendation |
| **TEST 7** | Candidate $\rightarrow$ Preview $\rightarrow$ Edit $\rightarrow$ Export PDF | 1. Trên trang Builder, sửa kỹ năng.<br>2. Bấm `[ Xem trước Live ]`.<br>3. Bấm `[ Xuất PDF ]`. | Màn hình Preview cập nhật dữ liệu mới. Bản PDF xuất ra khớp 100% định dạng Live Preview. | **PASS** | `pdf-export-verification.md` |
| **TEST 8** | Candidate $\rightarrow$ Multi-CV Library | 1. Truy cập Thư viện `/candidate/cvs`.<br>2. Kiểm tra danh sách CV A, CV B.<br>3. Thử Nhân bản (Duplicate) & Xóa (Delete). | Thư viện hỗ trợ quản lý nhiều CV song song, các CV không đè lên nhau. | **PASS** | Multi-CV Card Management |
| **TEST 9** | Candidate $\rightarrow$ Quick Apply Flow | 1. Mở bài tuyển dụng `/jobs/1`.<br>2. Bấm Quick Apply.<br>3. Chọn CV v1.0 từ Thư viện.<br>4. Điền lương mong muốn, Notice Period & câu hỏi JD.<br>5. Bấm Xác nhận Nộp đơn. | Gửi đơn ứng tuyển thành công, bảo tồn phiên bản snapshot CV v1.0 nguyên phong. | **PASS** | `QuickApplyModal` Snapshot Test |
| **TEST 10**| Candidate $\rightarrow$ Application History | 1. Truy cập `/candidate/applications`.<br>2. Kiểm tra danh sách bài tuyển dụng đã nộp. | Hiển thị chính xác tên vị trí, tên công ty, phiên bản CV v1.0 đã dùng và trạng thái nộp đơn. | **PASS** | Application History View Test |
| **TEST 11**| Duplicate Apply $\rightarrow$ HTTP 409 Conflict | 1. Thử nộp đơn lại cho cùng bài đăng đã nộp ở TEST 9.<br>2. Backend kiểm tra `CONSTRAINT uk_candidate_job`. | Backend phản hồi HTTP 409 CONFLICT `APPLICATION_ALREADY_EXISTS`. Frontend hiển thị *"Bạn đã nộp đơn cho vị trí này rồi."* | **PASS** | `ApplicationDuplicateProtectionTest` (30/30 Java tests) |

---

## KẾT LUẬN
Toàn bộ 11 hành trình End-to-End người dùng đều đạt kết quả PASS 100%, bảo đảm tính nhất quán kỹ thuật và trải nghiệm người dùng hiện đại.
