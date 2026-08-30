# ADR-005: CHỌN MÔ HÌNH VÀ DỊCH VỤ LLM PROVIDER

## Status
**ACCEPTED**

## Context
Hệ thống cần dịch vụ LLM để thực hiện trích xuất dữ liệu cấu trúc (Entity Extraction) từ văn bản JD/CV và sinh minh chứng giải thích.

## Decision
Sử dụng **OpenAI API (`gpt-4o-mini`)** cho nhiệm vụ trích xuất thực thể và **Structured JSON Schema Output Mode**. Hỗ trợ cơ chế Fallback sang mô hình Local LLM (qua Ollama/vLLM) khi cần.

## Consequences & Trade-offs
* **Ưu điểm:**
  * `gpt-4o-mini` có chi phí cực kỳ rẻ, tốc độ xử lý nhanh ($< 2\text{s}$) và khả năng tuân thủ JSON Schema tuyệt đối.
  * Chất lượng đọc hiểu ngôn ngữ tiếng Việt và tiếng Anh trong CV/JD đạt độ chính xác cao.
* **Đánh đổi (Trade-offs):**
  * Phụ thuộc vào kết nối Internet và hạn ngạch (Rate limits) của OpenAI API. Đã giải quyết bằng cơ chế Retry 3 lần và mã hóa API Key server-side.
