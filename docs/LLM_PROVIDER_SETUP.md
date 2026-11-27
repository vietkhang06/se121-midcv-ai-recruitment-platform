# Cấu hình LLM Provider cho MidCV

Backend và AI Worker gọi API tương thích OpenAI. Worker dùng chat cho cấu trúc hóa tài liệu, taxonomy và giải thích. Backend dùng chat cho luồng screening. Embedding dùng API riêng hoặc dùng chung URL và khóa với chat.

| Biến môi trường | Giá trị hoặc ý nghĩa |
|---|---|
| LLM_PRIMARY_BASE_URL | URL cơ sở của API chat, ví dụ https://api.openai.com/v1 |
| LLM_PRIMARY_API_KEY | Khóa API của nhà cung cấp chat, lưu phía máy chủ |
| LLM_PRIMARY_MODEL | Tên model chat mà tài khoản được cấp quyền |
| LLM_PRIMARY_TIMEOUT_SECONDS, LLM_PRIMARY_MAX_RETRIES | Timeout và số lần thử lại của AI Worker |
| EMBEDDING_BASE_URL | URL API embedding. Để trống để dùng URL chat |
| EMBEDDING_API_KEY | Khóa embedding. Nếu URL khác URL chat, đặt khóa tương ứng |
| EMBEDDING_MODEL | Model hỗ trợ trả đúng 1024 chiều, mặc định text-embedding-3-small |

Dùng .env.example cho môi trường phát triển và .env.production.example cho Docker Compose. Nếu chỉnh chat trong Admin, cấu hình đó áp dụng cho chat của backend. AI Worker và embedding backend đọc biến môi trường khi khởi động.

API embedding cần hỗ trợ POST /embeddings với dimensions=1024, trả đúng tên model và vector hữu hạn. Pgvector lưu vector ở 1024 chiều. Khi đổi model, tạo lại embedding cho CV/JD bị ảnh hưởng trước khi chứng nhận kết quả mới. Bản ghi cũ giữ metadata model đã tạo ra chúng.

Từ thư mục gốc, chạy python scripts/check_primary_llm.py để thử chat với dữ liệu vô danh. Từ ai-worker/, chạy python -m app.tools.diagnose_llm để kiểm tra model và phản hồi embedding.

Worker thử lại có giới hạn với kết nối lỗi, timeout, HTTP 408/429 và 5xx. Lỗi xác thực, phân quyền và model/endpoint sai cần sửa cấu hình. OCR và trích xuất văn bản gốc dùng thư viện đọc tài liệu. Bộ so sánh văn bản có thể trả điểm tạm khi chưa có vector, với trạng thái riêng.

Flyway V47 chuyển cấu hình AI hiện tại sang provider và bỏ hai cột cấu hình local. Migration cũ giữ checksum để nâng cấp cơ sở dữ liệu đã tồn tại. Kiểm thử nâng cấp từ DB có migration Application AI V46 trên bản sao trước khi áp dụng cho môi trường demo.
