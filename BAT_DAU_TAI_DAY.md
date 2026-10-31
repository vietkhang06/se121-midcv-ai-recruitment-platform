# MidCV — Bắt đầu từ đây

Bản sửa dựa trên source ZIP bạn gửi ngày 30/10/2026.

1. Đọc `docs/TASKS_20261030.md`: thay đổi, áp dụng patch, chạy, nghiệm thu và dọn file.
2. Đọc `docs/UC_TASK_MATRIX_20261030.md`: map 15 UC đúng số gốc và 8 task nhìn thấy trong ảnh.
3. Xem `docs/task-evidence/20261030/verification.json`: 92 backend test đã chạy qua, 8 test live bị SKIP; 29 frontend test qua; build backend/frontend và TypeScript qua.
4. Dùng patch bên cạnh thư mục source nếu áp dụng vào Git checkout có cùng baseline. `git apply --check` trước.

Đã loại thư mục build cũ `backend/bin` (286 file, gồm 198 `.class`) và 5 file thừa được xác nhận. Nếu dùng patch, chạy script dọn generated trước khi build lại.

Migration mới là **V29**. Không sửa/xóa V1–V28. Đăng nhập lại sau cập nhật vì token cũ không có loại token mới.

Source đã sửa không đồng nghĩa task live đã nghiệm thu. Cần chạy PostgreSQL/HTTP/SMTP/OAuth/SSE restart trên máy có dependencies thật; hướng dẫn và script đã kèm. Không xóa `.env`, uploads hay database đang dùng.
