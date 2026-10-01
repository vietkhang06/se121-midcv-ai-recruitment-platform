# Hướng Dẫn Cài Đặt Và Kiểm Thử Tesseract OCR Cho MidCV AI Worker

Tài liệu này hướng dẫn thiết lập native OCR engine (Tesseract 5.x) cùng 2 bộ ngôn ngữ bắt buộc `eng` và `vie` cho MidCV AI Worker trên Windows, Docker và CI.

---

## 1. Yêu cầu hệ thống

- **Tesseract OCR**: Phiên bản 5.x trở lên.
- **Language packs**:
  - `eng.traineddata` (Tiếng Anh)
  - `vie.traineddata` (Tiếng Việt)
- **AI Worker Dependencies**:
  - `pytesseract>=0.3.10`
  - `Pillow>=10.2.0`
  - `PyMuPDF>=1.23.0` (fitz)

---

## 2. Cài đặt trên Windows (Local Dev)

### 2.1 Cài đặt Tesseract OCR

Sử dụng `winget` trong PowerShell:
```powershell
winget install UB-Mannheim.TesseractOCR
```
Hoặc tải bộ cài đặt chính thức từ [UB-Mannheim Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki).
Đường dẫn cài đặt mặc định: `C:\Program Files\Tesseract-OCR\tesseract.exe`.

### 2.2 Bổ sung bộ ngôn ngữ Tiếng Việt (`vie.traineddata`)

Nếu bản cài đặt chưa có ngôn ngữ tiếng Việt:
1. Tải file `vie.traineddata` (tessdata_fast v5) từ GitHub:
   `https://github.com/tesseract-ocr/tessdata_fast/raw/main/vie.traineddata`
2. Lưu file vào thư mục tessdata:
   - Nếu có quyền Administrator: lưu vào `C:\Program Files\Tesseract-OCR\tessdata\vie.traineddata`.
   - Nếu không có quyền Administrator: tạo thư mục `%LOCALAPPDATA%\Tesseract-OCR\tessdata`, copy `eng.traineddata`, `osd.traineddata` từ `C:\Program Files\Tesseract-OCR\tessdata` sang, tải `vie.traineddata` vào đó, rồi thiết lập biến môi trường `TESSDATA_PREFIX`.

### 2.3 Cấu hình biến môi trường (`ai-worker/.env`)

```env
# Kích hoạt OCR
OCR_ENABLED=true

# Đường dẫn binary (để trống nếu tesseract đã nằm trong system PATH)
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe

# Đường dẫn tessdata (nếu dùng thư mục tessdata riêng)
TESSDATA_PREFIX=C:\Users\<Username>\AppData\Local\Tesseract-OCR\tessdata

# Ngôn ngữ nhận dạng
OCR_LANGUAGES=vie+eng

# Giới hạn xử lý
OCR_TIMEOUT_SECONDS=120
OCR_DPI=300
OCR_MIN_TEXT_CHARS_PER_PAGE=40
OCR_MAX_PAGES=30
OCR_PSM=3
```

### 2.4 Kiểm tra trên terminal

```powershell
tesseract --version
tesseract --list-langs
```
Kết quả phải hiển thị tối thiểu `eng` và `vie`.

---

## 3. Kiểm tra tính sẵn sàng qua API

### Health Check Endpoint
```http
GET http://localhost:8000/internal/ai/health
```

Phản hồi mẫu khi OCR sẵn sàng (`200 OK`):
```json
{
  "status": "UP",
  "ocr": {
    "enabled": true,
    "status": "READY",
    "version": "5.4.0.20240606",
    "executable": "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
    "required_languages": ["eng", "vie"],
    "installed_languages": ["eng", "osd", "vie"]
  },
  "documentExtraction": {
    "status": "UP",
    "ocrReady": true
  }
}
```

Phản hồi khi thiếu bộ ngôn ngữ `vie`:
```json
{
  "status": "DEGRADED",
  "ocr": {
    "enabled": true,
    "status": "LANGUAGE_MISSING",
    "version": "5.4.0.20240606",
    "executable": "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
    "required_languages": ["eng", "vie"],
    "installed_languages": ["eng", "osd"],
    "missing_languages": ["vie"]
  }
}
```

---

## 4. Xử lý mã lỗi OCR

Hệ thống trả về các mã lỗi cụ thể thay vì mã lỗi 500 chung:

| Mã HTTP | Error Code | Mô tả |
|---|---|---|
| 503 | `OCR_DEPENDENCY_MISSING` | Tesseract binary không tồn tại hoặc không thực thi được |
| 503 | `OCR_LANGUAGE_MISSING` | Thiếu file `vie.traineddata` hoặc `eng.traineddata` |
| 503 | `OCR_MISCONFIGURED` | Biến môi trường cấu hình sai giá trị |
| 504 | `OCR_TIMEOUT` | Thời gian OCR vượt quá ngưỡng `OCR_TIMEOUT_SECONDS` |
| 422 | `DOCUMENT_LIMIT_EXCEEDED` | Số trang vượt quá giới hạn cấu hình `OCR_MAX_PAGES` |
| 422 | `INVALID_DOCUMENT` | File ảnh / PDF bị hỏng hoặc sai signature |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Định dạng file không được hỗ trợ |

---

## 5. Docker Deployment

Xây dựng Docker image tự động tích hợp Tesseract OCR và cả hai bộ ngôn ngữ:
```bash
docker build -t ai-worker:latest ./ai-worker
```
Kiểm tra trực tiếp trong container:
```bash
docker run --rm ai-worker:latest tesseract --list-langs
```
Kết quả:
```text
List of installed languages (3):
eng
osd
vie
```
