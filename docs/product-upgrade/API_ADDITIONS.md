# API bổ sung — 04/11/2026

| API | Quyền | Tác dụng |
|---|---|---|
| POST `/api/v1/auth/login` | Public | Thêm expectedRole tùy chọn: CANDIDATE/HR/ADMIN; cổng riêng luôn gửi giá trị này. |
| POST `/api/v1/auth/register/recruiter` | Public | Thêm phone, companyTaxCode, companyAddress bắt buộc. |
| POST `/api/v1/recruiter/company/business-license` | HR | Multipart file; kiểm tra PDF/PNG/JPEG, tối đa 5 MB. |
| GET `/api/v1/admin/companies/{id}/business-license` | ADMIN | Tải tài liệu riêng tư, attachment + no-store. |
| PUT `/api/v1/admin/companies/{id}/trust-level` | ADMIN | `{level:2 hoặc 3,reason}`; doanh nghiệp phải VERIFIED/ACTIVE. |
| GET `/api/v1/recruiter/product/entitlements` | HR | Cấp độ, hạn mức, tin đang đăng, CV đã mở. `-1` là không giới hạn. |
| GET/POST `/api/v1/recruiter/campaigns` | HR | Danh sách / tạo chiến dịch; body `{name,notes,status,jobIds}`. |
| PUT/DELETE `/api/v1/recruiter/campaigns/{id}` | HR | Cập nhật / xóa, chỉ trong doanh nghiệp sở hữu. |
| GET `/api/v1/recruiter/services` | HR | Ví, danh sách gói, lịch sử credit. |
| POST `/api/v1/recruiter/services/purchase` | HR | `{requestId,packageCode,jobId}`; trừ credit, cộng lượt CV, thời hạn ưu tiên tin trong cùng transaction. |
| POST `/api/v1/admin/companies/{id}/credits` | ADMIN | `{requestId,amount,reason}`; idempotent, có lịch sử. |
| POST `/api/v1/recruiter/jobs/draft-suggestion` | HR | `{title,industry,notes,skills}` chuyển tới worker `/internal/ai/draft-jd`, bản gợi ý phải được HR áp dụng. |

Job request/response thêm `occupationCodes`, `descriptionHtml`, `candidateRequirements`, `benefitsContent`, `workAddress`, `workingTime`, `applicationInstructions`, `applicationDeadline`. Response thêm `companyDescription`, `companyDescriptionHtml`, `companyVerified`, `promotedUntil`. Các HTML có giới hạn 100.000 ký tự ở request và luôn render bằng allowlist frontend.

CV draft thêm `presentation` được lưu trong `structured_json_content`: template, photo (data URI PNG/JPEG/WebP), font, fontSize, lineHeight, accent, sectionOrder, hiddenSections. Không đưa presentation vào scoring input.

Ứng tuyển thêm `aiAnalysisConsent` mặc định false, `coverLetter` tối đa 5.000 ký tự. Khi true lưu timestamp và version `midcv-ai-v1`. Response có cờ đồng ý, coverLetter và trạng thái `CONSENT_NOT_GIVEN` khi không đồng ý. Không có endpoint tự bật đồng ý từ HR. Full raw/structured snapshot chỉ trả qua detail đã kiểm tra quyền và hạn mức, không trả trong danh sách.

Migration mới duy nhất V35; giữ nguyên checksum V1–V34. Không có thay đổi package-lock.json, package.json, pom.xml hoặc requirements.
