# MidCV — HTTP Security Matrix (S01)

Ngày: 01/11/2026. Phạm vi: API `/api/v1`, JWT access/refresh, role `CANDIDATE` / `HR` / `ADMIN`, tenant theo company và quyền theo participant. Đây là ma trận cần dùng khi nghiệm thu HTTP; source mapping không tự được xem là bằng chứng live.

## 1. Ma trận route-level

| API / phương thức | Anonymous | Candidate | HR | Admin | Kiểm tra bổ sung bắt buộc |
|---|---:|---:|---:|---:|---|
| `POST /auth/register/**`, `POST /auth/login`, verify/reset/resend, OAuth start/callback/exchange | Public theo luồng | Public theo luồng | Public theo luồng | Public theo luồng | Link OAuth phải có phiên đã xác thực; state/callback do OAuth service xác minh |
| `POST /auth/refresh` | Public endpoint | Refresh token hợp lệ | Refresh token hợp lệ | Refresh token hợp lệ | Refresh token dùng một lần/rotation; không được dùng làm access token |
| `GET /jobs`, `GET /jobs/{id}` | 200 nếu tin công khai tồn tại | 200 | 200 | 200 | Chỉ dữ liệu công khai; không lộ hồ sơ ứng tuyển hoặc thông tin nội bộ |
| `GET /taxonomy/skills/search`, `/industries`, `/categories` | Public | Public | Public | Public | Các API quản trị taxonomy vẫn nằm trong `/admin/**` |
| `/candidate/**` | 401 | Cho phép theo ownership | 403 | 403 | Candidate chỉ được đọc/sửa profile, CV, application và dữ liệu của chính mình |
| `POST /processing/candidate/**`, `POST /processing/cvs/**` | 401 | Cho phép theo ownership | 403 | 403 | CV/job/profile ID phải thuộc candidate hiện tại |
| `/recruiter/**` | 401 | 403 | Cho phép theo tenant | 403 | HR chỉ được quản lý job/application của company gắn với recruiter profile |
| `POST /jobs/draft`, `POST /jobs/{id}/publish`, `/close`, `PUT /jobs/{id}`, `DELETE /jobs/{id}` | 401 | 403 | Cho phép theo tenant và trạng thái | 403 | Không cho HR công ty B thay đổi tin công ty A; company phải VERIFIED/ACTIVE khi publish |
| `GET/PUT /jobs/{id}/matching-policy`, `POST /jobs/{id}/matching/recalculate` | 401 | Bị service từ chối | HR sở hữu job | Admin | Ownership kiểm tra trong `JobMatchingPolicyService`; Admin không thay thế quyền chat participant |
| `POST /processing/jobs/**`, `POST /matching/jobs/*/candidates/*`, `GET /matching/jobs/*/rankings` | 401 | 403 | HR | Admin | Job/applicant ownership và suspension guard vẫn phải được kiểm tra trong service |
| `/hr/**` | 401 | 403 | Cho phép | Cho phép | Tenant/ownership vẫn áp dụng trong service |
| `/admin/**` | 401 | 403 | 403 | Cho phép | Tất cả quản trị users/jobs/reports/taxonomy/verification/appeals/audit là Admin-only |
| `/inbox/**` | 401 | Chỉ participant candidate | Chỉ participant HR | Chỉ participant nếu Admin thực sự là participant | Admin không có quyền đọc chat riêng chỉ vì có role ADMIN; application và company phải khớp |
| `/account/**`, `/suspensions/my-active`, các route authenticated khác | 401 | Theo user hiện tại | Theo user hiện tại | Theo user hiện tại | User không được truyền userId khác để đọc/sửa tài khoản của người khác |
| `/actuator/health/**` | Được phép trong mạng Docker | — | — | — | Không được route qua Caddy ra Internet; không bật health details |

**Ghi chú:** Các route ngoài nhóm public/role matcher vẫn yêu cầu xác thực qua `.anyRequest().authenticated()`. Việc cho phép ở filter chain không thay thế ownership/tenant checks bên service. Đặc biệt, matching policy có thể cho Admin thao tác; chat riêng thì không.

## 2. Quy tắc token

1. API business chỉ chấp nhận access token trong header `Authorization: Bearer <accessToken>`.
2. Refresh token chỉ gửi trong body của `POST /api/v1/auth/refresh`; không gửi nó như Bearer access token.
3. Không chấp nhận `access_token`, `token` hoặc refresh token trong query string.
4. Filter xác minh JWT, loại token, session còn hiệu lực, trạng thái user và vai trò đang lưu trong DB. Khi role/status trong DB thay đổi, token cũ không được giữ quyền cũ.
5. User `DEACTIVATED` không được tiếp tục sử dụng API. User/công ty đang `SUSPENDED` bị chặn các nghiệp vụ tương ứng; endpoint xem thông báo/appeal vẫn theo đúng policy của domain.

## 3. Ma trận tenant/ownership

| Actor | Tài nguyên | Kết quả kỳ vọng |
|---|---|---|
| Candidate A | Profile/CV/application của A | Được phép |
| Candidate B | Profile/CV/application của A | 403 hoặc 404 theo chính sách không tiết lộ tài nguyên; không trả dữ liệu |
| HR công ty A | Job/application của công ty A | Được phép nếu company/user hoạt động |
| HR công ty B | Private job/application của công ty A | 403 hoặc 404; không trả dữ liệu |
| HR công ty A | Job public của công ty B qua `GET /jobs/{id}` | Được phép xem phần public, không được xem recruiter-private application/screening |
| Admin | `/admin/**` | Được phép, có audit khi thực hiện thao tác quản trị |
| Admin | Conversation mà Admin không tham gia | 404; không có bypass chỉ dựa trên role Admin |

## 4. CORS và reverse proxy

- `app.security.cors.allowed-origins` được đọc từ `CORS_ALLOWED_ORIGINS`, là danh sách origin phân tách bằng dấu phẩy.
- Không dùng wildcard `*` khi `allowCredentials=true`; ứng dụng từ chối cấu hình wildcard hoặc danh sách rỗng.
- Allowed methods gồm `GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS`; `PATCH` cần thiết cho route cập nhật metadata.
- Caddy chỉ reverse proxy `/api/*` và Swagger/OpenAPI về backend. Actuator và `/internal/ai/**` không được expose công khai.

## 5. Test bắt buộc và lệnh chạy

Regression trong source:

```powershell
cd backend
mvn -Dtest=SpringSecurityRbacAndMultiTenantIntegrationTest test
```

HTTP + PostgreSQL trên database test loopback mới:

```powershell
cd ..
python scripts/Verify-MidcvBusinessTasks.py --http --port 55439
```

Các test live mới cần môi trường có tài khoản Candidate, HR công ty A, HR công ty B và Admin:

```powershell
cd frontend
$env:MIDCV_E2E_API_URL = "http://127.0.0.1:8080"
$env:MIDCV_E2E_CANDIDATE_EMAIL = "..."
$env:MIDCV_E2E_CANDIDATE_PASSWORD = "..."
$env:MIDCV_E2E_HR_A_EMAIL = "..."
$env:MIDCV_E2E_HR_A_PASSWORD = "..."
$env:MIDCV_E2E_HR_B_EMAIL = "..."
$env:MIDCV_E2E_HR_B_PASSWORD = "..."
$env:MIDCV_E2E_ADMIN_EMAIL = "..."
$env:MIDCV_E2E_ADMIN_PASSWORD = "..."
$env:MIDCV_E2E_HR_A_JOB_ID = "<job-id-thuoc-company-A>"
$env:MIDCV_E2E_HR_A_APPLICATION_ID = "<application-id-thuoc-company-A>"
npm run test:e2e -- fullstack-live-acceptance.spec.ts
```

Bài `TaskHttpAcceptanceTest.businessHttpSecurityMatrixCoversRolesTokensAndTenantOwnership` tạo fixture trong database test tạm và kiểm tra quyền qua HTTP thật. `fullstack-live-acceptance.spec.ts` dùng tài khoản và dữ liệu có sẵn trên môi trường test, không mock response. Chỉ ghi nhận S01 PASS sau khi lưu log/status thực tế; không lấy việc file test tồn tại làm bằng chứng.
