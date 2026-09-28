# MidCV Acceptance Criteria

Tài liệu này xác định các tiêu chí nghiệm thu (Acceptance Criteria - AC) có thể đo lường, kiểm chứng và bác bỏ (falsifiable) cho từng giai đoạn triển khai của hệ thống **AI Recruitment Platform / MidCV**. Mọi tính năng chỉ được đánh dấu là hoàn thành khi vượt qua tất cả các tiêu chí trong tài liệu này bằng kiểm thử thực tế.

---

## 1. Tiêu chí chung toàn hệ thống

- **AC-GEN-01 (Anti-Fabrication)**: Không đánh dấu `VERIFIED` bất kỳ thành phần nào nếu chưa thực thi lệnh test thực tế trên môi trường có dependencies thật (database thật, endpoint thật, file thật).
- **AC-GEN-02 (Original CV Immutability)**: File CV gốc (PDF/DOCX/Ảnh) được lưu trữ bất biến (read-only/write-once) và không bao giờ bị ghi đè khi ứng viên chỉnh sửa thông tin trên form hồ sơ.
- **AC-GEN-03 (Human-in-the-Loop)**: Mọi quyết định quan trọng (chốt thông tin hồ sơ của ứng viên, quyết định phỏng vấn/tuyển dụng của nhà tuyển dụng) phải do con người thực hiện; AI/LLM tuyệt đối không tự động quyết định.

---

## 2. Tiêu chí theo từng Phase

### Phase 1: Local Document Extraction & Raw Text Quality Evaluation

- **AC-P1-01 (Text Extraction Coverage)**:
  - Trích xuất thành công văn bản thô từ file PDF dạng text (`pdfplumber` / `pypdfium2`) với tỷ lệ bảo toàn ký tự >= 95%.
  - Trích xuất thành công văn bản thô từ file DOCX (`python-docx`).
  - Trích xuất văn bản từ ảnh quét/PDF dạng scan thông qua OCR (`pytesseract`).
- **AC-P1-02 (Isolation from LLM)**: Quá trình trích xuất văn bản thô hoàn toàn cục bộ, không gửi file binary hoặc raw text tới bất kỳ external LLM API nào.
- **AC-P1-03 (Quality Evaluation Metrics)**:
  - Đầu ra API `POST /internal/ai/cv/extract-text` trả về `raw_text` cùng đối tượng `quality_metrics` chứa: `char_count`, `word_count`, `whitespace_ratio`, `printable_ratio`.
  - Phân loại chính xác cờ chất lượng:
    - `PASSED`: Văn bản đầy đủ, cấu trúc rõ ràng.
    - `WARNING`: Quá ngắn hoặc tỷ lệ ký tự lạ cao.
    - `FAILED`: Rỗng hoặc không thể giải mã văn bản.
- **AC-P1-04 (Automated Test Pass)**: Tất cả các bài test trong `ai-worker/tests/test_cv_text_extraction.py` (tối thiểu 13 tests) chạy thành công với exit code `0`.

---

### Phase 2: Primary LLM Structuring & Controlled Ollama Fallback

- **AC-P2-01 (Primary LLM Configuration)**:
  - Hệ thống đọc cấu hình từ biến môi trường: `AI_WORKER_PRIMARY_LLM_BASE_URL`, `AI_WORKER_PRIMARY_LLM_API_KEY`, `AI_WORKER_PRIMARY_LLM_MODEL_ID`, `AI_WORKER_PRIMARY_LLM_TIMEOUT`, `AI_WORKER_PRIMARY_LLM_MAX_RETRIES`.
  - Kết nối thành công tới endpoint tương thích OpenAI và parse raw text thành schema `CVData` chuẩn.
- **AC-P2-02 (Strict Error Classification for Fallback)**:
  - **Lỗi không được fallback**: Mã lỗi HTTP `401 Unauthorized`, `403 Forbidden`, `404 Not Found` (sai endpoint hoặc sai model) hoặc cấu hình thiếu bắt buộc phải ném lỗi ngay (`PrimaryLLMConfigurationError`), không được kích hoạt fallback làm che giấu lỗi cấu hình.
  - **Lỗi đủ điều kiện fallback**: Lỗi kết nối mạng, timeout (`ReadTimeout`, `ConnectTimeout`), hoặc lỗi máy chủ `500`, `502`, `503 Service Unavailable`, `504 Gateway Timeout` sau khi đã retry hết số lần quy định thì được phép kích hoạt Ollama fallback.
- **AC-P2-03 (Ollama Fallback Integrity)**:
  - Khi kích hoạt fallback, Ollama nhận prompt tương đương và parse ra cấu trúc JSON tuân thủ `CVData`.
  - Response trả về có trường metadata xác định rõ nguồn gốc xử lý: `structured_by: "OLLAMA_FALLBACK"` (hoặc `"PRIMARY"`).
- **AC-P2-04 (Pydantic Schema Validation)**:
  - Bất kỳ JSON nào từ LLM đều phải qua kiểm tra của `CVData` (Pydantic model).
  - Nếu JSON sai cú pháp hoặc thiếu trường cốt lõi, hệ thống báo lỗi rõ ràng thay vì lưu dữ liệu rác.
- **AC-P2-05 (Automated Test Pass)**: Toàn bộ test suite trong `ai-worker/tests/test_fallback_orchestration.py` (tối thiểu 28 tests) chạy thành công với exit code `0`.

---

### Phase 3: Candidate DRAFT Profile, Form Autofill & Human Confirmation

- **AC-P3-01 (Draft Profile Initialization)**:
  - Sau khi LLM cấu trúc hóa CV, hệ thống tạo bản ghi `CandidateProfile` ở trạng thái `status: DRAFT`.
  - Mọi trường dữ liệu được trích xuất từ CV ban đầu phải mang metadata nguồn gốc `origin: CV_EXTRACTED`.
- **AC-P3-02 (Frontend Form Autofill & 9 Standard Sections)**:
  - Giao diện người dùng tự động điền thông tin vào 9 section chuẩn: Thông tin cá nhân, Tóm tắt nghề nghiệp, Kỹ năng, Kinh nghiệm làm việc, Dự án, Học vấn, Chứng chỉ, Ngôn ngữ, Liên kết.
- **AC-P3-03 (Repeated Card CRUD)**:
  - 5 phần (Kinh nghiệm, Dự án, Học vấn, Chứng chỉ, Ngôn ngữ) hiển thị dưới dạng card lặp.
  - Người dùng có thể: Thêm card mới (gắn `origin: USER_ADDED`), Chỉnh sửa card có sẵn (gắn `origin: USER_CONFIRMED`), Xóa card khỏi danh sách.
  - Người dùng có thể thêm/xóa skill chip linh hoạt.
- **AC-P3-04 (Explicit Human Confirmation Gate)**:
  - Nút/Hành động "Xác nhận hồ sơ" (`POST /api/v1/candidate/profile/confirm`) chuyển trạng thái hồ sơ từ `DRAFT` sang `CONFIRMED`.
  - Hệ thống chặn không cho phép thực hiện matching ngữ nghĩa CV-JD nếu hồ sơ vẫn đang ở trạng thái `DRAFT`.

---

### Phase 4: Skills & Occupations Taxonomy Normalization Engine

- **AC-P4-01 (Multi-Layer Retrieval Hierarchy)**:
  - Chuẩn hóa tên kỹ năng qua 4 tầng: Exact Match -> Alias Lookup (Việt/Anh) -> Fuzzy Match (Levenshtein >= 0.85) -> Semantic Vector Retrieval.
  - Trả về Canonical Skill ID, Canonical Name, và Confidence Score.
- **AC-P4-02 (Bounded LLM Disambiguation)**:
  - Khi ngữ cảnh mơ hồ (Top-K vector có 2-3 kỹ năng điểm tương đương), hệ thống chỉ gửi danh sách Top-K rút gọn (tối đa 5 ứng viên) kèm ngữ cảnh đoạn văn cho LLM chọn.
  - LLM chỉ được phép chọn 1 trong các ID có trong danh sách cung cấp; tuyệt đối không tự bịa ra ID mới.
- **AC-P4-03 (Autocomplete Integration)**:
  - Endpoint Autocomplete trả về danh sách gợi ý chuẩn hóa trong thời gian <= 200ms với top 10 kết quả phù hợp nhất theo tiền tố gõ của người dùng.

---

### Phase 5: Target JD Semantic Matching & Embedding Pipeline

- **AC-P5-01 (Target JD Explicit Selection)**:
  - Việc matching chỉ diễn ra khi ứng viên chọn một JD đích cụ thể (hoặc khi nhà tuyển dụng kích hoạt matching cho Job Posting cụ thể); không matching ngẫu nhiên, vô định.
- **AC-P5-02 (JD Requirement Decomposition)**:
  - JD được phân tách rõ ràng thành: Kỹ năng bắt buộc (Required Skills), Kỹ năng ưu tiên (Preferred Skills), và Yêu cầu kinh nghiệm/học vấn.
- **AC-P5-03 (Semantic Vector Alignment)**:
  - Embedding vector cho từng section của CV và JD được sinh ra từ cùng một model embedding có dimension thống nhất.
  - Cosine similarity score nằm trong khoảng [0.0, 1.0].

---

### Phase 6: Deterministic Scoring Algorithm & LLM Explainer

- **AC-P6-01 (Mathematical Determinism)**:
  - Điểm số `match_score` (thang 0-100) được tính toán bằng công thức toán học có trọng số phiên bản hóa (Algorithm v1.0).
  - Cùng một bộ dữ liệu đầu vào (cùng CV đã chuẩn hóa và cùng JD) phải luôn cho ra điểm số chính xác như nhau (Repeatability = 100%).
- **AC-P6-02 (No LLM Scoring)**:
  - Tuyệt đối không để LLM chấm điểm hoặc tự sửa điểm số toán học.
- **AC-P6-03 (Sensitive Attributes Exclusion)**:
  - Thuật toán loại bỏ hoàn toàn các thuộc tính nhạy cảm: tuổi, ngày sinh, giới tính, tôn giáo, dân tộc, tình trạng hôn nhân, ảnh chân dung khỏi công thức tính điểm.
- **AC-P6-04 (Score Breakdown & Reason Codes)**:
  - Kết quả trả về gồm điểm tổng thể và bảng phân rã điểm thành phần (`skills_score`, `experience_score`, `project_score`, `education_score`) kèm danh sách mã lý do (Reason Codes).
- **AC-P6-05 (LLM Explanation Grounding)**:
  - LLM Explainer chỉ nhận bảng phân rã điểm và các reason codes để sinh văn bản giải thích. Nội dung giải thích phải trung thực với số liệu, không mâu thuẫn với điểm toán học.

---

### Phase 7: GitHub Verification & Evidence Mining

- **AC-P7-01 (Distinction of Claim vs. Evidence)**:
  - Hệ thống phân biệt rạch ròi giữa Kỹ năng do ứng viên tự khai báo (`CV_EXTRACTED` hoặc `USER_ADDED`) và Kỹ năng có bằng chứng repository (`GITHUB_VERIFIED`).
- **AC-P7-02 (Objective Verification Signals)**:
  - Phân tích commit lịch sử của chính ứng viên, ngôn ngữ lập trình của code tự viết, dependencies thực tế trong `package.json`, `pom.xml`, `requirements.txt`.
  - Không dựa vào số sao (stars) hay commit của forks/bots để làm bằng chứng duy nhất.
- **AC-P7-03 (Non-Disqualification Rule)**:
  - Không có GitHub hoặc GitHub ít hoạt động không được coi là điều kiện loại trừ tuyệt đối đối với ứng viên; chỉ ghi nhận là "chưa có bằng chứng bổ sung từ GitHub" (Confidence = NONE).

---

### Phase 8: Skill Gap Breakdown & Tailored Roadmap Recommendations

- **AC-P8-01 (5-Category Gap Classification)**:
  - Đối sánh kỹ năng giữa CV và JD đích được phân loại chính xác thành 5 nhóm không chồng lấn:
    1. `MET`: Ứng viên có kỹ năng và đáp ứng yêu cầu.
    2. `MISSING_MANDATORY`: JD yêu cầu bắt buộc nhưng CV không có.
    3. `MISSING_PREFERRED`: JD ưu tiên nhưng CV không có.
    4. `RELATED_TO_LEARN`: Kỹ năng liên quan trực tiếp trong taxonomy có thể mở rộng.
    5. `EVIDENCE_MISSING`: Ứng viên khai báo nhưng chưa có chứng chỉ hoặc bằng chứng GitHub.
- **AC-P8-02 (No Auto-Injection into Profile)**:
  - Các kỹ năng được gợi ý bổ sung chỉ hiển thị trong mục khuyến nghị học tập; tuyệt đối không tự ý chèn vào hồ sơ của ứng viên.
- **AC-P8-03 (Tailored Roadmap Generation)**:
  - Lộ trình học tập sinh ra từ LLM phải nhắm trực diện vào các kỹ năng thiếu của JD đích cụ thể, cung cấp mục tiêu học tập và dự án thực hành có tính khả thi.

---

### Phase 9: Recruiter Dashboard, Ranking, Evidence View & Human Decision

- **AC-P9-01 (Auditable Candidate Ranking)**:
  - Danh sách ứng viên cho mỗi JD được sắp xếp theo `match_score` tất định.
  - Recruiter có thể xem chi tiết: CV gốc (PDF/DOCX), Hồ sơ chuẩn hóa, Score breakdown, Reason codes, GitHub evidence, Skill gap matrix.
- **AC-P9-02 (Human Decision Authority)**:
  - Việc chuyển trạng thái ứng viên (Shortlist, Phỏng vấn, Tuyển dụng, Từ chối) hoàn toàn do Recruiter click chọn trên giao diện.
  - Mọi thao tác đều được ghi lại vào bảng Audit Log kèm timestamp và `recruiter_user_id`.
- **AC-P9-03 (No Black-Box Decisions)**:
  - Không có bất kỳ quy trình nền (background job) nào tự động gửi email từ chối ứng viên dựa trên điểm số mà không có sự phê duyệt của Recruiter.
