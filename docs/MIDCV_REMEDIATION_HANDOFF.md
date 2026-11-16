# MidCV — Bàn giao bản sửa trên master(8)

Giải nén vào thư mục chứa `backend/` và `frontend/` của đúng bản master(8). Nếu đã chỉnh các file trong manifest, so sánh trước khi ghi đè. Giữ cấu hình .env đang dùng, bổ sung biến OAuth từ .env.example. Khởi động lại backend và frontend cùng lúc, rồi đăng nhập lại để chuyển sang refresh cookie.

## OAuth và phiên đăng nhập

| Provider | Biến môi trường của backend | Callback local |
|---|---|---|
| Google | GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET | http://localhost:8080/api/v1/auth/oauth/google/callback |
| GitHub | GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET | http://localhost:8080/api/v1/auth/oauth/github/callback |
| LinkedIn | LINKEDIN_OAUTH_CLIENT_ID, LINKEDIN_OAUTH_CLIENT_SECRET | http://localhost:8080/api/v1/auth/oauth/linkedin/callback |

Đăng ký callback khớp chính xác BACKEND_PUBLIC_URL. Bật sản phẩm Sign In with LinkedIn using OpenID Connect trên ứng dụng LinkedIn. V38 mở rộng danh sách provider. Tài khoản mạng xã hội mới là Candidate, còn HR mới đi qua biểu mẫu doanh nghiệp. Email trùng yêu cầu đăng nhập bằng phương thức hiện có trước khi liên kết. GitHub/LinkedIn thiếu email đã xác minh đi qua xác minh email MidCV.

Frontend dùng header X-MidCV-Session: cookie và credentials: include. Backend kiểm Origin và lưu refresh token trong cookie HttpOnly, SameSite=Strict, có Secure ở prod. Giữ frontend/backend cùng site, dùng nhất quán localhost khi chạy local và cấu hình origin frontend chính xác. Client CLI vẫn dùng refresh token trong JSON như trước. Profile prod yêu cầu JWT_SECRET riêng.

## Trạng thái nghiệm thu

| Phạm vi | Thay đổi và kiểm thử | Còn lại |
|---|---|---|
| OAuth | LinkedIn OIDC, V38, giao diện, ổn định tham số callback. Test chữ ký, nonce, audience, expiry và state đạt | Đăng nhập và đăng ký thật với cả ba provider, xác minh callback LinkedIn |
| ARCH-01/02 | Test snapshot và matching qua test doubles đạt. Quy trình live có tại ARCH_01_02_LIVE_ACCEPTANCE.md | Video, HTTP, DB, browser cùng application ID và phép SQL pgvector trên bản bàn giao |
| ARCH-03 | Test công cụ backup đạt | Chạy Flyway từ DB sạch và bản sao DB cũ, restore DB cùng tệp CV và đối chiếu checksum |
| ARCH-04 | Thêm Precision/Recall/F1 khi truyền --score-threshold, giữ các chỉ số ranking | Bộ nhãn độc lập, dự đoán thật và đối chiếu trích dẫn từng factor |
| ARCH-05 | Hai route upload CV của CVController gọi uploadCVAsync. PipelineWorker tách trích xuất và gọi /structure-cv. /extract-cv dùng CVParser, /extract-jd dùng JDParser | Hợp nhất các đường tương thích sau khi kiểm thử tương đương |
| ARCH-06 | Dependency Spring bắt buộc trong CV, application và matching. Test thiếu repository phiên bản đạt | Xác minh startup toàn stack và hành vi từ chối ứng tuyển trong môi trường tích hợp |
| ARCH-07 | Cookie và kiểm Origin, test HTTP bằng MockMvc và frontend contract đạt | Login, OAuth, logout và refresh nhiều tab qua trình duyệt thật |
| ARCH-08 | Thêm mã notification cố định vào email, test lỗi DB sau SMTP và gửi lại đạt | Thử với SMTP thật. SMTP có thể giao trùng khi lỗi xảy ra sau khi máy chủ mail đã nhận |
| ARCH-09 | Giữ phạm vi thay đổi ở các lỗi và tính năng đang sửa | Tách CVService, MatchingEngineService, PipelineWorker và api.ts, kiểm thử E2E sau refactor |
| ARCH-10 | CI chặn tham chiếu repository xuyên module mới và cạnh tạo vòng mới. Baseline ghi 67 tham chiếu và một nhóm vòng | Định nghĩa API công khai và giảm nợ phụ thuộc hiện có |
| ARCH-11 | Ma trận này ghi trạng thái của riêng bản bàn giao | Đồng bộ báo cáo, video và bằng chứng sau khi chạy live |

Backend 58 test tập trung đạt trên Java 21. Full suite đã dừng khi chờ PostgreSQL. Frontend kiểm TypeScript, 46 test contract và production build đạt. 16 test Python cho công cụ đánh giá, backup và ranh giới module đạt. Chưa nghiệm thu restart worker, tải đồng thời hoặc đo latency trên toàn stack.
