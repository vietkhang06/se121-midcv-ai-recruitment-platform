# CORE PRODUCT FLOW — AI RECRUITMENT PLATFORM (MIDCV)

Tài liệu này là **Nguồn sự thật duy nhất (Single Source of Truth - SSOT)** về toàn bộ luồng vận hành sản phẩm của hệ thống **MidCV**. Mọi quyết định thiết kế, triển khai backend, AI worker, frontend và kiểm thử đều phải tuân thủ nghiêm ngặt theo tài liệu này.

---

## 1. Sơ đồ Luồng Sản Phẩm Cốt Lõi (End-to-End Flow)

```text
[1. Ứng viên tải CV (PDF/DOCX/Ảnh)]
       │
       ▼
[2. DocumentExtractionService]
       │ ──> Dùng thư viện cục bộ (pdfplumber, python-docx, pypdfium2, pytesseract)
       │ ──> Lấy 100% Raw Text từ file
       │ ──> KHÔNG gọi LLM, KHÔNG chấm điểm, KHÔNG tự chế dữ liệu
       ▼
[3. TextQualityEvaluator]
       │ ──> Đánh giá độ dài, tỷ lệ ký tự lỗi (\ufffd), tính hợp lệ
       │ ──> Quyết định có cần OCR fallback cho trang scan hay không
       ▼
[4. Phân tách Sections & Cấu trúc DRAFT ban đầu]
       │ ──> Sử dụng LLM chính (hoặc Ollama fallback nếu PRIMARY gặp lỗi tạm thời)
       │ ──> Parse JSON theo Pydantic schema, JSON repair tối đa 1 lần
       │ ──> Lưu hồ sơ ở trạng thái DRAFT (Metadata: CV_EXTRACTED)
       ▼
[5. Tự động điền dữ liệu vào Form hồ sơ ứng viên]
       │ ──> Hiển thị trên giao diện trực quan cho ứng viên
       ▼
[6. Ứng viên Rà soát, Chỉnh sửa, Bổ sung (Human-in-the-Loop)]
       │ ──> Xem, thêm, sửa, xóa các Card lặp (Kinh nghiệm, Dự án, Học vấn, Chứng chỉ, Ngôn ngữ)
       │ ──> Thêm / xóa skill chips bằng Taxonomy Autocomplete
       │ ──> Metadata đánh dấu: USER_ADDED / USER_CONFIRMED
       │ ──> TUYỆT ĐỐI KHÔNG ghi đè file CV gốc
       ▼
[7. Ứng viên Xác nhận Hồ sơ (USER_CONFIRMED)]
       │ ──> Hồ sơ chính thức được khóa trạng thái sẵn sàng tham gia đối sánh
       ▼
[8. Chuẩn hóa Kỹ năng và Nghề nghiệp theo Taxonomy]
       │ ──> Ánh xạ canonical ID, aliases tiếng Việt / tiếng Anh, quan hệ phân cấp
       ▼
[9. Ứng viên chọn Job Description (JD) đích]
       │ ──> Mỗi đợt đánh giá gắn liền với một JD cụ thể, không đánh giá chung chung
       ▼
[10. Đối sánh Ngữ nghĩa CV – JD & Tính toán Vector]
       │ ──> Embedding văn bản, Cosine similarity qua Pgvector
       ▼
[11. Thuật toán Chấm điểm Xác định (Deterministic Scoring Engine)]
       │ ──> Trọng số minh bạch, công thức xác định, tạo score breakdown & reason codes
       │ ──> KHÔNG để LLM tự ý cho điểm hoặc quyết định tuyển dụng
       ▼
[12. Thu thập Bằng chứng Kỹ thuật Bổ sung qua GitHub]
       │ ──> Kiểm tra repository, commit signals, language stats làm bằng chứng hỗ trợ
       │ ──> Hiển thị evidence và mức confidence; không làm tiêu chí loại trừ duy nhất
       ▼
[13. Xác định Khoảng cách Kỹ năng (Skill Gap Analysis)]
       │ ──> Phân loại: Đã đáp ứng, Thiếu bắt buộc, Thiếu ưu tiên, Kỹ năng nên học, Thiếu minh chứng
       ▼
[14. Gợi ý Kỹ năng & Lộ trình Cải thiện dựa trên JD đích]
       │ ──> Tạo gợi ý học tập sát thực tế
       │ ──> TUYỆT ĐỐI KHÔNG tự động thêm kỹ năng gợi ý vào hồ sơ/CV
       ▼
[15. Nhà tuyển dụng (Recruiter) Xem xét Bằng chứng & Ra Quyết định]
       │ ──> Xem điểm số, bảng phân rã tiêu chí, trích dẫn văn bản gốc và ranking
       │ ──> Recruiter là người ra quyết định tuyển dụng cuối cùng
```

---

## 2. Chi tiết Từng Bước trong Luồng Sản Phẩm

### Bước 1: Tiếp nhận và Lưu trữ File CV Gốc
- **Đầu vào:** File CV do ứng viên tải lên định dạng PDF, DOCX, DOC, PNG, JPG, JPEG, WEBP.
- **Nguyên tắc bất biến:** File CV gốc là artifact đầu vào bất biến phục vụ truy vết và kiểm toán. Việc người dùng chỉnh structured profile không được ghi đè file gốc. File nhị phân gốc được lưu trữ nguyên vẹn vào phân vùng lưu trữ bảo mật (Storage Path) với checksum SHA-256.

### Bước 2: Trích xuất Văn bản Thô (Raw Text Extraction)
- **Công nghệ:** Thư viện local: `pdfplumber` (hỗ trợ layout 2 cột), `python-docx` (bảo toàn cấu trúc bảng và đoạn văn), `pypdfium2` (render trang scan), `pytesseract` (Tesseract 5 với model `eng+vie`).
- **Phạm vi trách nhiệm:** Chỉ trích xuất chuỗi ký tự thô nguyên bản từ file và tạo metadata trích xuất (`fileType`, `extractionMethod`, `pageCount`, `characterCount`, `ocrUsed`).
- **Ràng buộc:** Hoàn toàn **không gọi LLM**, không chấm điểm, không thêm thắt nội dung không tồn tại trong văn bản gốc.

### Bước 3: Đánh giá Chất lượng Văn bản Thô (Text Quality Evaluation)
- **Công nghệ:** `TextQualityEvaluator`.
- **Tiêu chí đánh giá:**
  - Tổng số ký tự và số từ có đạt ngưỡng tối thiểu để đại diện cho một CV hay không.
  - Tỷ lệ ký tự lỗi font, unprintable hoặc ký tự thay thế `\ufffd`.
  - Quyết định có cần kích hoạt OCR fallback đối với trang scan có mật độ chữ thấp hay không.
- **Ràng buộc:** Thực hiện hoàn toàn bằng thuật toán kiểm tra chuỗi cục bộ; không sử dụng AI hay LLM.

### Bước 4: Cấu trúc Hóa Sơ bộ Hồ sơ ở trạng thái DRAFT
- **Công nghệ:** `CVStructuringService` phối hợp cùng `FallbackLLMClient` (PRIMARY: OpenAI-compatible endpoint, FALLBACK: Ollama cục bộ) và `StructuredCVValidator`.
- **Nhiệm vụ:**
  - Nhận văn bản thô đã qua đánh giá chất lượng.
  - Sử dụng System Prompt nghiêm ngặt yêu cầu trả về duy nhất 1 JSON object khớp Pydantic schema, không markdown fences, không suy đoán.
  - Phân tích và nhóm dữ liệu thành các section: Thông tin cá nhân, Tóm tắt, Kỹ năng, Kinh nghiệm, Dự án, Học vấn, Chứng chỉ, Ngôn ngữ.
  - Nếu LLM sinh JSON sai cú pháp, thực hiện **tối đa đúng 1 lần JSON repair**.
  - Toàn bộ các trường dữ liệu do AI trích xuất được gắn nhãn nguồn gốc: `source = "CV_EXTRACTED"`.
  - Lưu hồ sơ vào database ở trạng thái **`DRAFT`**.

### Bước 5: Tự động điền dữ liệu vào Form (Autofill)
- **Giao diện:** Frontend hiển thị đầy đủ các trường thông tin được trích xuất vào form trực quan.
- **Mục đích:** Giúp ứng viên tiết kiệm thời gian nhập liệu, nhưng không xem dữ liệu trích xuất là sự thật tuyệt đối trước khi người dùng xác nhận.

### Bước 6: Ứng viên Rà soát, Chỉnh sửa và Bổ sung (Human-in-the-Loop)
- **Quyền hạn của Ứng viên:**
  - Chỉnh sửa thông tin cá nhân, liên kết GitHub, LinkedIn, Portfolio.
  - Thêm, sửa, xóa các Card lặp:
    - Card Kinh nghiệm làm việc (Công ty, Vị trí, Thời gian, Mô tả, Công nghệ).
    - Card Dự án (Tên dự án, Vai trò, Mô tả, Tech stack).
    - Card Học vấn (Trường, Bằng cấp, Chuyên ngành, Năm tốt nghiệp).
    - Card Chứng chỉ (Tên chứng chỉ, Tổ chức cấp, Ngày cấp).
    - Card Ngôn ngữ (Ngôn ngữ, Trình độ).
  - Thêm hoặc xóa các Skill Chips (gợi ý tự động từ từ điển Taxonomy).
- **Ghi nhận nguồn gốc:**
  - Dữ liệu do người dùng chỉnh sửa hoặc thêm mới được cập nhật metadata: `source = "USER_ADDED"`.
  - Dữ liệu nguyên bản từ CV được người dùng giữ nguyên và kiểm tra được đánh dấu: `source = "USER_CONFIRMED"`.

### Bước 7: Ứng viên Xác nhận Hồ sơ (User Confirmation)
- Ứng viên xác nhận thông tin hồ sơ qua API endpoint chuẩn: `POST /api/v1/candidate/cvs/{cvId}/confirm`.
- Hệ thống cập nhật trạng thái hồ sơ thành `CONFIRMED`.
- **Quy tắc bắt buộc:** Chỉ hồ sơ đã được ứng viên xác nhận mới đủ điều kiện tham gia luồng đối sánh ngữ nghĩa với JD.

### Bước 8: Chuẩn hóa Taxonomy Kỹ năng và Nghề nghiệp
- **Nhiệm vụ:** Ánh xạ các kỹ năng được ứng viên khai báo về Skill Taxonomy chuẩn của hệ thống:
  - Canonical ID (mã định danh chuẩn).
  - Tên chuẩn hóa (ví dụ: `ReactJS`, `react.js`, `React` $\rightarrow$ `React`).
  - Phân cấp cha–con (Domain $\rightarrow$ Sub-domain $\rightarrow$ Skill) và quan hệ kỹ năng tương đương.

### Bước 9: Chọn Job Description (JD) Đích
- Ứng viên chọn một công việc cụ thể muốn nộp đơn hoặc tự đánh giá độ phù hợp.
- Toàn bộ quá trình phân tích khoảng cách kỹ năng và gợi ý sau đó được neo trực tiếp theo yêu cầu cụ thể của JD này (Required Skills, Preferred Skills, Domain Context).

### Bước 10: Đối sánh Ngữ nghĩa CV – JD & Tính toán Vector
- Sinh vector embedding cho nội dung chuyên môn của CV đã xác nhận và JD (sử dụng model embedding cục bộ hoặc cloud chuẩn).
- Tính toán điểm tương đồng Cosine qua tiện ích mở rộng Pgvector trong PostgreSQL.

### Bước 11: Thuật toán Chấm điểm Xác định (Deterministic Scoring Engine)
- Tính điểm `overall_score` (0 – 100) theo công thức toán học có trọng số cố định:
  - 40% Điểm Kỹ năng (Required vs Preferred Skills).
  - 25% Điểm Số năm Kinh nghiệm (Non-overlapping work duration).
  - 10% Điểm Học vấn & Chứng chỉ chuyên môn.
  - 10% Điểm Tương đồng Bối cảnh Dự án.
  - 15% Điểm Tương đồng Ngữ nghĩa Vector.
- Sinh bảng phân rã tiêu chí chi tiết (`score breakdown`) và mã lý do (`reason codes`).
- LLM chỉ được dùng để diễn giải kết quả toán học thành văn bản tự nhiên dễ hiểu, **tuyệt đối không được can thiệp vào điểm số**.

### Bước 12: Thu thập Bằng chứng Kỹ thuật Bổ sung qua GitHub
- Hệ thống gửi yêu cầu phân tích tài khoản GitHub do ứng viên cung cấp.
- **Xác thực GitHub:** Luồng sản phẩm chỉ chấp nhận **GitHub OAuth App hoặc GitHub App**. Không yêu cầu ứng viên nhập Personal Access Token vào sản phẩm. PAT, nếu cần, chỉ được dùng cục bộ trong môi trường development và không được lưu trong source, database hoặc log.
- Đánh giá tín hiệu hoạt động thực tế: ngôn ngữ lập trình chủ đạo, cấu trúc dự án công khai, commit gần nhất.
- Bằng chứng được đính kèm vào hồ sơ dưới dạng bằng chứng bổ trợ (`GITHUB_VERIFIED`) kèm mức độ tin cậy (`confidence level`).
- **Nguyên tắc:** GitHub không bao giờ là yếu tố loại trừ ứng viên duy nhất.

### Bước 13: Xác định Khoảng cách Kỹ năng (Skill Gap Analysis)
- Dựa trên JD đích đã chọn, hệ thống phân loại danh mục kỹ năng của ứng viên thành 5 nhóm:
  1. **Đã đáp ứng (Met Skills):** Kỹ năng ứng viên có và JD yêu cầu.
  2. **Thiếu kỹ năng bắt buộc (Missing Required Skills):** Kỹ năng bắt buộc của JD mà CV chưa thể hiện.
  3. **Thiếu kỹ năng ưu tiên (Missing Preferred Skills):** Kỹ năng cộng điểm của JD mà CV chưa có.
  4. **Kỹ năng liên quan nên học (Recommended Related Skills):** Kỹ năng bổ trợ gần gũi trong taxonomy giúp tăng khả năng thích ứng.
  5. **Bằng chứng còn thiếu (Missing Evidence):** Kỹ năng ứng viên khai báo nhưng chưa có minh chứng dự án/kinh nghiệm/GitHub cụ thể.

### Bước 14: Gợi ý Kỹ năng & Lộ trình Cải thiện Cá nhân hóa
- LLM tạo hướng dẫn học tập, khóa học hoặc dự án thực hành nhằm lấp đầy khoảng cách kỹ năng đối với JD đích.
- **Ràng buộc đạo đức & dữ liệu:** Gợi ý chỉ mang tính tham khảo. Hệ thống **tuyệt đối không tự động chèn các kỹ năng được gợi ý vào CV của ứng viên**.

### Bước 15: Nhà tuyển dụng (Recruiter) Đánh giá & Ra Quyết định Cuối cùng
- Recruiter truy cập Dashboard tuyển dụng:
  - Xem danh sách ứng viên xếp hạng theo thứ tự điểm phù hợp giảm dần.
  - Xem bằng chứng trích đoạn thực tế đối ứng với từng kỹ năng.
  - Xem tín hiệu kỹ thuật GitHub và mức độ tự tin.
- **Quyết định tuyển dụng cuối cùng (Phỏng vấn / Tuyển dụng / Từ chối) hoàn toàn thuộc về con người (Recruiter). AI đóng vai trò hệ thống hỗ trợ ra quyết định (Decision Support System).**
