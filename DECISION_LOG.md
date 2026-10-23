# Nhật Ký Quyết Định Nghiệp Vụ (Decision Log)

Dự án: **MidCV — Nền tảng tuyển dụng thông minh hỗ trợ đối sánh JD–CV**  
Tài liệu ghi nhận: **25/09/2026**

---

## 1. Các Quyết Định Đã Được Xác Nhận (Confirmed Decisions)

### DEC-09 — Đơn vị lương tin tuyển dụng

- **Quyết định:** Mức lương của tin tuyển dụng được biểu diễn theo **VND/tháng**. Giá trị số hiện có được giữ nguyên như đã lưu; không nhân/chia, đổi ngoại tệ hoặc gán lại ý nghĩa cho số `0`/các giá trị lịch sử.
- **Trạng thái thương lượng:** Thêm cờ `salary_negotiable` riêng. `true` yêu cầu amount rỗng; amount rỗng với cờ `false` là chưa công bố. Các dữ liệu cũ nhận mặc định `false` và không được gọi là thương lượng.
- **Căn cứ:** Chủ dự án xác nhận trong yêu cầu triển khai ngày 21/10/2026; code cũ mâu thuẫn giữa nhãn USD/tháng, formatter VND và giá trị lịch sử.
- **Tác động:** API giữ amount dạng số, đơn vị VND/tháng; giao diện parse/format theo locale và không tự scale. Migration additive `V23__explicit_job_salary_terms.sql`.

### DEC-10 — Tiền tệ lương có thể chọn

- **Quyết định:** Theo xác nhận của chủ dự án ngày 22/10/2026, mỗi tin tuyển dụng chọn một tiền tệ ISO 4217 trong danh sách VND, USD, EUR, GBP, JPY, CNY, KRW, SGD, AUD và CAD. Kỳ lương vẫn là MONTH và được lưu độc lập với mã tiền tệ.
- **Bảo toàn dữ liệu:** Toàn bộ số tiền lịch sử giữ nguyên và được gán VND/tháng theo xác nhận trước đó của chủ dự án; không quy đổi hoặc scale. DEC-10 thay thế phần “VND-only API” của DEC-09, không thay đổi quyết định bảo toàn số cũ hay quy tắc negotiable/undisclosed.
- **Quy tắc:** Cùng một bản ghi chỉ so sánh/lọc trong cùng currency. Dữ liệu số dùng DECIMAL, không quy đổi tỷ giá; giao diện format theo locale nhưng đổi ngôn ngữ không đổi mã tiền.
- **Tác động:** Hợp đồng API có `salaryCurrency`, migration additive V25, không sửa V23 đã áp dụng. Migration mặc định các hàng hiện hữu sang VND, giữ nguyên `min_salary`/`max_salary`.

### DEC-11 — Ngoại lệ giao diện CV: bỏ ngành nghề định hướng và vị trí mục tiêu

- **Quyết định:** Theo xác nhận của chủ dự án ngày 23/10/2026, luồng CV được tải lên không hiển thị hoặc yêu cầu “Ngành nghề định hướng”, “Vị trí mong muốn”, hay trường tương đương “Tiêu đề nghề nghiệp / Headline”. Ngoại lệ này áp dụng cho form tải CV, thẻ CV trong thư viện và modal rà soát/chỉnh sửa CV đã tải lên.
- **Phạm vi dữ liệu:** Không xóa cột, schema, giá trị lịch sử hoặc nội dung extraction. Khi API cập nhật toàn bộ draft, frontend giữ lại các trường ẩn đang có trong dữ liệu tải về để tránh vô tình xóa chúng. Nghề nghiệp thực tế trong kinh nghiệm làm việc, vai trò dự án và dữ liệu ứng tuyển không bị ảnh hưởng.
- **Căn cứ:** Chủ dự án ưu tiên luồng rà soát CV đã upload không có trường định hướng nghề nghiệp, dù `DOMAIN_RULES.md` hiện liệt kê “Tiêu đề nghề nghiệp” trong khu vực Thông tin cá nhân.
- **Tác động:** Đây là ngoại lệ có phạm vi UI đối với `DOMAIN_RULES.md`; API và backend validation chỉ thay đổi nếu kiểm tra cho thấy các trường bị ẩn vẫn là bắt buộc. Không thay đổi quy tắc xác nhận phiên bản CV hoặc matching.

| STT | Mã quyết định | Nội dung quyết định | Căn cứ kỹ thuật & Thẩm quyền | Tác động hệ thống |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **DEC-01: Phân tách vai trò nghiêm ngặt (Strict Role Separation) & Bootstrap an toàn** | Tách biệt hoàn toàn quyền hạn giữa `ADMIN`, `HR` (Recruiter) và `CANDIDATE`. HR không được quyền cấu hình AI; Candidate không được vào HR Portal; Admin không được tạo đơn ứng tuyển giả lập. Khởi tạo tài khoản ADMIN qua biến môi trường (`AdminBootstrapRunner`), tuyệt đối không hardcode credentials trong migration SQL. | Thẩm định bảo mật; Nguyên tắc bảo mật ranh giới tenant; Quyết định nhóm đồ án. | Cập nhật `SecurityConfig.java`, `AdminController.java`, `JwtAuthenticationFilter.java`, tạo `RoleGuard.tsx` và `AdminBootstrapRunner.java`. |
| **2** | **DEC-02: Cơ chế Gating kỹ năng bắt buộc (Required Skill Gating)** | Ứng viên thiếu kỹ năng bắt buộc (Required Skill) trong JD phải bị ghi nhận `required_skills_missing > 0` và tuyệt đối không được xếp trên ứng viên đủ kỹ năng bắt buộc, bất kể điểm kỹ năng ưu tiên cao đến đâu. | Yêu cầu bắt buộc từ GVHD (Req K, TEST-06, TEST-07); `docs/final/do-an-1-material.md`. | Triển khai trong `MatchingEngineService.java` và `CandidateRankingTest.java`. |
| **3** | **DEC-03: Đánh giá GitHub 4 nhánh trung tính (Neutral GitHub 4 Branches)** | Hoạt động GitHub chỉ là tín hiệu bổ trợ (tối đa 15%). Nếu ứng viên không có GitHub, repository private, API rate limit hoặc JD ngành phi kỹ thuật -> Fallback $S_{overall} = S_{core}$ với 0 điểm phạt. | Yêu cầu bắt buộc từ GVHD (Req D, E, L, M, TEST 01-05). | Triển khai trong `GitHubScoringService.java` và `GoldenMatchingCasesTest.java`. |
| **4** | **DEC-04: Kiến trúc Dual Vector (1024D & 1536D)** | Duy trì hỗ trợ cả 2 mô hình Vector Embedding: 1536 chiều cho OpenAI Cloud API (`text-embedding-3-small`) và 1024 chiều cho Local Ollama (`bge-m3`), lưu trữ trên 2 cột riêng biệt với 2 chỉ mục HNSW độc lập. | Migration V1, V2, V7; Đáp ứng cả 2 tiêu chí bảo mật on-premise nội bộ và độ chính xác cloud API. | Bảng `embeddings` và `document_versions`. |
| **5** | **DEC-05: 9Router là phương án tham khảo, không phải dependency bắt buộc** | 9Router được thảo luận như một gateway kết nối LLM tiềm năng, nhưng hệ thống hiện tại đã có `LLMClient` tích hợp sẵn cả Ollama Local và OpenAI Cloud API chuẩn OpenAI-compatible. Do đó không ép buộc 9Router vào stack. | Chỉ dẫn người dùng; Nguyên tắc không tự ý thêm dependency khi chưa phê duyệt. | Giữ nguyên kiến trúc `LLMClient` hiện có trong `ai-worker`. |
| **6** | **DEC-06: Tách 3 lớp dữ liệu CV, bảo toàn GPA rõ ràng, quản lý minh chứng UNVERIFIED & Matching đọc Confirmed Profile** | Phân định rạch ròi 3 lớp dữ liệu: (1) Extraction Snapshot bất biến (file gốc, raw text, structured JSON ban đầu trong `document_versions`), (2) Candidate Review Draft chỉnh sửa linh hoạt (`cv_versions.structured_json_content` trạng thái DRAFT), (3) Confirmed Profile chính thức khi người dùng xác nhận (`CVVersion` CONFIRMED). GPA được trích xuất và bảo toàn nguyên văn nếu có thang điểm (7.8/10, 8.3/10, 3.6/4.0), không tự suy đoán nếu thiếu, hiển thị 'Không cung cấp GPA'. Minh chứng chứng chỉ/ngoại ngữ lưu vào storage nội bộ với trạng thái `UNVERIFIED` (HR xác thực ở phase sau). Matching Engine bắt buộc đọc dữ liệu đã xác nhận (Confirmed Profile) thay vì chỉ đọc raw text cũ. | Yêu cầu nghiệp vụ; Nguồn sự thật Single Source of Truth; Nguyên tắc Chống Bịa (Anti-Fabrication). | Cập nhật `API_CONTRACT.md`, tạo migration `V11__add_cv_evidence_attachments.sql`, cập nhật `CVService.java`, `MatchingEngineService.java`, AI Worker và Frontend. |
| **7** | **DEC-07: Cô lập Candidate Profile khỏi CV Draft, chuẩn hóa Canonical Draft Schema v2 & quản lý UUID ổn định cho minh chứng** | (1) Tuyệt đối không fallback thông tin từ `CandidateProfile` vào `personal_info` của CV Draft để chống nhiễm chéo dữ liệu; (2) Lưu `raw_structured_content` vào `cv_versions` (Migration V12) để bảo toàn snapshot AI extraction độc lập cho từng version; (3) Cấu trúc canonical thống nhất: `personal_info` đầy đủ alias, `summary.content`, `work_experience`, mọi nested item có UUID ổn định; (4) Phân giải provenance tất định ở backend (`CV_EXTRACTED`, `USER_EDITED`, `USER_ADDED`), bỏ qua client spoofing; (5) Attachment upload kiểm tra ownership, draft existence và UUID hợp lệ (trả 400 nếu ID sai định dạng, 404 nếu item không có trong draft); (6) Bảo toàn toàn vẹn dữ liệu người dùng đã chỉnh sửa trên các lần GET tiếp theo mà không tự ý merge đè lại từ extraction. | Yêu cầu nghiệp vụ và tài liệu Single Source of Truth; Nguyên tắc Chống Bịa và Bảo Toàn Dữ Liệu Audit. | Tạo migration `V12__add_raw_structured_to_cv_versions.sql`, cập nhật `CVVersion.java`, `CVService.java`, `MatchingEngineService.java`, `API_CONTRACT.md`, bổ sung `CandidateCvDraftMapperAndProvenanceTest.java`. |

---

## 2. Câu Hỏi Mở & Điểm Cần Chốt Cùng Nhóm / Giảng Viên (Open Questions)

1. **Từ điển chuẩn hóa ngoài ngành CNTT (Non-IT Taxonomy Expansion)**:
   * *Hiện trạng:* Hệ thống hiện chuẩn hóa sâu cho ngành Software/IT (`taxonomy_skills` và `taxonomy_aliases` gồm Java, Python, React, Docker, Postgres...).
   * *Câu hỏi mở:* Đối với đợt bảo vệ đồ án tới, nhóm có dự định mở rộng thêm từ điển cho ngành Kinh tế/Marketing hay chỉ tập trung chứng minh tính đúng đắn trên nhóm IT?
   * *Khuyến nghị:* Tập trung hoàn thiện và demo xuất sắc trên nhóm ngành IT để bám sát phạm vi ban đầu của đề tài.

2. **Chính sách lưu trữ file CV gốc (Storage Retention Policy)**:
   * *Hiện trạng:* File CV lưu tại thư mục cục bộ `uploads/cvs/private` và trích xuất raw text lưu vào database.
   * *Câu hỏi mở:* Có cần tích hợp S3-compatible cloud storage (như MinIO hoặc AWS S3) hay giữ nguyên filesystem cục bộ để phục vụ demo đồ án offline?
   * *Khuyến nghị:* Giữ nguyên local filesystem để phục vụ hội đồng chấm thi offline mà không bị phụ thuộc vào kết nối Internet ra bên ngoài.


## DEC-08 — Approved audit remediation (19/10/2026)

Project Owner approved implementation of the audit plan in this conversation. Source baseline is the supplied ZIP (no .git metadata); no commit/push/deploy is implied. Changes are prepared in a separate copy.

Implementation choices within recommended option A: enforce actor ownership in legacy processing; require explicit CONFIRMED CVVersion in candidate matching; bind application scores/snapshots to appliedCvVersion; candidate self-match is a side-effect-free preview; synchronous application scoring propagates failures atomically. Keep candidate MatchingEngineService and existing HR Scoring as separately versioned purposes rather than invent a new formula. HR screening retains its existing recruiter-owned document workflow (no candidate application or candidate confirmation is fabricated). Its CV data must be adapted to scoring schema and embedded before matching, while candidate extraction remains review-ready only. Preserve immutable extraction JSON; generate scoring input separately. Unsupported extracted skills/GPA are removed/null with warnings; user-added review data is not passed through extraction grounding. New screenings bind JD by current content. Old snapshots lacking source data are not backfilled from current CVs. Runtime VERIFIED claims require new live evidence.

These choices implement the approved corrective plan; no new product feature, dependency upgrade, destructive data migration or production data change is authorized/performed here.
