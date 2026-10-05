# Đặc Tả Kiến Trúc & Module Xác Minh Doanh Nghiệp (Company Verification)

---

## I. Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis)

### 1. Sự Cố Ambiguous Mapping (Trùng Lặp Endpoint Khởi Động)

Khi Spring Boot khởi động, `RequestMappingHandlerMapping` quét toàn bộ bean `@RestController` và phát hiện hai phương thức cùng đăng ký URL:

```text
PUT /api/v1/admin/companies/{id}/verification
```

Nguồn gốc xung đột:
1. `com.platform.recruitment.company.CompanyController`:
   - `@RequestMapping("/api/v1")`
   - `@PutMapping("/admin/companies/{id}/verification")`
   - Phương thức: `updateVerificationStatus(UUID id, CompanyVerification status)`
   - Vấn đề: `CompanyController` thuộc domain Recruiter/Public nhưng lại chứa endpoint quản trị của Admin, xử lý trực tiếp qua `CompanyService` mà không có kiểm tra phân quyền chi tiết, audit log, lý do bắt buộc hay optimistic locking.

2. `com.platform.recruitment.admin.AdminPortalController`:
   - `@RequestMapping("/api/v1/admin")`
   - `@PutMapping("/companies/{id}/verification")`
   - Phương thức: `updateVerificationLegacy(User adminUser, UUID id, CompanyVerification status, String reason, ...)`
   - Vấn đề: Cùng ánh xạ vào đường dẫn giống hệt nhau, gây ra ngoại lệ nghiêm trọng `IllegalStateException: Ambiguous mapping` làm sập tiến trình khởi động Spring Boot.

### 2. Sự Cố `GET /api/v1/recruiter/company` Trả 500 Internal Server Error

Khi Admin thẩm định một công ty (`CHANGES_REQUESTED`, `VERIFIED`, `REJECTED`, `SUSPENDED`), trường `reviewed_by` được cập nhật tham chiếu đến thực thể `User`.
- Thực thể `Company` có quan hệ:
  ```java
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reviewed_by")
  private User reviewedBy;
  ```
- Khi `CompanyController.getMyCompany` trả thẳng thực thể JPA `Company` vào `ApiResponse.success(company)`, Jackson ObjectMapper cố gắng serialize trường `reviewedBy`. Do `FetchType.LAZY`, trường này đang là một Hibernate ByteBuddy proxy chưa được khởi tạo.
- Jackson ném ngoại lệ serialization (hoặc ném `LazyInitializationException` nếu ngoài session, hoặc làm lộ thông tin nhạy cảm của Admin như `passwordHash`).
- `GlobalExceptionHandler` bắt ngoại lệ này và chuyển thành mã lỗi mặc định:
  ```json
  {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  }
  ```

---

## II. Mapping Matrix & Consumer Matrix

| Endpoint | HTTP Method | Controller Đích Duy Nhất | Service Xử Lý | Consumer Frontend / Test | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/recruiter/company` | `GET` | `CompanyController` | `CompanyService` | Recruiter Company & Job pages | **EXISTS** (Chuẩn hóa trả DTO, chống 500) |
| `/api/v1/recruiter/company` | `PUT` | `CompanyController` | `CompanyService` | Recruiter Edit Profile form | **EXISTS** (Chuẩn hóa trả DTO) |
| `/api/v1/recruiter/company/submit-verification` | `POST` | `CompanyController` | `CompanyService` | Recruiter Submit/Resubmit | **EXISTS** (Validate & Audit) |
| `/api/v1/admin/companies` | `GET` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Verification Queue | **EXISTS** |
| `/api/v1/admin/companies/{id}` | `GET` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Company Detail | **EXISTS** |
| `/api/v1/admin/companies/{id}/transition` | `POST` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Review Modal | **CANONICAL** |
| `/api/v1/admin/companies/{id}/verification/approve` | `POST` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Quick Action | **CANONICAL ACTION** |
| `/api/v1/admin/companies/{id}/verification/reject` | `POST` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Quick Action | **CANONICAL ACTION** |
| `/api/v1/admin/companies/{id}/verification/request-changes` | `POST` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Quick Action | **CANONICAL ACTION** |
| `/api/v1/admin/companies/{id}/verification/suspend` | `POST` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Quick Action | **CANONICAL ACTION** |
| `/api/v1/admin/companies/{id}/verification/restore` | `POST` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Admin Quick Action | **CANONICAL ACTION** |
| `/api/v1/admin/companies/{id}/verification` | `PUT` | `AdminCompanyVerificationController` | `CompanyVerificationService` | Legacy REST clients | **DEPRECATED & DEDUPED** (Xóa khỏi CompanyController) |

---

## III. State Machine Thẩm Định Doanh Nghiệp

```
       [ RECRUITER NỘP HỒ SƠ ]
                 │
                 ▼
            [ PENDING ] ────────► [ UNDER_REVIEW ] ────────► [ VERIFIED ]
                 │                       │                         │
                 │                       ├────────► [ CHANGES_REQUESTED ] ──┐
                 │                       │                         │        │
                 │                       ▼                         ▼        ▼
                 └───────────────► [ REJECTED ]               [ SUSPENDED ] ◄── (Tự động đình chỉ tin đang mở)
                                         ▲                         │
                                         │ (Recruiter nộp lại)     ▼
                                         └────────────────── [ VERIFIED ] (Khôi phục)
```

1. **Khởi tạo & Nộp hồ sơ**:
   - Recruiter cập nhật hồ sơ pháp lý (Tên, Mã số thuế, Website, Quy mô).
   - Recruiter nộp thẩm định ➔ Trạng thái chuyển thành `PENDING`.
2. **Tiếp nhận thẩm định**:
   - Admin tiếp nhận hồ sơ ➔ Chuyển sang `UNDER_REVIEW`.
3. **Quyết định thẩm định**:
   - `VERIFIED`: Đạt chuẩn. Recruiter được cấp quyền xuất bản tin tuyển dụng.
   - `CHANGES_REQUESTED`: Yêu cầu bổ sung kèm lý do bắt buộc. Recruiter cập nhật và resubmit ➔ `PENDING`.
   - `REJECTED`: Từ chối kèm lý do bắt buộc. Recruiter cập nhật và resubmit ➔ `PENDING`.
   - `SUSPENDED`: Đình chỉ công ty đã xác minh kèm lý do bắt buộc. Hệ thống tự động chuyển tất cả tin tuyển dụng `PUBLISHED` sang `SUSPENDED`.
   - `RESTORE`: Khôi phục công ty bị đình chỉ về `VERIFIED`.

---

## IV. Kế Hoạch Tái Cấu Trúc (Implementation Plan)

1. **Tạo `CompanyDto` / `CompanyResponse`**:
   - DTO an toàn cho Recruiter API, không lộ JPA Proxy hoặc thông tin nhạy cảm của Admin.
2. **Xây dựng `CompanyVerificationService` độc lập**:
   - Sở hữu toàn bộ logic chuyển đổi trạng thái, khóa lạc quan (Optimistic Locking với `version`), ghi log kiểm toán bất biến qua `AdminAuditLogService`, và cascading job suspension khi công ty bị đình chỉ.
3. **Chuẩn hóa `CompanyController`**:
   - Giữ lại các endpoint nghiệp vụ của Recruiter (`getMyCompany`, `updateMyCompany`, `submitVerification`).
   - Xóa bỏ hoàn toàn mapping trùng `PUT /admin/companies/{id}/verification`.
4. **Tạo / Chuẩn hóa `AdminCompanyVerificationController`**:
   - Trở thành controller duy nhất sở hữu toàn bộ endpoint `/api/v1/admin/companies/**`.
   - Cung cấp cả endpoint canonical action-based (`/transition`, `/approve`, `/reject`, v.v.) và duy trì duy nhất một endpoint legacy `PUT /verification` delegate sang `CompanyVerificationService`.
5. **Kiểm thử tự động & Xác minh Context**:
   - Viết test context-load để đảm bảo Spring Boot khởi động 100% không còn ambiguous mapping.
   - Viết unit & integration tests kiểm thử toàn diện toàn bộ state transitions, concurrency (409 Conflict), authorization (401/403) và publish job gating.
