# AI ERROR HANDLING & GRACEFUL DEGRADATION SPECIFICATION

Tài liệu me đặc tả Phân loại Lỗi Kỹ thuật và Chiến lược Suy giảm Tín hiệu An toàn (Graceful Degradation).

---

## 1. PHÂN LOẠI MÃ LỖI AI WORKER

* `FILE_ERROR`: File hỏng, không thể đọc text từ PDF/DOCX.
* `EXTRACTION_ERROR`: LLM không trích xuất được dữ liệu phù hợp.
* `VALIDATION_ERROR`: Chuỗi JSON đầu ra của LLM không khớp với Pydantic JSON Schema.
* `GITHUB_ERROR`: URL GitHub không tồn tại hoặc API bị gián đoạn.
* `RATE_LIMIT_ERROR`: API OpenAI/GitHub chạm hạn ngạch (Thực hiện Retry hoặc Fallback).

---

## 2. CHIẾN LƯỢC GRACEFUL DEGRADATION KHI GITHUB LỖI

* Nếu kết nối API GitHub gặp sự cố hoặc gián đoạn rate limit:
  1. Tiến trình xử lý CV và bài đăng JD **vẫn diễn ra bình thường 100%**.
  2. Hồ sơ ứng viên **không bị đánh dấu hỏng hay phạt trừ điểm**.
  3. Trạng thái GitHub Assessment được gắn nhãn `UNAVAILABLE` để áp dụng Fallback ở Phase 4.
