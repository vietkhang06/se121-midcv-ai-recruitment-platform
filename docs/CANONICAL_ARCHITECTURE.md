# CANONICAL CV PROCESSING ARCHITECTURE LOCK — MIDCV

> **Tài liệu nguồn sự thật (Single Source of Truth) khóa kiến trúc xử lý CV, loại bỏ trùng lặp và xác lập ranh giới vận hành giữa Backend, AI Worker và Frontend.**

---

## 1. Bản đồ thành phần và Bảng phân loại Inventory (Inventory Classification)

| FILE | ROLE | REFERENCED_BY | PRODUCTION_OR_TEST | CANONICAL_OR_LEGACY | KEEP_REFACTOR_DELETE | EVIDENCE |
|---|---|---|---|---|---|---|
| `ai-worker/app/services/document_extractor.py` | Local document text extractor (pdfplumber, pypdfium2, tesseract, docx) | `DocumentExtractionService`, `CVParser` | PRODUCTION | CANONICAL | KEEP | Thực hiện trích xuất raw text cục bộ thuần túy, không chứa code LLM. |
| `ai-worker/app/services/document_extraction_service.py` | Service đóng gói trích xuất tài liệu, tính điểm chất lượng text và quyết định OCR | `app/api/dev_endpoints.py`, endpoints production mới | PRODUCTION | CANONICAL | KEEP & EXPOSE | Đóng gói `DocumentExtractor` + `TextQualityEvaluator`, trả về metadata trích xuất hoàn chỉnh. |
| `ai-worker/app/services/cv_structuring_service.py` | Service chuyển đổi raw text thành structured CV JSON qua LLM provider chain | `app/api/dev_endpoints.py`, endpoints production mới | PRODUCTION | CANONICAL | KEEP & EXPOSE | Sử dụng `FallbackLLMClient`, schema validation Pydantic, chống suy diễn/bịa đặt. |
| `ai-worker/app/services/structured_cv_validator.py` | Validator kiểm tra cú pháp JSON và Pydantic schema cho structured CV | `cv_structuring_service.py` | PRODUCTION | CANONICAL | KEEP | Đảm bảo tính nhất quán dữ liệu, chống rò rỉ fact không có trong raw text. |
| `ai-worker/app/services/llm/openai_compatible_client.py` | Primary LLM client tương thích chuẩn OpenAI chat completions | `fallback_client.py`, `cv_structuring_service.py`, `endpoints.py` | PRODUCTION | CANONICAL | REFACTOR | Xử lý header, bearer auth, mapping lỗi 400/401/403/404 vs transient 408/429/5xx, cần bổ sung guard rỗng và response classification. |
| `ai-worker/app/services/llm/ollama_client.py` | Fallback LLM client gọi local Ollama instance | `fallback_client.py`, `cv_structuring_service.py` | PRODUCTION | CANONICAL | REFACTOR | Cần sửa hardcoded `num_predict: 4096` qua cấu hình env, hỗ trợ format JSON schema. |
| `ai-worker/app/services/llm/fallback_client.py` | Bộ điều phối Fallback: Primary trước, chỉ fallback sang Ollama khi gặp lỗi tạm thời hợp lệ | `cv_structuring_service.py` | PRODUCTION | CANONICAL | KEEP | Chặn fallback với 400, 401, 403, 404; giới hạn retry budget toàn cục. |
| `ai-worker/app/services/llm_client.py` | Legacy monolithic LLM client kết hợp cả OpenAI và Ollama | `cv_parser.py`, `jd_parser.py`, unit tests cũ | PRODUCTION (LEGACY) | LEGACY | REFACTOR / SUPERSEDE | Chứa `num_predict: 1024` gây lỗi cắt JSON, retry lồng nhau, sẽ thay thế bằng modular LLM services. |
| `ai-worker/app/services/cv_parser.py` | Monolithic parser gộp cả extraction lẫn LLM call | `endpoints.py` (`/extract-cv`) | PRODUCTION (LEGACY) | LEGACY | REFACTOR / SUPERSEDE | Gọi trực tiếp `LLMClient` cũ và tự gộp bước đọc file với bóc tách entity. |
| `ai-worker/app/api/endpoints.py` | AI Worker HTTP API routes | Backend `AiWorkerClient` | PRODUCTION | CANONICAL | REFACTOR | Cần tích hợp canonical extraction và structuring endpoints cho production. |
| `backend/.../cv/CVController.java` | REST Controller quản lý CV, upload, draft, confirm | Frontend web client, Postman | PRODUCTION | CANONICAL | REFACTOR | Cần chuyển upload thành bất đồng bộ trả `202 Accepted` và bổ sung `/processing-status`. |
| `backend/.../cv/CVService.java` | Service nghiệp vụ CV, lưu trữ document version, draft, confirm | `CVController.java` | PRODUCTION | CANONICAL | REFACTOR | Tách biệt lưu raw text trước khi gọi structuring; quản lý version status DRAFT/CONFIRMED. |
| `backend/.../worker/JobQueue.java` | Database-backed queue trên bảng `processing_jobs` | `PipelineWorker.java`, `CVService.java` | PRODUCTION | CANONICAL | KEEP | Hạ tầng hàng đợi có sẵn với cơ chế lease lock, retry backoff và tiến trình. |
| `backend/.../worker/PipelineWorker.java` | Background worker xử lý jobs hàng đợi | Spring Boot Scheduled task | PRODUCTION | CANONICAL | REFACTOR | Đồng bộ các stage tiến trình chuẩn: UPLOADED, VALIDATING_FILE, EXTRACTING_TEXT, RAW_TEXT_SAVED, STRUCTURING_CV, SAVING_DRAFT. |
| `backend/.../application/ApplicationService.java` | Dịch vụ nộp đơn ứng tuyển | `ApplicationController.java` | PRODUCTION | CANONICAL | REFACTOR | Xóa bỏ hành vi tự tạo CVVersion; dùng whitelist chỉ cho phép version CONFIRMED. |
| `backend/.../matching/MatchingEngineService.java` | Động cơ đối sánh điểm năng lực CV và JD | `MatchingController.java`, `ApplicationService.java` | PRODUCTION | CANONICAL | REFACTOR | Chỉ lấy dữ liệu từ CV version CONFIRMED; từ chối DRAFT/PARSED/PROCESSING/FAILED. |
| `frontend/src/components/cv/CVUploadModal.tsx` | Modal upload CV của ứng viên | `frontend/.../candidate/cvs/page.tsx` | PRODUCTION | CANONICAL | REFACTOR | Polling trạng thái thực tế từ backend, hiển thị progress bar và stage tên thật. |
| `frontend/src/app/candidate/cvs/page.tsx` | Trang quản lý danh sách CV của ứng viên | Next.js App Router | PRODUCTION | CANONICAL | KEEP | Giao diện thư viện CV, xem trạng thái DRAFT / CONFIRMED. |

---

## 2. Chuỗi luồng xử lý Canonical bắt buộc (The Single Canonical Flow)

```text
1. Ứng viên tải lên tệp CV (PDF/DOCX/Ảnh)
   ↓
2. Backend kiểm tra tính hợp lệ của tệp (MIME, size, checksum, extension)
   ↓
3. Lưu tệp gốc bất biến vào FileStorageService và bản ghi documents / document_versions
   ↓
4. Backend trả về ngay lập tức HTTP 202 Accepted với { cvId, versionId, jobId, status: "UPLOADED", progress: 5 }
   ↓
5. Operation A: Document Extraction
   - Thư viện nội bộ trích xuất raw text (pdfplumber, docx, image ocr)
   - Đánh giá chất lượng raw text (TextQualityEvaluator)
   - Chỉ chạy OCR khi text layer rỗng hoặc chất lượng thấp
   - LLM TUYỆT ĐỐI KHÔNG tham gia vào bước này
   ↓
6. Lưu raw text thành công vào document_versions.raw_text, cập nhật trạng thái EXTRACTED, commit transaction
   ↓
7. Operation B: CV Structuring
   - Chỉ truyền raw text vào LLM pipeline (FallbackLLMClient)
   - PRIMARY (OpenAI-compatible) thử trước với timeout và bounded retry
   - Nếu lỗi tạm thời (408, 429, 5xx, timeout, invalid output) -> Fallback sang Ollama local
   - Lỗi cố định (400, 401, 403, 404) -> THẤT BẠI NGAY LẬP TỨC, KHÔNG fallback
   - Output JSON được kiểm tra schema nghiêm ngặt bởi StructuredCVValidator
   - Factual grounding: loại bỏ mọi thực thể không có bằng chứng trong raw text
   ↓
8. Lưu structured profile vào CVVersion với trạng thái DRAFT
   ↓
9. Frontend polling tiến trình từ GET /api/v1/candidate/cvs/{cvId}/processing-status theo các stage thật
   ↓
10. Tự động điền dữ liệu vào form hồ sơ ứng viên
   ↓
11. Ứng viên xem xét, thêm/sửa/xóa thông tin cá nhân và kỹ năng
   ↓
12. Ứng viên xác nhận hồ sơ (POST /api/v1/candidate/cvs/{cvId}/confirm) -> CVVersion chuyển sang CONFIRMED (bất biến)
   ↓
13. CHỈ version CONFIRMED mới được phép nộp đơn ứng tuyển hoặc chạy matching với JD
   ↓
14. Thuật toán deterministic tính điểm phù hợp, phân tích khoảng cách kỹ năng (skill gaps) và giải thích lý do
   ↓
15. Tín hiệu GitHub chỉ đóng vai trò bằng chứng bổ sung, không thay đổi tiêu chí cốt lõi
```

---

## 3. Kế hoạch chuyển đổi an toàn và loại bỏ mã nguồn legacy

1. **Giai đoạn chuyển đổi**:
   - Khởi tạo và liên kết các service canonical (`DocumentExtractionService`, `CVStructuringService`, `FallbackLLMClient`) vào các production routes.
   - Chuyển `CVParser` nội bộ sang sử dụng `FallbackLLMClient` thay vì `LLMClient` legacy để bảo toàn retry budget.
   - Sửa cấu hình `OllamaClient` tăng `num_predict` lên 4096 (hạn chế tối đa lỗi cắt cụt JSON).
   - Backend `CVService` tách hẳn 2 phase: trích xuất lưu `raw_text` trước, sau đó mới gọi chuẩn hóa profile.
   - Backend `ApplicationService` và `MatchingEngineService` thêm whitelist chặn đứng các version chưa `CONFIRMED`.
2. **Tiêu chí xóa code legacy**:
   - Chỉ xóa file legacy (`llm_client.py`, tests lỗi thời) khi toàn bộ tham chiếu đã chuyển sang canonical, test suite mới PASS 100%.

Архитектура зафиксирована. Không được tự ý thay đổi luồng này nếu chưa có cập nhật DECISION_LOG.
