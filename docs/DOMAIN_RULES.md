# DOMAIN RULES & SYSTEM INVARIANTS — MIDCV

Tài liệu này xác lập các **Quy tắc nghiệp vụ bất biến (Domain Invariants & Business Rules)** bắt buộc phải tuân thủ trong toàn bộ vòng đời phát triển phần mềm của hệ thống **MidCV**.

---

## 1. Phân định Trách nhiệm & Giới hạn của Từng Công nghệ

### 1.1 Thư viện Xử lý Tài liệu Cục bộ (Local Document Processors)
* **Thành phần:** `pdfplumber`, `python-docx`, `pypdfium2`, `pytesseract` (Tesseract 5).
* **Phạm vi trách nhiệm:**
  - Đọc tài liệu PDF native và nhận diện cấu trúc hai cột.
  - Đọc tài liệu DOCX bảo toàn thứ tự đoạn văn và bảng biểu.
  - OCR ảnh và PDF scan bằng mô hình ngôn ngữ `eng+vie`.
  - Trích xuất toàn bộ văn bản thô (raw text) và tạo metadata chất lượng (`fileType`, `extractionMethod`, `pageCount`, `characterCount`, `ocrUsed`, `qualityScore`).
* **Điều cấm kỵ (Prohibitions):**
  - **TUYỆT ĐỐI KHÔNG** gọi LLM trong tầng trích xuất tài liệu.
  - **TUYỆT ĐỐI KHÔNG** chấm điểm độ phù hợp hay đánh giá ứng viên.
  - **TUYỆT ĐỐI KHÔNG** tự chế, đoán định hoặc thêm thắt dữ liệu không có trong file nhị phân.

### 1.2 Mô hình Ngôn ngữ Lớn Chính (PRIMARY LLM - OpenAI Compatible)
* **Cấu hình:** Endpoint tương thích chuẩn OpenAI (`POST /chat/completions`), cấu hình bằng `LLM_PRIMARY_BASE_URL`, `LLM_PRIMARY_API_KEY` (chỉ lưu tại server), `LLM_PRIMARY_MODEL`, `LLM_PRIMARY_TIMEOUT_SECONDS`, `LLM_PRIMARY_MAX_RETRIES`.
* **Phạm vi cho phép sử dụng:**
  - Cấu trúc hóa các đoạn văn bản phức tạp, phân biệt các section khó (Kinh nghiệm vs Dự án cá nhân).
  - Chuẩn hóa diễn đạt mô tả công việc, trách nhiệm và thành tựu.
  - Lựa chọn kỹ năng phù hợp từ một danh sách Taxonomy ứng viên giới hạn (Top-K candidates do thuật toán cung cấp).
  - Diễn giải kết quả đối sánh (Match Score Breakdown) thành ngôn ngữ tự nhiên minh bạch, dẫn chứng câu từ thực tế trong CV.
  - Xây dựng lộ trình học tập, khuyến nghị khóa học dựa trên Skill Gap đã xác định.
* **Điều cấm kỵ (Prohibitions):**
  - **TUYỆT ĐỐI KHÔNG** dùng LLM để đọc file nhị phân PDF/DOCX (đã có thư viện local đảm nhiệm).
  - **TUYỆT ĐỐI KHÔNG** dùng LLM để regex trích xuất email, số điện thoại, URL (sử dụng regex chuẩn hóa trong code).
  - **TUYỆT ĐỐI KHÔNG** dùng LLM để tính số tháng kinh nghiệm khi code thuật toán có thể tính chính xác.
  - **TUYỆT ĐỐI KHÔNG** để LLM trực tiếp chấm điểm (scoring), xếp hạng (ranking) hoặc ra quyết định Đậu/Rớt (Pass/Fail).
  - **TUYỆT ĐỐI KHÔNG** để LLM tự tạo ID taxonomy mới ngoài từ điển chuẩn.
  - **TUYỆT ĐỐI KHÔNG** để LLM tự động chèn kỹ năng được gợi ý vào hồ sơ ứng viên.

### 1.3 Mô hình Dự phòng Cục bộ (FALLBACK LLM - Local Ollama)
* **Cấu hình:** Máy chủ Ollama cục bộ (`http://127.0.0.1:11434`), model `dna5rm/granite4.2:3b-8k`.
* **Nguyên tắc hoạt động:**
  - Chỉ đóng vai trò dự phòng (fallback), không phải lựa chọn mặc định.
  - **Chỉ được gọi khi PRIMARY gặp lỗi tạm thời (Transient Errors):**
    - Lỗi mạng, Connection Refused, DNS Failure.
    - Timeout kết nối hoặc đọc response (HTTP 408 hoặc client timeout).
    - Lỗi quá tải / Rate limit (HTTP 429).
    - Lỗi máy chủ nhà cung cấp (HTTP 500, 502, 503, 504).
    - Content rỗng hoặc JSON vẫn bị hỏng sau đúng 1 lần repair.
  - **TUYỆT ĐỐI KHÔNG fallback khi gặp lỗi cấu hình hoặc xác thực:**
    - HTTP 400 (Bad Request).
    - HTTP 401 (Sai hoặc thiếu API Key).
    - HTTP 403 (Không có quyền truy cập).
    - HTTP 404 (Sai Model ID hoặc sai Base URL).
  - **Mục đích:** Không dùng Ollama để âm thầm che giấu lỗi cấu hình sai hoặc vi phạm bảo mật của PRIMARY LLM.

### 1.4 Phân loại Kỹ năng và Taxonomy (Skill Taxonomy & Embeddings)
* **Trách nhiệm:**
  - Duy trì từ điển kỹ năng chuẩn hóa gồm: Canonical ID, tên chuẩn hóa, aliases đa ngôn ngữ (tiếng Việt & tiếng Anh), quan hệ phân cấp cha–con và quan hệ liên quan.
  - Triển khai cơ chế tìm kiếm đa tầng:
    1. Exact matching (khớp chính xác).
    2. Alias matching (khớp từ đồng nghĩa).
    3. Fuzzy string matching (khớp mờ tránh lỗi chính tả).
    4. Semantic Top-K retrieval (truy xuất ngữ nghĩa qua vector embedding).
  - **Quy tắc hiệu năng:** Chỉ gửi danh sách gợi ý Top-K taxonomy thu gọn (tối đa 10 - 20 ứng viên phù hợp) cho LLM lựa chọn, **tuyệt đối không gửi toàn bộ cây Taxonomy** vào prompt gây quá tải ngữ cảnh và chi phí token.

### 1.5 Thuật toán Chấm điểm Đối sánh (Deterministic Scoring Engine)
* **Nguyên tắc cốt lõi:**
  - Điểm số phải **hoàn toàn xác định (100% deterministic)**: Cùng một bộ dữ liệu đầu vào (CV và JD) bắt buộc phải tạo ra cùng một điểm số duy nhất, không phụ thuộc vào tính ngẫu nhiên (temperature) của AI.
  - Công thức có phiên bản cụ thể (ví dụ: `v2.0`), trọng số cố định:
    $$\text{Overall Score} = 0.40 \cdot S_{\text{skill}} + 0.25 \cdot S_{\text{exp}} + 0.10 \cdot S_{\text{edu}} + 0.10 \cdot S_{\text{proj}} + 0.15 \cdot S_{\text{sem}}$$
  - Sinh bảng bóc tách điểm thành phần (`score breakdown`) và mã lý do (`reason codes`).
  - **TUYỆT ĐỐI KHÔNG** sử dụng các thuộc tính nhạy cảm (tuổi tác, giới tính, tôn giáo, chủng tộc, tình trạng hôn nhân, ảnh đại diện) vào thuật toán tính điểm.
  - **TUYỆT ĐỐI KHÔNG** tự động ra quyết định tuyển dụng cuối cùng; chỉ cung cấp căn cứ hỗ trợ Recruiter.

### 1.6 Xác thực Năng lực Kỹ thuật qua GitHub
* **Trách nhiệm:**
  - Cung cấp bằng chứng thực tế bổ trợ cho các kỹ năng lập trình do ứng viên khai báo.
  - Phân tích cấu trúc repository công khai, ngôn ngữ lập trình chủ đạo, tần suất hoạt động gần đây.
* **Cơ chế xác thực (GitHub Authentication):**
  - Luồng sản phẩm chỉ chấp nhận **GitHub OAuth App hoặc GitHub App**.
  - Không yêu cầu ứng viên nhập Personal Access Token vào sản phẩm.
  - PAT, nếu cần, chỉ được dùng cục bộ trong môi trường development và không được lưu trong source, database hoặc log.
* **Nguyên tắc bất biến:**
  - Không dùng số commit hay số sao (stars) làm tiêu chí đánh giá duy nhất.
  - Phân biệt rõ giữa *Kỹ năng ứng viên tự khai báo trong CV* và *Kỹ năng có bằng chứng xác thực từ GitHub*.
  - Bắt buộc hiển thị rõ snippet bằng chứng (repo name, tech stack) kèm mức độ tin cậy (`CONFIDENCE_LEVEL: HIGH | MEDIUM | LOW`).
  - **TUYỆT ĐỐI KHÔNG** dùng GitHub làm điều kiện tiên quyết để loại trừ ứng viên.

---

## 2. Quy tắc Giao diện Form Hồ sơ Ứng viên (Candidate Profile Form)

Sau khi hệ thống hoàn tất trích xuất dữ liệu, Frontend hiển thị Form chỉnh sửa gồm các khu vực thông tin bắt buộc:

1. **Thông tin cá nhân:** Họ và tên, Email, Số điện thoại, Địa chỉ, Tiêu đề nghề nghiệp, Liên kết ngoài (GitHub, LinkedIn, Portfolio).
2. **Tóm tắt nghề nghiệp:** Đoạn văn giới thiệu ngắn gọn về thế mạnh bản thân.
3. **Kỹ năng chuyên môn:** Danh sách các Skill Chips.
4. **Kinh nghiệm làm việc:** Thiết kế dạng Card lặp (Repeated Cards).
5. **Dự án nổi bật:** Thiết kế dạng Card lặp (Repeated Cards).
6. **Học vấn & Bằng cấp:** Thiết kế dạng Card lặp (Repeated Cards).
7. **Chứng chỉ nghề nghiệp:** Thiết kế dạng Card lặp (Repeated Cards).
8. **Ngôn ngữ:** Thiết kế dạng Card lặp (Repeated Cards).

### 2.1 Quy tắc Tương tác Card Lặp (Card Interaction Invariants)
Đối với các mục dùng Card lặp (Kinh nghiệm, Dự án, Học vấn, Chứng chỉ, Ngôn ngữ):
- Ứng viên có toàn quyền:
  - **Thêm mới (Add):** Nhấn nút thêm card mới với các trường dữ liệu rỗng.
  - **Chỉnh sửa (Edit):** Trực tiếp sửa thông tin trên từng card.
  - **Xóa (Delete):** Xóa bỏ card không chính xác hoặc không muốn đưa vào hồ sơ.
  - **Sắp xếp (Sort / Reorder):** Thay đổi thứ tự ưu tiên của card nếu UI hỗ trợ.

### 2.2 Quy tắc Tương tác Kỹ năng (Skill Chips Invariants)
- Ứng viên có thể:
  - Thêm skill chip mới thông qua ô nhập liệu có **Taxonomy Autocomplete** (tự động gợi ý kỹ năng chuẩn hóa khi gõ ký tự).
  - Xóa bỏ skill chip do AI trích xuất nhầm hoặc ứng viên không muốn hiển thị.

### 2.3 Quy tắc Xác nhận Hồ sơ (Profile Confirmation Invariant)
- Sau khi hoàn tất chỉnh sửa, ứng viên xác nhận thông tin qua API endpoint chuẩn: `POST /api/v1/candidate/cvs/{cvId}/confirm`.
- Khi nhấn xác nhận, hệ thống:
  - Khóa phiên bản hồ sơ đã duyệt.
  - Chuyển trạng thái từ `DRAFT` sang `CONFIRMED`.
  - Kích hoạt tiến trình chuẩn hóa Taxonomy và sẵn sàng tham gia Matching.

---

## 3. Quản lý Nguồn gốc và Độ tin cậy của Dữ liệu (Data Lineage & Provenance)

Hệ thống phải phân định rạch ròi 7 trạng thái dữ liệu trong toàn bộ pipeline:

```text
[1. File CV gốc] ─────────> Artifact đầu vào bất biến phục vụ truy vết và kiểm toán; người dùng chỉnh sửa form không được ghi đè file gốc.
       │
[2. Raw Text] ────────────> Chuỗi ký tự thô 100% từ thư viện local, lưu checksum.
       │
[3. Structured Draft] ────> Kết quả JSON sơ bộ do LLM cấu trúc hóa (DRAFT).
       │
[4. Confirmed Profile] ───> Dữ liệu đã được ứng viên rà soát, chỉnh sửa và xác nhận.
       │
[5. Taxonomy Profile] ────> Kỹ năng và nghề nghiệp đã ánh xạ Canonical Taxonomy ID.
       │
[6. GitHub Evidence] ─────> Bằng chứng độc lập thu thập từ GitHub API.
       │
[7. Matching Result] ─────> Kết quả chấm điểm toán học, phân rã tiêu chí và giải thích.
```

### Metadata Đánh dấu Nguồn gốc (Provenance Tags)
Mỗi trường dữ liệu và kỹ năng trong hồ sơ bắt buộc phải mang một trong các nhãn nguồn gốc sau:
- `CV_EXTRACTED`: Trích xuất trực tiếp từ file CV của ứng viên bởi AI/thư viện local.
- `USER_ADDED`: Do ứng viên tự tay bổ sung mới trên giao diện form.
- `USER_CONFIRMED`: Trích xuất từ CV và đã được ứng viên kiểm tra, xác nhận giữ lại.
- `GITHUB_VERIFIED`: Được xác minh độc lập thông qua việc kiểm tra kho mã nguồn GitHub.
- `SYSTEM_INFERRED`: Được hệ thống suy luận dựa trên quan hệ phân cấp của Taxonomy (ví dụ: biết *Spring Boot* thì tự động suy luận có kiến thức nền tảng về *Java*).

---

## 4. Quy tắc Phân tích Khoảng cách Kỹ năng & Gợi ý (Skill Gap & Recommendations)

1. **Neo chặt chẽ theo JD Đích:** Mọi phân tích khoảng cách kỹ năng và gợi ý học tập bắt buộc phải xuất phát từ một Job Description (JD) cụ thể được chọn, **tuyệt đối không đưa ra các gợi ý mơ hồ, chung chung**.
2. **Phân loại 5 nhóm rõ ràng:**
   - **Nhóm 1 — Đã đáp ứng (Met):** Ứng viên có kỹ năng và JD yêu cầu.
   - **Nhóm 2 — Thiếu kỹ năng bắt buộc (Missing Required):** JD yêu cầu là điều kiện tiên quyết nhưng CV chưa thể hiện (gây trừ điểm nặng trong Skill Score).
   - **Nhóm 3 — Thiếu kỹ năng ưu tiên (Missing Preferred):** Kỹ năng cộng điểm thêm của JD mà ứng viên chưa có.
   - **Nhóm 4 — Kỹ năng liên quan nên học (Recommended Related):** Kỹ năng kế cận trong Taxonomy giúp tăng khả năng thích nghi nhanh với công việc.
   - **Nhóm 5 — Bằng chứng còn thiếu (Missing Evidence):** Kỹ năng ứng viên có nêu nhưng thiếu minh chứng dự án hoặc kinh nghiệm thực chiến.
3. **Quy tắc Đạo đức Dữ liệu:** Lộ trình học tập và kỹ năng gợi ý chỉ được hiển thị ở mục tư vấn hướng nghiệp. **Hệ thống TUYỆT ĐỐI KHÔNG tự động chèn các kỹ năng này vào CV/hồ sơ của ứng viên** khi chưa có sự xác nhận và bằng chứng thực tế từ ứng viên.

---

## 5. Nguyên tắc Đảm bảo Tính Toàn vẹn (Anti-Fabrication & Security)

- **Không hard-code secrets:** Không đặt API key, token hay password trong mã nguồn hoặc frontend.
- **Không log dữ liệu nhạy cảm:** Mọi exception message và log aggregator phải lọc bỏ header `Authorization`, bearer token và thông tin nhận dạng cá nhân (PII).
- **Không tự tạo bằng chứng giả:** Trong môi trường thử nghiệm và vận hành, mọi kết luận đều phải có bằng chứng từ log, HTTP response hoặc kết quả test thực tế với exit code `0`.
