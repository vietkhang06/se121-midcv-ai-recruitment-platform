# Gia Khang 65–79 — hợp đồng bổ sung, 02/11/2026

Tài liệu mô tả source hiện tại; bằng chứng kiểm thử nằm trong GIA_KHANG_65_79_REPORT.md. Không thay thế các quyết định kiến trúc hoặc công thức scoring hiện hành.

## Draft và confirm

`GET /api/v1/candidate/cvs/{id}/draft` bổ sung `version_id`, `revision` và `presentation`. Revision là SHA-256 của identity/status/title/content phiên bản, dùng kiểm soát optimistic concurrency dưới parent-row lock hiện có.

`PUT /api/v1/candidate/cvs/{id}/draft` và `POST /api/v1/candidate/cvs/{id}/confirm` nhận `version_id`, `expected_revision`. Client review/builder gửi hai trường này; bản cũ được giữ tương thích khi không gửi. Khi gửi revision/version cũ: `409 CONCURRENT_MODIFICATION`. Vì còn tương thích client cũ, đây không phải yêu cầu revision bắt buộc trên mọi request. Presentation hiện lưu `{ "template": "simple|editorial|..." }` do builder cung cấp. Confirm vẫn dùng endpoint hiện có, giữ nguyên quy tắc CONFIRMED và fork draft mới.

## OCR review tách khỏi extraction

- `POST /api/v1/candidate/cvs/{id}/ocr-review`: body `{version_id, expected_revision}`; chỉ draft của chủ sở hữu, extraction đã xong. Trả `data: {proposal, revision, version_id}`. Proposal được lưu vào draft nên revision thay đổi; client phải dùng revision mới khi apply.
- `POST /api/v1/candidate/cvs/{id}/ocr-review/apply`: body `{version_id, expected_revision, accepted_indices: [0], confirmed: true}`. Phải chọn ít nhất một sửa và xác nhận rõ ràng. Trả draft cập nhật. Không nhận proposal tùy ý từ client; đọc proposal đã lưu và kiểm tra lại raw-text SHA với worker.
- Worker: `POST /internal/ai/cv/ocr-review` nhận `{raw_text}`, trả `{source_sha256, edits: [{start,end,before,after}], provider, model, fallback_used, warnings}`. Offset nửa mở `[start,end)` được tính cục bộ.
- Worker apply: `POST /internal/ai/cv/ocr-review/apply` nhận `{raw_text, proposal, accepted_indices, confirmed:true}`. Trả `corrected_text` và audit metadata; stale/unsafe proposal trả 409, body không hợp lệ trả 422. Output provider không an toàn/sai schema bị từ chối.
- Chỉ sửa typography allowlist trong phần mô tả draft. Giữ file gốc, raw text, extraction snapshot, card ID, contacts, links và trường người dùng khác. Bỏ qua ở UI không gọi apply; không cần endpoint xóa dữ liệu nguồn. LLM không chạy trong extractor.

## Gap theo JD

`GET /api/v1/candidate/match/{jobId}/gap-analysis?cvId={id}`: candidate sở hữu CV, phiên bản mới nhất CONFIRMED, job PUBLISHED và company không suspended. Worker nhận danh sách skill của phiên bản đó cùng required/preferred skills của JD. Response có `job_id`, `cv_version_id`, `evidence_assessment: NOT_REQUESTED`, `gap_breakdown`, `tailored_roadmap` và metadata nguồn roadmap. Không có save/application creation. Evidence chưa kiểm tra không được diễn đạt thành đã xác minh hoặc thiếu minh chứng thực tế. Frontend có loading/error/retry, chỉ liệt kê CV CONFIRMED.

## Vector, score và truy vết

Migration additive V31 mở rộng `cvs.file_type` để giữ MIME DOCX đầy đủ; V32 thêm `embeddings.source_sha256`, entity type `CV_VERSION`, lookup index. V29/V30 của master được giữ nguyên. Cache dùng confirmed version ID + model + dimension + professional-content hash; JD source gồm title, description và requirements. Cache có transaction riêng để lỗi SQL không phá transaction chấm điểm bên ngoài. Preview không ghi cache. SQL cosine chạy trên pgvector; provider không dùng được thì ghi rõ concept fallback. Vector mock chỉ kiểm tra hợp đồng/toán học, không chứng minh chất lượng semantic.

Matching snapshot giữ CV version/hash, JD title/hash/requirements và semantic method/model. Inspection dùng snapshot đã lưu. Dữ liệu legacy thiếu snapshot trả trạng thái thiếu dữ liệu thay vì tự ghép CV/JD hiện tại. Candidate/application engine và HR screening engine giữ công thức/phiên bản riêng như DEC-08.

Backend→worker có connect timeout 3 giây, response timeout mặc định 960 giây (cấu hình được), không tự retry POST tốn chi phí. UI chờ trạng thái terminal của job và cho hủy chờ bằng AbortSignal; đóng UI không có nghĩa job server đã bị hủy. Không còn giới hạn 60 lượt polling.
