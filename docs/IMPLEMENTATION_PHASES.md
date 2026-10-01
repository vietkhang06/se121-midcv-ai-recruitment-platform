# MidCV Implementation Phases & Roadmap (Phase 0 – Phase 10)

Tài liệu này xác định lộ trình triển khai chi tiết và nhất quán cho hệ thống **AI Recruitment Platform / MidCV** từ **Phase 0 đến Phase 10**. Tài liệu này kế thừa và thống nhất hoàn toàn với [CORE_PRODUCT_FLOW.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/CORE_PRODUCT_FLOW.md) và [DOMAIN_RULES.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/DOMAIN_RULES.md).

---

## 1. Bảng Mapping Toàn diện Lộ trình Phase 0 – Phase 10

| Phase ID | Phase Name | Requirements | Real Acceptance Test | Required Dependencies | Commit Boundary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | **Pre-Phase Consistency Gate & Architecture Baseline** | Khóa kiến trúc SSOT, đồng bộ API confirm `POST /api/v1/candidate/cvs/{cvId}/confirm`, bảo toàn artifact CV gốc, làm sạch bytecode Python, kiểm kê thay đổi tồn tại trước. | `git show --check`<br>`git ls-files` không còn `.pyc`<br>Kiểm tra chéo 6 file docs | Git, Shell, tài liệu SSOT | `docs(core-flow): reconcile API contracts and phase acceptance gates` |
| **Phase 1** | **Local Document Extraction & Raw Text Quality Evaluation** | Trích xuất raw text từ PDF, DOCX, ảnh/scan PDF bằng thư viện local; đánh giá chất lượng; hoàn toàn không gọi LLM; không bịa dữ liệu. | Kiểm thử thực với file PDF, DOCX, Ảnh mẫu: `python -m pytest tests/test_isolated_document_extraction.py` | `pdfplumber`, `pypdfium2`, `python-docx`, `pytesseract` (Tesseract OCR local) | `feat(ai-worker): add isolated CV text extraction verification` |
| **Phase 2** | **Primary LLM Structuring & Controlled Ollama Fallback** | Endpoint Primary LLM tương thích OpenAI; phân loại lỗi nghiêm ngặt (401/404 fail-fast, 503/timeout fallback); Ollama local dự phòng; Pydantic schema validation. | Kiểm thử tích hợp gọi thật Primary endpoint / Ollama: `python -m pytest tests/test_fallback_orchestration.py tests/test_openai_compatible_client.py` | Server Primary LLM (OpenAI-compatible), Ollama local (`qwen2.5` / `granite`), Pydantic | `feat(ai-worker): add controlled Ollama fallback for LLM failures` |
| **Phase 3** | **Candidate DRAFT Profile, Repeated Cards Form & Human Confirmation** | Lưu trữ hồ sơ `DRAFT`; form UI 9 section chuẩn với thẻ lặp (Add/Edit/Delete) cho 5 mục; gán nhãn data lineage; API confirm `POST /api/v1/candidate/cvs/{cvId}/confirm`; chặn matching khi đang là `DRAFT`; CV gốc bất biến. | Kiểm thử API thật và UI: Tạo draft, cập nhật thẻ lặp, gọi confirm endpoint, xác minh status `CONFIRMED` và checksum file gốc. | PostgreSQL thật, Spring Boot Backend, Next.js Frontend | `feat(candidate): implement card-based profile editing and human confirmation` |
| **Phase 4** | **Skills & Occupations Taxonomy Normalization Engine** | Phễu 4 tầng (Exact -> Alias -> Fuzzy -> Semantic Vector Top-K); LLM chỉ disambiguate trên danh sách Top-K rút gọn; cấm LLM tự bịa ID; UI autocomplete. | Kiểm thử chuẩn hóa kỹ năng tiếng Việt/Anh: `POST /internal/ai/taxonomy/normalize-skills` với 50+ kỹ năng mẫu. | Cơ sở dữ liệu Taxonomy, Pgvector, Embedding service | `feat(taxonomy): add multi-layer skill normalization engine` |
| **Phase 5** | **Target JD Semantic Matching & Multi-Vector Pipeline** | Phân tách JD thành Requirements/Qualifications; sinh vector embedding đồng nhất cho CV và JD; tính độ tương đồng ngữ nghĩa từng phần qua Cosine similarity. | Kiểm thử vector search Pgvector với các cặp CV–JD thực tế: so sánh kết quả cosine distance. | Pgvector, Postgres, Embedding Model | `feat(matching): implement multi-vector semantic comparison` |
| **Phase 6** | **Deterministic Scoring Algorithm & LLM Explainer** | Thuật toán chấm điểm toán học tất định (100% deterministic); loại bỏ thuộc tính nhạy cảm; sinh score breakdown & reason codes; LLM giải thích dựa trên số liệu toán. | Kiểm thử tính tất định: Chạy cùng 1 bộ dữ liệu 100 lần -> 100 kết quả điểm số giống hệt nhau (`Repeatability = 100%`). | Scoring Engine Java, Primary LLM Explainer | `feat(scoring): implement deterministic scoring engine with grounded explanations` |
| **Phase 7** | **GitHub Verification & Objective Evidence Mining** | Phân tích commit lịch sử, ngôn ngữ lập trình, dependencies thực tế; tính `confidence_level`; gán nhãn `GITHUB_VERIFIED`; chỉ chấp nhận GitHub OAuth App hoặc GitHub App (không dùng PAT trong sản phẩm); không dùng GitHub để loại trừ ứng viên. | Kiểm thử kết nối GitHub App/OAuth thật: Phân tích 1 public repo thật, trích xuất đúng tech stack và commit activity. | GitHub OAuth App / GitHub App credentials, Network access | `feat(github): implement objective evidence verification via github oauth` |
| **Phase 8** | **Skill Gap Breakdown & Tailored Roadmap Recommendations** | Phân loại 5 nhóm kỹ năng (`MET`, `MISSING_MANDATORY`, `MISSING_PREFERRED`, `RELATED_TO_LEARN`, `EVIDENCE_MISSING`) neo theo JD đích; sinh lộ trình học tập; không tự ý chèn kỹ năng vào hồ sơ. | Kiểm thử phân loại khoảng cách kỹ năng với JD đích thật và sinh roadmap tuần tự khả thi. | LLM Roadmap Prompt, Skill Gap Analyzer Service | `feat(gap-analysis): add 5-category skill gap and tailored roadmap` |
| **Phase 9** | **Recruiter Dashboard, Ranking, Evidence View & Human Decision** | Dashboard xếp hạng ứng viên theo điểm số; xem audit trail đầy đủ (CV gốc, trích xuất, GitHub evidence, score breakdown); Recruiter ra quyết định cuối cùng; ghi audit log. | Thao tác trên giao diện Recruiter thật: Xem ranking, mở audit modal, đổi trạng thái ứng viên (Shortlist/Reject). | Frontend Recruiter App, Spring Boot Backend, DB Audit | `feat(recruiter): add candidate ranking dashboard and human decision workflow` |
| **Phase 10** | **End-to-End System Integration, Verification & Production Readiness** | Kiểm thử tích hợp toàn trình (E2E) từ upload CV -> trích xuất -> chỉnh sửa form -> confirm -> matching JD -> scoring -> recruiter decision; kiểm tra bảo mật RBAC và multi-tenant. | Chạy toàn bộ E2E Playwright test suite và integration tests với live database, live worker: Exit code `0`. | Toàn bộ stack: Backend, Frontend, AI Worker, PostgreSQL | `test(e2e): verify end-to-end recruitment flow and system hardening` |

---

## 2. Chi tiết Từng Phase Triển khai

### Phase 0: Pre-Phase Consistency Gate & Architecture Baseline
- **Mục tiêu:** Đảm bảo toàn bộ tài liệu nguồn sự thật (SSOT) thống nhất 100%, khóa hợp đồng API `POST /api/v1/candidate/cvs/{cvId}/confirm`, loại bỏ hoàn toàn Python bytecode khỏi Git tracking, và phân loại chính xác các thay đổi pre-existing.
- **Ràng buộc:** Không triển khai tính năng mới trong phase này.

### Phase 1: Local Document Extraction & Raw Text Quality Evaluation (AI Worker)
- **Mục tiêu:** Trích xuất toàn bộ văn bản thô từ file CV (PDF, DOCX, Ảnh) mà không gọi LLM bên ngoài, tính toán chỉ số chất lượng extraction và xác định phương pháp trích xuất (native text hay OCR).
- **Deliverables:** `ai-worker/app/services/document_extractor.py`, `ai-worker/app/services/quality_evaluator.py`, `tests/test_isolated_document_extraction.py`.

### Phase 2: Primary LLM Structuring & Controlled Ollama Fallback (AI Worker)
- **Mục tiêu:** Chuyển đổi raw text thành schema JSON cấu trúc (`CVData`) thông qua Primary LLM tương thích OpenAI, có cơ chế Fallback sang Ollama local khi Primary gặp lỗi tạm thời (HTTP 5xx, timeout, connection drop).
- **Phân loại lỗi:** 401/404/sai config -> fail-fast; 503/timeout/network -> fallback Ollama.
- **Deliverables:** `openai_compatible_client.py`, `orchestration.py`, `test_fallback_orchestration.py`.

### Phase 3: Candidate DRAFT Profile, Repeated Cards Form & Human Confirmation (Backend & Frontend)
- **Mục tiêu:** Lưu trữ hồ sơ ở trạng thái `DRAFT`, tự động điền form trên UI với các thẻ lặp (Repeated Cards), cho phép ứng viên thêm, sửa, xóa, gắn nhãn nguồn gốc (`CV_EXTRACTED`, `USER_ADDED`), và chuyển trạng thái sang `USER_CONFIRMED` qua API `POST /api/v1/candidate/cvs/{cvId}/confirm`.
- **Nguyên tắc bất biến:** File CV gốc là artifact đầu vào bất biến phục vụ truy vết và kiểm toán. Việc người dùng chỉnh structured profile không được ghi đè file gốc.

### Phase 4: Skills & Occupations Taxonomy Normalization Engine (Backend & AI Worker)
- **Mục tiêu:** Chuẩn hóa toàn bộ kỹ năng và nghề nghiệp đã được ứng viên xác nhận về Canonical Taxonomy ID thông qua phễu 4 tầng (Exact -> Alias -> Fuzzy -> Semantic Vector Top-K). LLM chỉ disambiguate trên danh sách Top-K rút gọn; cấm LLM tự bịa ID.

### Phase 5: Target JD Semantic Matching & Embedding Pipeline (AI Worker & Backend)
- **Mục tiêu:** Ứng viên chọn hoặc nộp đơn vào JD đích; hệ thống tính toán vector embedding ngữ nghĩa cho CV (đã được chuẩn hóa) và JD để đối sánh ngữ nghĩa đa chiều qua Cosine similarity trên Pgvector.

### Phase 6: Deterministic Scoring Algorithm & LLM Explainer (Scoring Engine & LLM)
- **Mục tiêu:** Tính toán điểm số phù hợp (Match Score: 0 - 100) bằng thuật toán toán học tất định (deterministic), không dùng LLM để chấm điểm; sau đó dùng LLM để sinh văn bản giải thích dựa trên các reason codes và score breakdown. Cùng một input luôn ra cùng một kết quả điểm số.

### Phase 7: GitHub Verification & Evidence Mining (Background Worker & AI Worker)
- **Mục tiêu:** Xác thực năng lực kỹ thuật thực tế của ứng viên thông qua GitHub public repository, trích xuất bằng chứng khách quan (Evidence) để đối chiếu với các kỹ năng đã khai báo.
- **Xác thực:** Luồng sản phẩm chỉ chấp nhận **GitHub OAuth App hoặc GitHub App**. Không yêu cầu ứng viên nhập Personal Access Token vào sản phẩm.

### Phase 8: Skill Gap Breakdown & Tailored Roadmap Recommendations (Scoring Engine & LLM)
- **Mục tiêu:** Phân tích khoảng cách kỹ năng giữa hồ sơ ứng viên và JD đích cụ thể, phân loại thành 5 danh mục rõ ràng (`MET`, `MISSING_MANDATORY`, `MISSING_PREFERRED`, `RELATED_TO_LEARN`, `EVIDENCE_MISSING`) và tạo lộ trình học tập bổ sung kỹ năng thiếu. Cấm tự động chèn kỹ năng vào hồ sơ.

### Phase 9: Recruiter Dashboard, Ranking, Evidence View & Human Decision (Frontend & Backend)
- **Mục tiêu:** Cung cấp giao diện cho Nhà tuyển dụng xem danh sách ứng viên được xếp hạng theo điểm số tất định, xem chi tiết bằng chứng (CV gốc, trích xuất, GitHub evidence, Skill Gap breakdown) và thực hiện quyết định tuyển dụng cuối cùng (Human Decision).

### Phase 10: End-to-End System Integration, Verification & Production Readiness
- **Mục tiêu:** Kiểm thử tích hợp toàn trình (E2E) trên toàn bộ hệ sinh thái (Frontend, Backend, AI Worker, PostgreSQL, Pgvector), kiểm tra bảo mật phân quyền nghiêm ngặt và thẩm định khả năng chịu lỗi.
