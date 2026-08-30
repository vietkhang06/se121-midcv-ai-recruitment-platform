# ADR-003: LỰA CHỌN POSTGRESQL 16 LÀM CƠ SỞ DỮ LIỆU CHÍNH

## Status
**ACCEPTED**

## Context
Dự án yêu cầu một CSDL quan hệ tin cậy để lưu trữ tài khoản, thông tin công ty, bài tuyển dụng, đơn ứng tuyển, kết quả chấm điểm và các minh chứng giải thích.

## Decision
Sử dụng **PostgreSQL 16** làm CSDL Quan hệ mặc định cho toàn bộ ứng dụng.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Hỗ trợ chuẩn SQL mạnh mẽ, ACID compliance hoàn hảo.
  * Hệ sinh thái mã nguồn mở giàu tiện ích (đặc biệt là tiện ích mở rộng `pgvector`).
  * Hiệu năng cao với các truy vấn JOIN phức tạp và đánh chỉ mục B-Tree / GIN.
* **Đánh đổi (Trade-offs):**
  * Cần tối ưu chỉ mục và cấu hình pool connection (HikariCP) cẩn thận khi số lượng connection tăng cao.
