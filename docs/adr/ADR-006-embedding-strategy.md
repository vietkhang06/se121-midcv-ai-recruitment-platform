# ADR-006: CHIẾN LƯỢC TẠO VECTOR EMBEDDING VÀ PHIÊN BẢN HÓA

## Status
**ACCEPTED**

## Context
Biểu diễn vector của văn bản JD và CV cần một mô hình embedding chuẩn hóa, có độ phân giải không gian đủ lớn và có cơ chế quản lý phiên bản khi mô hình được nâng cấp.

## Decision
Lựa chọn mô hình **OpenAI `text-embedding-3-small` (1536 dimensions)** làm mặc định, kết hợp với cột đánh dấu phiên bản `embedding_version` trong CSDL.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Kích thước 1536 chiều biểu diễn ngữ nghĩa chuyên sâu của kỹ năng công nghệ và kinh nghiệm dự án.
  * Việc lưu cột `embedding_version` giúp hệ thống không bị xung đột khi nâng cấp mô hình embedding trong tương lai.
* **Đánh đổi (Trade-offs):**
  * Mỗi lần thay đổi embedding model yêu cầu chạy tác vụ Batch Re-embedding cho toàn bộ bản ghi cũ.
