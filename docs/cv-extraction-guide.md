# Hướng Dẫn Vận Hành & Kiểm Thử Luồng Trích Xuất CV (MidCV Extraction Pipeline)

Tài liệu này cung cấp hướng dẫn toàn diện để khởi động local (Windows CMD / PowerShell / Docker Linux), kiểm tra các phụ thuộc hệ thống (Tesseract 5 OCR, LibreOffice), gửi request API mẫu qua `curl` và kiểm thử bộ CV giả lập đa định dạng trên giao diện web.

---

## 1. Kiến Trúc & Công Nghệ Đã Khóa (Pinned Stack)

Luồng trích xuất:
`FILE CV → RAW TEXT (pdfplumber / Tesseract 5 / LibreOffice / python-docx) → STRUCTURED JSON (Pydantic 2) → EVIDENCE GROUNDING → REVIEW & DOWNLOAD`

| Thành phần | Công nghệ / Thư viện | Phiên bản | Vai trò & Trách nhiệm |
| :--- | :--- | :--- | :--- |
| **PDF Native & Layout** | `pdfplumber` | `0.11.10` | Bóc tách text, tọa độ bounding box, thuật toán phân chia layout 2 cột qua `page.crop()` |
| **PDF Page Rendering** | `pypdfium2` | `5.13.0` | Render PDF sang ảnh raster 300 DPI khi phát hiện trang scan |
| **OCR Engine** | Tesseract 5 + `pytesseract` | `0.3.13` (Tesseract v5.5.0) | OCR trang scan và ảnh PNG/JPG/WEBP với ngôn ngữ `vie+eng` |
| **Xử lý ảnh** | `Pillow` (PIL) | `>=10.4.0` | Tự động chuẩn hóa EXIF orientation, chống Decompression Bomb (`MAX_IMAGE_PIXELS=50M`) |
| **Word DOCX** | `python-docx` | `>=1.1.2` | Duyệt tuần tự paragraph và table theo đúng thứ tự tài liệu |
| **Word DOC (Legacy)** | LibreOffice Headless | `7.x / 24.x` | Chuyển đổi DOC sang PDF trong sandbox cô lập; báo `DOC_CONVERTER_UNAVAILABLE` nếu thiếu |
| **Schema & Validation** | `pydantic` | `2.12.5` | Validate cấu trúc JSON, schema versioning `2.0.0`, bắt buộc kiểu dữ liệu chặt |
| **LLM Provider** | Ollama / OpenAI-compatible | Local / Gateway | Structuring JSON từ raw text (chống Prompt Injection, chống bịa đặt, bảo toàn số năm / ngày tháng) |
| **Backend Service** | Spring Boot | `3.3.4` (Java 21) | Lưu trữ bất biến document versions, quản lý job, kiểm tra RBAC/Ownership, API Review/Download/Retry |
| **Frontend UI** | Next.js 16 (Turbopack) | React 19, TailwindCSS | Giao diện Upload kéo thả, Stepper tiến trình, 5 Tab Review (Hồ sơ, Raw text, Grounded Evidence, JSON, Warnings) |

---

## 2. Yêu Cầu Môi Trường & Hướng Dẫn Cài Đặt

### 2.1. Cài đặt Tesseract 5 & Gói Ngôn Ngữ Tiếng Việt (`vie`)

1. **Windows**:
   - Tải bộ cài Tesseract 5 từ UB-Mannheim: [tesseract-ocr-w64-setup-5.x.exe](https://github.com/UB-Mannheim/tesseract/wiki)
   - Trong quá trình cài đặt, tích chọn thêm **Additional language data (download) -> Vietnamese**.
   - Hoặc tải thủ công file `vie.traineddata` từ [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast/raw/main/vie.traineddata) và đặt vào `C:\Program Files\Tesseract-OCR\tessdata\`.
   - Thêm `C:\Program Files\Tesseract-OCR` vào biến môi trường `PATH`.
   - Kiểm tra bằng lệnh:
     ```cmd
     tesseract --version
     tesseract --list-langs
     ```
     *(Kết quả phải hiển thị `eng` và `vie`)*

2. **Ubuntu / Debian / Docker**:
   ```bash
   apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-vie tesseract-ocr-eng
   ```

### 2.2. Cài đặt LibreOffice Headless (Dành cho tệp Word `.doc` cũ)

1. **Windows**:
   - Tải LibreOffice từ trang chủ [libreoffice.org](https://www.libreoffice.org/download/download/) và cài đặt mặc định vào `C:\Program Files\LibreOffice\`.
   - Pipeline tự động phát hiện `soffice.exe` tại `C:\Program Files\LibreOffice\program\soffice.exe`.
   - Nếu chưa cài đặt, hệ thống sẽ trả về mã lỗi rõ ràng `DOC_CONVERTER_UNAVAILABLE`, không bao giờ làm sập worker hay coi tệp DOC là DOCX.

2. **Ubuntu / Debian / Docker**:
   ```bash
   apt-get install -y libreoffice-writer --no-install-recommends
   ```

---

## 3. Hướng Dẫn Khởi Động Hệ Thống Local

### Bước 1: Khởi động Cơ sở dữ liệu PostgreSQL (pgvector)
```cmd
docker run -d --name airecruit-postgres-pgvector -p 5432:5432 -e POSTGRES_DB=recruitment_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16
```

### Bước 2: Khởi động AI Worker (Python FastAPI)
Mở cửa sổ Terminal 1:
```cmd
cd ai-worker
python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Healthcheck: `http://localhost:8000/health`*

### Bước 3: Khởi động Backend (Spring Boot)
Mở cửa sổ Terminal 2:
```cmd
cd backend
mvn spring-boot:run
```
*Backend chạy tại `http://localhost:8080`*

### Bước 4: Khởi động Frontend (Next.js)
Mở cửa sổ Terminal 3:
```cmd
cd frontend
npm install
npm run dev
```
*Truy cập giao diện tại: `http://localhost:3000`*

---

## 4. Tài Khoản & Kiểm Thử Qua Giao Diện (UI Walkthrough)

1. **Đăng nhập ứng viên**:
   - Truy cập `http://localhost:3000/login`
   - Tài khoản mẫu (nếu đã seed): `candidate1@example.com` / `Password123!` (hoặc đăng ký tài khoản mới trực tiếp trên trang `/register`).
2. **Truy cập Thư viện CV**:
   - Vào `http://localhost:3000/candidate/cvs`
3. **Tải lên CV**:
   - Bấm nút **"Tải CV Lên / Ingest Repo"**
   - Hỗ trợ kéo thả các file trong thư mục `test-fixtures/synthetic/`:
     - `01_single_column_tech_cv.pdf`: PDF có text 1 cột.
     - `02_two_column_cv.pdf`: PDF định dạng 2 cột.
     - `03_scanned_cv.pdf`: PDF trang scan (thử nghiệm OCR).
     - `04_cv_image.png`: Ảnh CV (thử nghiệm Image OCR).
     - `05_structured_table_cv.docx`: Word có bảng lồng nhau và liên kết.
     - `06_legacy_cv.doc`: Word định dạng nhị phân cổ điển.
4. **Màn hình Đánh giá Trích xuất & Bằng chứng (Review Modal)**:
   - Ngay sau khi upload xong, hoặc bấm vào nút **"Trích Xuất & Evidence"** trên từng thẻ CV, hệ thống mở cửa sổ kiểm tra độc lập gồm 5 tab:
     - **Tab Hồ Sơ Cấu Trúc**: Xem họ tên, headline, liên hệ, tóm tắt, kỹ năng (có chip số năm kinh nghiệm), kinh nghiệm, học vấn, chứng chỉ, ngoại ngữ.
     - **Tab Văn Bản Thô**: Xem raw text nguyên bản, phân chia theo từng trang/block, gắn nhãn phương thức (`pdf-native`, `ocr`, `conversion`), điểm OCR confidence và khoảng ký tự `[start..end]`. Có nút sao chép toàn bộ.
     - **Tab Bằng Chứng Đối Chiếu (Grounded Evidence)**: Liệt kê toàn bộ các fact được trích xuất cùng **trích dẫn nguyên văn (quote)** từ văn bản gốc, số trang và vị trí ký tự. Bấm vào quote để đối chiếu trực tiếp.
     - **Tab JSON Đã Kiểm Tra**: Xem JSON chuẩn hóa theo Pydantic schema version `2.0.0` với định dạng màu sắc cú pháp và nút sao chép JSON.
     - **Tab Cảnh Báo & Audit**: Hiển thị các cảnh báo kỹ thuật (chất lượng OCR, định dạng 2 cột) và các sự thật chưa được đối chiếu (Unverified facts) nếu có.
5. **Tải kết quả về máy**:
   - Nút **`raw.txt`**: Tải bản văn bản thô đầy đủ của CV.
   - Nút **`structured.json`**: Tải tệp JSON chuẩn hóa.
   - Nút **`File Gốc`**: Tải lại tệp gốc đã upload.
6. **Thử lại trích xuất (Retry)**:
   - Bấm nút **"Trích xuất lại"** để kích hoạt pipeline xử lý lại nếu cần cập nhật cấu hình hoặc model.

---

## 5. Danh Sách Tệp Mẫu Trong `test-fixtures/synthetic/`

| Tên tệp | Định dạng | Phương thức xử lý | Dữ liệu chính cần đối chiếu |
| :--- | :--- | :--- | :--- |
| `01_single_column_tech_cv.pdf` | PDF Native | `pdfplumber` layout | Tên: NGUYEN TUAN ANH; Kỹ năng: Spring Boot, PostgreSQL, Kafka; Cty: FinTech Solutions Vietnam |
| `02_two_column_cv.pdf` | PDF 2 cột | `pdfplumber` crop | Tên: LE MINH QUAN; Kỹ năng: Python, FastAPI, Docker; Cty: NextGen Tech Hanoi |
| `03_scanned_cv.pdf` | PDF Scan | `pypdfium2` + Tesseract | Tên: TRAN THI MAI; Kỹ năng: Content Marketing, SEO; Cty: VietBrands |
| `04_cv_image.png` | Ảnh PNG | Pillow + Tesseract | Nhận diện chữ tiếng Việt & tiếng Anh, chuẩn hóa EXIF, chống pixel bomb |
| `05_structured_table_cv.docx` | Word DOCX | `python-docx` | Bóc tách bảng kinh nghiệm (Saigon Tech Labs, InnoSoft Vietnam), liên kết GitHub/LinkedIn |
| `06_legacy_cv.doc` | Word DOC | LibreOffice Headless | Fallback chuyển đổi PDF hoặc trả mã `DOC_CONVERTER_UNAVAILABLE` nếu môi trường thiếu LibreOffice |

*Chi tiết ground truth mong đợi xem tại: `test-fixtures/synthetic/expected_outputs.json`.*

---

## 6. Lệnh Gọi Mẫu Bằng `curl` (Tương thích Windows CMD & Linux)

### 6.1. Đăng nhập lấy Token
```cmd
curl -s -X POST http://localhost:8080/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"candidate1@example.com\",\"password\":\"Password123!\"}"
```
*Lưu giá trị `data.accessToken` vào biến môi trường `TOKEN`.*

### 6.2. Upload CV mới
```cmd
curl -X POST http://localhost:8080/api/v1/candidate/cvs/upload ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "file=@test-fixtures/synthetic/01_single_column_tech_cv.pdf" ^
  -F "title=Nguyen Tuan Anh Backend CV" ^
  -F "targetIndustry=Technology"
```

### 6.3. Lấy dữ liệu Review & Grounded Evidence
```cmd
curl -s -X GET http://localhost:8080/api/v1/candidate/cvs/<CV_ID>/review ^
  -H "Authorization: Bearer %TOKEN%"
```

### 6.4. Tải xuống Raw Text
```cmd
curl -O -J http://localhost:8080/api/v1/candidate/cvs/<CV_ID>/download/raw ^
  -H "Authorization: Bearer %TOKEN%"
```

### 6.5. Tải xuống Structured JSON
```cmd
curl -O -J http://localhost:8080/api/v1/candidate/cvs/<CV_ID>/download/json ^
  -H "Authorization: Bearer %TOKEN%"
```

### 6.6. Thử lại trích xuất (Retry Job)
```cmd
curl -s -X POST http://localhost:8080/api/v1/candidate/cvs/<CV_ID>/retry ^
  -H "Authorization: Bearer %TOKEN%"
```

---

## 7. Các Lỗi Thường Gặp & Cách Khắc Phục

1. **`DOC_CONVERTER_UNAVAILABLE`**:
   - Nguyên nhân: Tệp tải lên là định dạng `.doc` cũ nhưng máy chủ chưa cài LibreOffice.
   - Xử lý: Cài đặt LibreOffice theo mục 2.2 hoặc lưu tệp Word dưới định dạng hiện đại `.docx`.
2. **`TESSERACT_NOT_FOUND`**:
   - Nguyên nhân: Máy chủ xử lý ảnh/PDF scan nhưng chưa cài binary Tesseract 5.
   - Xử lý: Cài đặt Tesseract 5 và thêm đường dẫn vào `PATH` như mục 2.1.
3. **`LLM_SERVICE_UNAVAILABLE`**:
   - Nguyên nhân: Dịch vụ Ollama hoặc gateway LLM chưa được khởi động tại `http://localhost:11434`.
   - Xử lý: Chạy `ollama serve` và kéo model `ollama pull dna5rm/granite4.2:3b-8k` (hoặc cấu hình model trong file `.env`).
