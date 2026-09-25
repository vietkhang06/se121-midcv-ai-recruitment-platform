# Báo Cáo Kiểm Toán & Danh Sách Phát Hiện (Audit Findings Report)

Dự án: **MidCV — Nền tảng tuyển dụng thông minh hỗ trợ đối sánh JD–CV**  
Ngày kiểm toán: **25/09/2026**  
Môi trường kiểm tra: Windows 11, Java 21 OpenJDK, Python 3.11, Next.js 16.3.3, Playwright 1.50, PostgreSQL 16 pgvector, Local Ollama.

---

## 1. Danh Sách Phát Hiện Có Bằng Chứng (Audit Findings)

### FINDING SEC-01: Rủi ro phân quyền lỏng lẻo giữa HR và ADMIN
* **Mức ưu tiên:** **P0 (Bảo Mật & Phân Quyền)**
* **Yêu cầu bị ảnh hưởng:** REQ-10 (Strict Role Separation & Security Governance).
* **Vị trí liên quan:**
  * `backend/src/main/java/com/platform/recruitment/config/SecurityConfig.java`
  * `backend/src/main/java/com/platform/recruitment/admin/AdminController.java`
  * `backend/src/main/java/com/platform/recruitment/config/JwtAuthenticationFilter.java`
* **Hành vi thực tế trước khi sửa:**
  * `SecurityConfig.java` cấu hình `.requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "HR")`, cho phép tài khoản HR gọi API cấu hình hệ thống AI của toàn nền tảng.
  * `AdminController.java` kiểm tra `if (user.getRole() != Role.ADMIN && user.getRole() != Role.HR)`, cho phép HR thay đổi endpoint Ollama / OpenAI API Key.
  * `JwtAuthenticationFilter` sử dụng trực tiếp role ghi trong JWT claim mà không đối soát với trạng thái quyền lực thực tế của User trong cơ sở dữ liệu (`user.getRole()`).
* **Hành vi mong đợi:**
  * Chỉ tài khoản có thẩm quyền `ADMIN` duy nhất mới được phép xem/sửa cấu hình AI và quản lý doanh nghiệp.
  * Role của request phải được đối soát từ database (`user.getRole()`) để loại bỏ hoàn toàn nguy cơ role spoofing qua JWT cũ.
* **Biện pháp khắc phục tối thiểu:**
  * Đổi matcher `/api/admin/**` và `/api/v1/admin/**` thành `.hasRole("ADMIN")`.
  * Sửa `AdminController.java` chỉ cho phép `user.getRole() == Role.ADMIN`.
  * Trong `JwtAuthenticationFilter`, kiểm tra thẩm quyền bắt buộc từ cơ sở dữ liệu (`user.getRole() != null`). Tuyệt đối từ chối xác thực nếu role trong database bị null/thiếu, loại bỏ hoàn toàn fallback nguy hiểm vào claim của token.
  * Loại bỏ hoàn toàn migration V8/V9 chứa credential cố định. Thay thế bằng cơ chế `AdminBootstrapRunner` (CommandLineRunner) an toàn: chỉ tạo tài khoản ADMIN ban đầu khi người vận hành chủ động cấu hình biến môi trường `ADMIN_INITIAL_EMAIL` và `ADMIN_INITIAL_PASSWORD`. Không ghi log mật khẩu và không hardcode bất kỳ credential nào trong mã nguồn hoặc migration.
* **Trạng thái:** **CONFIRMED & FIXED (Đã sửa và kiểm chứng)**
* **Kiểm thử xác minh:**
  * `StrictRoleSeparationSecurityTest.java` (10/10 test pass: HR bị cấm 403 khi gọi Admin API, Candidate bị cấm 403, kiểm soát quyền sở hữu đa công ty Multi-tenant).
  * `SpringSecurityRbacAndMultiTenantIntegrationTest.java` (15/15 test pass: kiểm tra filter chain Spring Security thực tế, từ chối token role null, user inactive, và ngăn chặn truy cập chéo tenant).
  * `AdminBootstrapRunnerTest.java` (4/4 test pass: kiểm chứng các kịch bản bootstrap an toàn qua biến môi trường).
  * `strict-role-separation.spec.ts` (14/14 test pass: RoleGuard chặn 403 trên giao diện trình duyệt, sử dụng test fixture cô lập, không lưu mật khẩu thật).

---

### FINDING SEC-02: Rủi ro truy cập chéo giao diện giữa HR Portal và Candidate Routes
* **Mức ưu tiên:** **P1 (Tính Toàn Vẹn & Trải Nghiệm Giao Diện)**
* **Yêu cầu bị ảnh hưởng:** REQ-10 (Portal Boundary Isolation).
* **Vị trí liên quan:**
  * `frontend/src/components/auth/RoleGuard.tsx`
  * `frontend/src/app/recruiter/layout.tsx`
  * `frontend/src/app/candidate/layout.tsx`
  * `frontend/src/app/admin/layout.tsx`
  * `frontend/src/context/AuthContext.tsx`
* **Hành vi thực tế trước khi sửa:**
  * Tài khoản HR khi gõ trực tiếp URL `/candidate/cvs` hoặc `/candidate/profile` vẫn có thể tải giao diện ứng viên.
  * Ứng viên khi đăng nhập từ trang HR không được điều hướng về đúng cổng của mình.
  * Nút "Đăng tuyển & tìm hồ sơ" hiển thị cho cả ứng viên.
* **Hành vi mong đợi:**
  * Khi tài khoản HR truy cập route của Candidate -> Hiển thị cảnh báo 403 Forbidden qua RoleGuard, tuyệt đối không render dữ liệu ứng viên.
  * Khi Candidate truy cập route `/recruiter` -> Bị chặn 403 Forbidden.
  * Sau khi đăng nhập, hệ thống tự động điều hướng đúng portal theo vai trò: ADMIN -> `/admin`, HR -> `/recruiter`, CANDIDATE -> `/candidate/profile`.
* **Biện pháp khắc phục tối thiểu:**
  * Xây dựng component `RoleGuard.tsx` với thông báo 403 rõ ràng kèm nút quay lại đúng portal.
  * Bọc layout các portal (`/admin/layout.tsx`, `/recruiter/layout.tsx`, `/candidate/layout.tsx`) bằng `RoleGuard`.
  * Cập nhật `AuthContext.tsx` tự động điều hướng thông minh theo vai trò và chặn navigation target không tương thích.
* **Trạng thái:** **CONFIRMED & FIXED (Đã sửa và kiểm chứng)**
* **Kiểm thử xác minh:**
  * Playwright E2E: `strict-role-separation.spec.ts` (Test 02, 04, 11, 12, 14 đều PASS).

---

### FINDING UX-03: Modal xác nhận đăng xuất lệch tâm trên thiết bị di động
* **Mức ưu tiên:** **P2 (Trải Nghiệm Người Dùng & Giao Diện)**
* **Yêu cầu bị ảnh hưởng:** Tiêu chuẩn UI/UX trên mobile và desktop.
* **Vị trí liên quan:**
  * `frontend/src/components/auth/LogoutConfirmModal.tsx`
  * `frontend/e2e/logout-modal-positioning.spec.ts`
* **Hành vi thực tế trước khi sửa:**
  * Khi cuộn trang hoặc trên màn hình hẹp (mobile viewport 375x667), modal xác nhận đăng xuất bị neo theo luồng DOM cha, dẫn đến việc bị trôi lệch khỏi tầm nhìn hoặc che khuất nút thao tác.
* **Hành vi mong đợi:**
  * Modal phải render qua React Portal tại `document.body` với `fixed inset-0 z-50 flex items-center justify-center`, đảm bảo luôn nằm chính giữa viewport ở mọi độ phân giải (Desktop, Tablet, Mobile) và không bị ảnh hưởng bởi vị trí cuộn trang.
* **Biện pháp khắc phục tối thiểu:**
  * Đưa Modal ra ngoài bằng Portal, căn giữa tuyệt đối với backdrop mờ và an toàn biên lề màn hình.
  * Bổ sung test E2E kiểm tra tọa độ bounding box trên 4 độ phân giải: Desktop (1280x800), Scrolled (cuộn 500px), Tablet (768x1024), Mobile (375x667).
* **Trạng thái:** **CONFIRMED & FIXED (Đã sửa và kiểm chứng)**
* **Kiểm thử xác minh:**
  * Playwright E2E: `logout-modal-positioning.spec.ts` (4/4 test PASS).

---

### FINDING DATA-04: Đã kiểm tra nhưng KHÔNG PHẢI LỖI: Nhận định "Hệ thống dùng dữ liệu Mock trong Production"
* **Mức ưu tiên:** **N/A (Nghi Ngờ Kiểm Tra Xong - False Positive)**
* **Yêu cầu liên quan:** Nguyên tắc trung thực học thuật và không bịa đặt dữ liệu (Anti-Fabrication).
* **Chi tiết kiểm tra:**
  * Báo cáo sơ bộ đặt nghi vấn về từ khóa `MOCK_GITHUB_DATA`, `mock_cv_text`, `staticJobs`, `use_mock`.
  * **Kiểm chứng thực tế:**
    1. `MOCK_GITHUB_DATA` trong `mock_github.py` và `mock_cv_text` trong `test_cv_parser.py` nằm hoàn toàn trong thư mục test fixtures phục vụ unit test offline.
    2. Trong `llm_client.py`, dòng 94-101: `if use_mock is True or raw_provider == "mock": raise LLMAPIError("Mock provider is prohibited in production runtime.")` — hệ thống chủ động ném lỗi nếu cấu hình mock được gọi trong runtime thật.
    3. `staticJobs` và `staticCandidates` trong `api.ts` chỉ là dữ liệu dự phòng UI khi server backend chưa bật; khi backend hoạt động, 100% API calls đi qua REST controller Spring Boot.
* **Kết luận:** **KHÔNG PHẢI LỖI (Hệ thống tuân thủ nghiêm ngặt nguyên tắc Zero-Mock trong Production Runtime).**

---

### FINDING ALG-05: Đã kiểm tra nhưng KHÔNG PHẢI LỖI: Nhận định "Vector 1024 chiều xung đột với Vector 1536 chiều"
* **Mức ưu tiên:** **N/A (Nghi Ngờ Kiến Trúc - False Positive)**
* **Yêu cầu liên quan:** REQ-04 (Vector Embedding Architecture).
* **Chi tiết kiểm tra:**
  * Bảng `embeddings` và `document_versions` có cả vector 1536 chiều và 1024 chiều.
  * **Kiểm chứng thực tế:**
    1. Dự án thiết kế **Dual Vector Architecture** có chủ đích: 1536 chiều phục vụ OpenAI Cloud API (`text-embedding-3-small`), còn 1024 chiều phục vụ Local Ollama (`bge-m3`).
    2. Bảng `embeddings` có 2 cột riêng biệt: `embedding_vector vector(1536)` với chỉ mục `idx_embeddings_vector_hnsw` và `embedding_vector_1024 vector(1024)` với chỉ mục `idx_embeddings_vector_1024_hnsw`.
    3. Hệ thống cấm tính cosine similarity chéo giữa 2 loại model/dimension khác nhau; chỉ tính tương đồng giữa các vector cùng dimension và cùng model.
* **Kết luận:** **KIẾN TRÚC ĐÚNG THIẾT KẾ VÀ KHÔNG GÂY LỖI.**
