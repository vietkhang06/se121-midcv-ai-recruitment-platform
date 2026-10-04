# ADMIN MODERATION WORKFLOWS & ACTOR BOUNDARIES SPECIFICATION (MIDCV)

Tài liệu này xác lập quy chuẩn kỹ thuật, ma trận truy vết (Traceability Matrix), máy trạng thái (State Machines), và ranh giới phân quyền bất biến (Actor Permission Boundaries) cho actor **ADMIN** trong hệ thống **MidCV**.

---

## 1. Ranh Giới Phân Quyền Bất Biến (Actor Permission Boundaries)

| Actor | Quyền được phép (Allowed) | Điều cấm kỵ (Strictly Prohibited) |
| :--- | :--- | :--- |
| **Candidate** | • Đăng ký tài khoản & xác thực email.<br>• Quản lý hồ sơ cá nhân & upload CV.<br>• Review, chỉnh sửa thẻ lặp & xác nhận CV extraction (`CONFIRMED`).<br>• Tải minh chứng chứng chỉ/ngoại ngữ.<br>• Nộp đơn ứng tuyển vào job hợp lệ.<br>• Theo dõi trạng thái ứng tuyển. | ❌ Tự xác minh tài khoản cấp quản trị.<br>❌ Tự đánh dấu minh chứng là hợp lệ.<br>❌ Sửa điểm matching hoặc reason codes.<br>❌ Can thiệp application status do Recruiter quản lý.<br>❌ Truy cập `/admin` hoặc `/recruiter` hoặc xem hồ sơ Candidate khác. |
| **Recruiter** | • Quản lý hồ sơ công ty thuộc quyền.<br>• Gửi công ty lên Admin để xét duyệt (`PENDING`).<br>• Tạo và lưu job draft.<br>• Chỉ publish job khi công ty `VERIFIED`.<br>• Xem applications, CV snapshot, điểm AI matching, bằng chứng GitHub.<br>• Đưa ra quyết định tuyển dụng (Shortlist, Interview, Hire, Reject). | ❌ Tự xác minh công ty của mình hoặc công ty khác.<br>❌ Sửa trạng thái verification của company.<br>❌ Xem application của company khác (Tenant Isolation).<br>❌ Sửa điểm matching do AI tính toán.<br>❌ Khóa, suspend tài khoản người dùng khác.<br>❌ Thực hiện tác vụ Admin (`/api/v1/admin/**`). |
| **Admin** | • Thẩm định hồ sơ pháp lý & xét duyệt công ty (`UNDER_REVIEW`, `VERIFIED`, `CHANGES_REQUESTED`, `REJECTED`, `SUSPENDED`).<br>• Quản trị trạng thái an toàn tài khoản (`ACTIVE`, `SUSPENDED`) kèm lý do & audit log.<br>• Kiểm duyệt tin tuyển dụng vi phạm (`SUSPENDED`, `RESTORED`).<br>• Xử lý báo cáo vi phạm (`RESOLVED`, `DISMISSED`).<br>• Quản lý Skill Taxonomy chuẩn (Active, Inactive, Canonical Key).<br>• Cấu hình hệ thống & AI Engine được phép (API Key masked).<br>• Xem audit log quản trị toàn hệ thống. | ❌ Sửa CV, sửa thẻ lặp hoặc confirm CV thay Candidate.<br>❌ Can thiệp hoặc sửa điểm matching của thuật toán.<br>❌ Đưa ra quyết định tuyển dụng (Shortlist, Hire, Reject) thay Recruiter.<br>❌ Tải hoặc xem dữ liệu nhạy cảm không phục vụ mục đích quản trị.<br>❌ Thao tác dữ liệu mà không ghi nhận audit log.<br>❌ Lưu hoặc hiển thị secret, password hash, raw token. |
| **AI Worker** | • Trích xuất văn bản thô (local libraries: `pdfplumber`, `pytesseract`).<br>• Cấu trúc hóa CV nháp (`DRAFT`).<br>• Chuẩn hóa Taxonomy kỹ năng.<br>• Tạo embedding vector & tính điểm đối sánh toán học.<br>• Khai phá bằng chứng GitHub công khai. | ❌ Duyệt hoặc xác minh công ty.<br>❌ Kích hoạt hoặc suspend người dùng.<br>❌ Xuất bản hoặc gỡ job.<br>❌ Ra quyết định tuyển dụng đậu/rớt thay con người. |

---

## 2. Máy Trạng Thái (State Machines)

### 2.1. Company Verification State Machine
```text
           [Recruiter Submit]
 [DRAFT] ───────────────────────────► [PENDING]
                                          │
                                          │ [Admin Start Review]
                                          ▼
                                   [UNDER_REVIEW]
                                    │    │    │
          ┌─────────────────────────┘    │    └──────────────────────────┐
          │ [Request Changes]            │ [Approve]                     │ [Reject]
          ▼                              ▼                               ▼
 [CHANGES_REQUESTED]                [VERIFIED]                       [REJECTED]
          │                              │
          │ [Recruiter Resubmit]         │ [Admin Suspend]
          ▼                              ▼
      [PENDING]                     [SUSPENDED]
                                         │
                                         │ [Admin Restore]
                                         ▼
                                    [VERIFIED]
```
- **Quy tắc bắt buộc**: 
  - Chỉ công ty ở trạng thái **`VERIFIED`** mới được phép publish job (`JobService.publishJob`).
  - Khi công ty bị **`SUSPENDED`**, recruiter không thể publish thêm job mới.
  - Mọi chuyển đổi trạng thái phải lưu: `reviewed_by`, `reviewed_at`, `review_notes`, `previous_status`, `new_status` và ghi `admin_audit_logs`.
  - Hỗ trợ Optimistic Locking (`version`) để chặn 2 Admin xử lý đồng thời gây xung đột (409 Conflict).

### 2.2. User Account Moderation State Machine
```text
              [Admin Suspend (with reason)]
   [ACTIVE] ─────────────────────────────────► [SUSPENDED]
      ▲                                             │
      │                                             │
      └─────────────────────────────────────────────┘
              [Admin Reactivate (with audit)]
```
- **Quy tắc bắt buộc**:
  - Khi `user.is_active = false`: `JwtAuthenticationFilter` và `AuthService.login` từ chối phiên đăng nhập ngay lập tức.
  - Admin không hard-delete Candidate/Recruiter đã có lịch sử nộp đơn / đăng tin nhằm bảo toàn tính toàn vẹn dữ liệu tuyển dụng.
  - Phải ghi nhận lý do đình chỉ (`reason`) và lưu audit log.

### 2.3. Job Moderation State Machine
```text
  [Recruiter Draft] ──► [PUBLISHED] ──► [CLOSED]
                              │            ▲
                              │ [Admin     │ [Admin
                              │  Suspend]  │  Restore]
                              ▼            │
                         [SUSPENDED] ──────┘
```
- **Quy tắc bắt buộc**:
  - Admin có quyền đình chỉ hiển thị job vi phạm chính sách (`SUSPENDED`).
  - Tuyệt đối không sửa nội dung JD thay Recruiter.
  - Ghi nhận `moderation_reason` và audit log.

### 2.4. Report Violation State Machine
```text
  [User Reports] ──► [PENDING]
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
  [RESOLVED]                      [DISMISSED]
```
- Đối tượng bị báo cáo (`target_type`): `JOB`, `COMPANY`, `CANDIDATE`, `RECRUITER`.
- Admin xử lý kèm ghi chú quyết định (`resolution_notes`) và hành động quản trị tương ứng.

---

## 3. Ma Trận Truy Vết (Traceability Matrix)

| Use Case | Frontend Route / Component | API Function | Backend Endpoint | Controller | Service | Entity / Table | Test Class | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Dashboard Stats** | `/admin`<br>`AdminDashboardPage` | `fetchAdminDashboardStats()` | `GET /api/v1/admin/dashboard` | `AdminController` | `AdminService` | `users`, `companies`, `jobs`, `system_reports` | `AdminIntegrationTest` | **MISSING** (Cần triển khai backend & nối UI thật) |
| **Company Verification Queue** | `/admin/companies`<br>`AdminCompaniesPage` | `fetchAdminCompanies()` | `GET /api/v1/admin/companies` | `AdminController` | `AdminCompanyService` | `companies`, `recruiter_profiles` | `AdminCompanyVerificationIntegrationTest` | **BROKEN** (UI đang dùng Mock data 3 item) |
| **Company Review Detail** | `/admin/companies/[id]` | `fetchAdminCompanyDetail(id)` | `GET /api/v1/admin/companies/{id}` | `AdminController` | `AdminCompanyService` | `companies`, `users` | `AdminCompanyVerificationIntegrationTest` | **MISSING** |
| **Company Review Transitions** | `/admin/companies`<br>Action Modals | `updateCompanyVerification()` | `POST /api/v1/admin/companies/{id}/transition` | `AdminController` | `AdminCompanyService` | `companies`, `admin_audit_logs` | `AdminCompanyVerificationIntegrationTest` | **PARTIAL** (Chỉ có PUT thô, thiếu transition, notes & audit) |
| **Candidate Moderation** | `/admin/users`<br>`AdminCandidatesTab` | `fetchAdminCandidates()`, `toggleUserStatus()` | `GET /api/v1/admin/candidates`<br>`POST /api/v1/admin/users/{id}/suspend`<br>`POST /api/v1/admin/users/{id}/reactivate` | `AdminController` | `AdminUserService` | `users`, `candidate_profiles`, `admin_audit_logs` | `AdminUserModerationIntegrationTest` | **MISSING** |
| **Recruiter Moderation** | `/admin/users`<br>`AdminRecruitersTab` | `fetchAdminRecruiters()` | `GET /api/v1/admin/recruiters` | `AdminController` | `AdminUserService` | `users`, `recruiter_profiles`, `companies` | `AdminUserModerationIntegrationTest` | **MISSING** |
| **Job Moderation** | `/admin/moderation`<br>`AdminJobsTab` | `fetchAdminJobs()`, `suspendJob()`, `restoreJob()` | `GET /api/v1/admin/jobs`<br>`POST /api/v1/admin/jobs/{id}/suspend`<br>`POST /api/v1/admin/jobs/{id}/restore` | `AdminController` | `AdminJobModerationService` | `jobs`, `companies`, `admin_audit_logs` | `AdminJobModerationIntegrationTest` | **MISSING** |
| **Report Handling** | `/admin/moderation`<br>`AdminReportsTab` | `fetchAdminReports()`, `resolveReport()`, `dismissReport()` | `GET /api/v1/admin/reports`<br>`POST /api/v1/admin/reports/{id}/resolve`<br>`POST /api/v1/admin/reports/{id}/dismiss` | `AdminController` | `AdminReportService` | `system_reports`, `admin_audit_logs` | `AdminReportIntegrationTest` | **MISSING** |
| **Taxonomy Management** | `/admin/taxonomy`<br>`AdminTaxonomyPage` | `fetchAdminTaxonomySkills()`, `createSkill()`, `toggleSkill()` | `GET /api/v1/admin/taxonomy/skills`<br>`POST /api/v1/admin/taxonomy/skills`<br>`PUT /api/v1/admin/taxonomy/skills/{id}/toggle` | `AdminController` | `TaxonomyService` | `taxonomy_skills`, `taxonomy_aliases` | `AdminTaxonomyIntegrationTest` | **MISSING** |
| **System AI Settings** | `/admin/ai-settings`<br>`AiSettingsPanel` | `fetchAiSettings()`, `updateAiSettings()`, `testAiSettings()` | `GET /api/admin/ai-settings`<br>`PUT /api/admin/ai-settings`<br>`POST /api/admin/ai-settings/test` | `AdminController` | `AiClient` | `system_ai_settings` | `AdminControllerTest` | **EXISTS** (Hoạt động tốt, đã mask API key) |
| **Audit Logs Viewer** | `/admin/audit-logs`<br>`AdminAuditLogsPage` | `fetchAdminAuditLogs()` | `GET /api/v1/admin/audit-logs` | `AdminController` | `AdminAuditLogService` | `admin_audit_logs`, `users` | `AdminAuditLogIntegrationTest` | **MISSING** |
| **Company Publish Gate** | `/recruiter/jobs/create` | `publishJob()` | `POST /api/v1/jobs/{id}/publish` | `JobController` | `JobService` | `jobs`, `companies` | `CompanyVerificationRuleTest` | **EXISTS** (Khóa chặt khi status != VERIFIED) |

---

## 4. Gap Report & Kế Hoạch Khắc Phục

1. **Database Schema**:
   - `companies.verification_status` đang bị giới hạn `CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED'))`.
   - Cần migration `V13__expand_company_verification_and_admin_moderation.sql`:
     - Mở rộng check constraint: `'PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'VERIFIED', 'REJECTED', 'SUSPENDED'`.
     - Thêm cột cho `companies`: `reviewed_by`, `reviewed_at`, `review_notes`, `version` (optimistic locking).
     - Mở rộng `jobs.status` để hỗ trợ `'SUSPENDED'` khi bị kiểm duyệt vi phạm.
     - Tạo bảng `system_reports` (lưu trữ báo cáo vi phạm thật).
     - Tạo bảng `admin_audit_logs` (lưu trữ kiểm toán hành động quản trị bất biến).
2. **Backend API**:
   - Mở rộng `AdminController` hoặc xây dựng các service chuyên trách (`AdminDashboardService`, `AdminCompanyService`, `AdminUserService`, `AdminModerationService`, `AdminAuditLogService`).
   - Chuẩn hóa Typed Error Responses (`COMPANY_NOT_VERIFIED`, `INVALID_STATE_TRANSITION`, `CONCURRENT_MODIFICATION`, `RESOURCE_NOT_FOUND`, `ACCESS_DENIED`).
3. **Frontend Admin Portal**:
   - Xóa bỏ hoàn toàn mock data trong `frontend/src/app/admin/companies/page.tsx`.
   - Bổ sung các trang: `/admin/users`, `/admin/moderation`, `/admin/taxonomy`, `/admin/audit-logs`.
   - Nâng cấp `AdminNavbar` và `AdminDashboardPage` kết nối API thật 100%.
   - Xử lý các trạng thái: Loading, Empty, Error, Pagination, Action confirmation dialogs.
