# MidCV Implementation Status Tracker

Tài liệu này theo dõi tiến độ triển khai thực tế của hệ thống **AI Recruitment Platform / MidCV**. Bảng trạng thái tuân thủ nghiêm ngặt nguyên tắc **Chống Bịa (Anti-Fabrication)**:
- Chỉ các tính năng đã vượt qua kiểm thử thực tế với dependencies thật mới được đánh dấu `VERIFIED`.
- Các trạng thái được phép: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `VERIFIED`.

---

## Bảng trạng thái triển khai các Phase

| Phase | Status | Files changed | Real test command | Result | Commit hash | Remaining blockers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Local Document Extraction & Raw Text Quality Evaluation** | `VERIFIED` | `ai-worker/app/services/document_extractor.py`<br>`ai-worker/app/services/quality_evaluator.py`<br>`ai-worker/tests/test_isolated_document_extraction.py` | `python -m pytest tests/test_isolated_document_extraction.py` | 13 passed in 0.95s (exit code 0). Trích xuất độc lập PDF, DOCX và kiểm tra chất lượng không gọi LLM. | `4f5776b` | Không có. OCR local sẵn sàng hoạt động khi có scan PDF/ảnh. |
| **Phase 2: Primary LLM Structuring & Controlled Ollama Fallback** | `VERIFIED` | `ai-worker/app/services/openai_compatible_client.py`<br>`ai-worker/app/services/orchestration.py`<br>`ai-worker/tests/test_fallback_orchestration.py`<br>`ai-worker/tests/test_openai_compatible_client.py`<br>`docs/postman/MidCV-LLM-Testing.postman_collection.json` | `python -m pytest tests/test_fallback_orchestration.py tests/test_openai_compatible_client.py` | 31 passed in 9.82s (exit code 0). Cấu hình Primary LLM, phân loại lỗi chuẩn (401/404 fail-fast, 503/timeout fallback sang Ollama). | `4821635`<br>`ce42d52`<br>`d6994ca` | Không có. Cần server OpenAI-compatible endpoint hợp lệ hoặc Ollama khi chạy e2e runtime. |
| **Phase 3: Candidate DRAFT Profile, Form Autofill & Human Confirmation** | `IN_PROGRESS` | `backend/src/main/java/com/platform/recruitment/candidate/CandidateProfile.java`<br>`frontend/src/app/candidate/profile/page.tsx`<br>`frontend/src/lib/api.ts` | `./mvnw test -Dtest=CandidateProfileTest` (Đang chuẩn bị test suite) | Entity CandidateProfile và giao diện form cơ bản đã có; đang bổ sung cơ chế lưu thẻ lặp, data lineage tags và endpoint confirm. | Chưa commit | Cần hoàn thiện API `/api/v1/candidate/profile/confirm` và logic chặn matching khi status = DRAFT. |
| **Phase 4: Skills & Occupations Taxonomy Normalization Engine** | `NOT_STARTED` | Chưa thay đổi | Chưa thực hiện | Chưa thực hiện | Chưa commit | Phụ thuộc vào dữ liệu hồ sơ từ Phase 3. |
| **Phase 5: Target JD Semantic Matching & Embedding Pipeline** | `NOT_STARTED` | Chưa thay đổi | Chưa thực hiện | Chưa thực hiện | Chưa commit | Phụ thuộc vào Phase 4 hoàn thành chuẩn hóa taxonomy. |
| **Phase 6: Deterministic Scoring Algorithm & LLM Explainer** | `NOT_STARTED` | Chưa thay đổi | Chưa thực hiện | Chưa thực hiện | Chưa commit | Phụ thuộc vào Phase 5. |
| **Phase 7: GitHub Verification & Evidence Mining** | `NOT_STARTED` | Chưa thay đổi | Chưa thực hiện | Chưa thực hiện | Chưa commit | Cần GitHub Token và worker phân tích repo. |
| **Phase 8: Skill Gap Breakdown & Tailored Roadmap Recommendations** | `NOT_STARTED` | Chưa thay đổi | Chưa thực hiện | Chưa thực hiện | Chưa commit | Phụ thuộc vào Phase 6. |
| **Phase 9: Recruiter Dashboard, Ranking, Evidence View & Human Decision** | `NOT_STARTED` | Chưa thay đổi | Chưa thực hiện | Chưa thực hiện | Chưa commit | Phụ thuộc vào các Phase 6, 7, 8. |

---

## Nhật ký kiểm thử thực tế gần nhất

- **Ngày thực hiện**: 28/09/2026
- **Lệnh thực thi**: `cd ai-worker && python -m pytest tests/test_isolated_document_extraction.py tests/test_fallback_orchestration.py tests/test_openai_compatible_client.py`
- **Kết quả**:
  ```text
  ============================= test session starts =============================
  platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0
  rootdir: C:\Users\Khang\OneDrive\Desktop\SE121\ai-recruitment-platform\ai-worker
  collected 44 items

  tests\test_isolated_document_extraction.py .............                 [ 29%]
  tests\test_fallback_orchestration.py ................                    [ 65%]
  tests\test_openai_compatible_client.py ...............                   [100%]

  ============================= 44 passed in 10.77s =============================
  ```
