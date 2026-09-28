# Hướng dẫn Cấu hình LLM Chính (PRIMARY) & Cơ chế Dự phòng Ollama (FALLBACK)

Tài liệu hướng dẫn cấu hình và kiểm thử luồng trích xuất CV có cấu trúc trên hệ thống **MidCV**.

---

## 1. Kiến trúc luồng xử lý CV

```text
CV PDF/DOCX/Ảnh
  │
  ▼
[DocumentExtractionService] (pdfplumber, python-docx, pypdfium2, pytesseract)
  │ (Không gọi bất kỳ LLM nào)
  ▼
[TextQualityEvaluator] (Kiểm tra độ dài, tỷ lệ ký tự lỗi, tính đầy đủ)
  │
  ▼
[CVStructuringService] (Tạo prompt nghiêm ngặt, JSON repair tối đa 1 lần)
  │
  ▼
[FallbackLLMClient]
  ├──> PRIMARY LLM (OpenAI-Compatible endpoint: OpenAI, DeepSeek, vLLM, Groq...)
  │      └── Lỗi tạm thời (408, 429, 5xx, timeout, network failure, malformed JSON)?
  │            └── Có ──> Gọi FALLBACK Ollama (127.0.0.1:11434, granite4.2)
  │            └── Không (400, 401, 403, 404, invalid auth) ──> Re-raise lỗi ngay lập tức
  ▼
[StructuredCVValidator] (json.loads + Pydantic model validation)
  │ (Không tự suy diễn / bịa đặt dữ liệu)
  ▼
Lưu trữ kết quả chuẩn hóa
```

---

## 2. Cấu hình biến môi trường

Sử dụng tên biến môi trường trung tính trong file `.env`:

```env
# 1. PRIMARY LLM (Mặc định được ưu tiên gọi trước)
LLM_PRIMARY_PROVIDER=openai_compatible
LLM_PRIMARY_BASE_URL=https://api.openai.com/v1
LLM_PRIMARY_API_KEY=sk-proj-your-api-key-here
LLM_PRIMARY_MODEL=gpt-4o-mini
LLM_PRIMARY_TIMEOUT_SECONDS=180
LLM_PRIMARY_MAX_RETRIES=1

# 2. FALLBACK LLM (Chỉ kích hoạt khi PRIMARY gặp lỗi tạm thời)
LLM_FALLBACK_ENABLED=true
LLM_FALLBACK_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=dna5rm/granite4.2:3b-8k
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_TIMEOUT_SECONDS=180
OLLAMA_MAX_RETRIES=0

# 3. ENDPOINTS KIỂM THỬ NỘI BỘ (Chỉ bật khi dev/test Postman)
ENABLE_DEV_AI_TEST_ENDPOINTS=true
```

> **Bảo mật**: Tuyệt đối không commit API key thật vào Git hoặc `.env.example`. Không log API key, header `Authorization`, raw CV hoặc dữ liệu cá nhân.

---

## 3. Công cụ kiểm tra kết nối PRIMARY LLM

Để kiểm tra API key và kết nối tới PRIMARY endpoint mà không để lộ secret trong shell history:

```bash
cd ai-worker
python -m app.tools.check_primary_llm
```

Hoặc từ thư mục gốc của repository:

```bash
python scripts/check_primary_llm.py
```

Kết quả mẫu khi thành công:
```text
Primary LLM configuration: VALID
Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
Authentication: OK
Chat completion: OK
JSON response: OK
```

Công cụ phân biệt rõ ràng:
- `connection refused`: máy chủ không phản hồi
- `timeout`: vượt quá thời gian chờ
- `authentication failure`: sai API key (HTTP 401)
- `authorization failure`: không có quyền truy cập (HTTP 403)
- `model không tồn tại`: model sai (HTTP 404)
- `rate limit`: vượt hạn ngạch (HTTP 429)
- `provider 5xx`: lỗi nội bộ nhà cung cấp
- `response không hợp lệ`: cấu trúc response thiếu choices hoặc message

---

## 4. Công cụ trích xuất Text độc lập (Bước 1)

Chứng minh thư viện local đọc đúng CV mà không gọi LLM:

```bash
cd ai-worker
python -m app.tools.extract_document --file ../test-fixtures/synthetic/01_single_column_tech_cv.pdf --save
```

Kết quả trả về JSON metadata:
```json
{
  "fileType": "PDF",
  "extractionMethod": "PDF_TEXT",
  "pageCount": 1,
  "characterCount": 1454,
  "wordCount": 71,
  "ocrUsed": false,
  "qualityScore": 1.0
}
```

File raw text được lưu vào thư mục `ai-worker/test-output/extracted/` (thư mục này đã được đưa vào `.gitignore`).

---

## 5. Hướng dẫn kiểm thử bằng Postman (Bước 2)

### 5.1. Import Collection & Environment

1. Mở Postman -> chọn **Import**.
2. Chọn hai file:
   - `docs/postman/MidCV-LLM-Testing.postman_collection.json`
   - `docs/postman/MidCV-Local.postman_environment.json`
3. Chọn Environment: **MidCV-Local**.
4. Điền các biến trong environment:
   - `ai_worker_base_url`: `http://127.0.0.1:8000`
   - `primary_base_url`: URL của endpoint tương thích OpenAI
   - `primary_api_key`: API key của bạn (Postman lưu dạng secret)
   - `primary_model`: Model ID (ví dụ: `gpt-4o-mini`)

### 5.2. Danh sách Request và Assertion

| # | Request | Method & URL | Mục đích & Assertion |
|---|---|---|---|
| **01** | Primary Models | `GET {{primary_base_url}}/models` | Kiểm tra kết nối và danh sách models (HTTP 200). |
| **02** | Primary Chat Smoke Test | `POST {{primary_base_url}}/chat/completions` | Gửi test ping và kiểm tra parse JSON response (HTTP 200). |
| **03** | Extract CV to Raw Text | `POST {{ai_worker_base_url}}/internal/ai/dev/extract-text` | Gửi file CV (multipart/form-data), trả raw text + metadata, chứng minh **không gọi LLM**. |
| **04** | Structure Raw Text | `POST {{ai_worker_base_url}}/internal/ai/dev/structure-cv` | Gửi raw text, gọi PRIMARY, trả structured JSON hợp lệ với `providerUsed="primary"`. |
| **05** | Primary Temporary Failure | `POST {{ai_worker_base_url}}/internal/ai/dev/structure-cv` | Header `X-Simulate-Primary-Status: 503`, kích hoạt fallback sang Ollama với `fallbackUsed=true`. |
| **06** | Invalid API Key | `POST {{ai_worker_base_url}}/internal/ai/dev/structure-cv` | Header `X-Simulate-Primary-Status: 401`, trả HTTP 401, **không gọi Ollama**, không lộ key. |
| **07** | Invalid Model | `POST {{ai_worker_base_url}}/internal/ai/dev/structure-cv` | Header `X-Simulate-Primary-Status: 404`, trả HTTP 404, **không che giấu lỗi bằng fallback**. |
| **08** | Invalid Raw Text | `POST {{ai_worker_base_url}}/internal/ai/dev/structure-cv` | Gửi text rỗng, trả HTTP 400 validation error mà không gọi bất kỳ LLM nào. |

---

## 6. Chạy kiểm thử tự động

Từ thư mục `ai-worker`:

```bash
pytest tests/test_isolated_document_extraction.py
pytest tests/test_openai_compatible_client.py
pytest tests/test_fallback_orchestration.py
pytest tests/test_postman_dev_endpoints.py
pytest tests/test_startup_and_health.py
```

Hoặc chạy toàn bộ test suite:

```bash
pytest
```
