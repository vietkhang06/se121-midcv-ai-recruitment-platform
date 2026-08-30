# ADR-004: LỰA CHỌN PGVECTOR CHO LƯU TRỮ VÀ TÌM KIẾM VECTOR

## Status
**ACCEPTED**

## Context
Hệ thống cần tính toán khoảng cách Cosine giữa Vector JD và Vector CV để phục vụ đối sánh ngữ nghĩa. Cần quyết định dùng `pgvector` tích hợp sẵn hay hạ tầng Vector DB riêng biệt (Qdrant/Pinecone).

## Decision
Lựa chọn tiện ích mở rộng **`pgvector`** tích hợp trong PostgreSQL 16 với chỉ mục **HNSW (Hierarchical Navigable Small World)**.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Giảm độ phức tạp vận hành hạ tầng (No operational overhead of a 2nd Database).
  * Đồng bộ giao dịch ACID: Khi xóa Job/CV, Vector tương ứng tự động xóa bằng Foreign Key Cascade.
  * Tốc độ tìm kiếm vector bằng HNSW Index đạt dưới $200\text{ms}$.
* **Đánh đổi (Trade-offs):**
  * Tốn dung lượng RAM và đĩa cứng của PostgreSQL server khi số lượng Vector tăng lên quy mô hàng triệu bản ghi. (Hoàn toàn đáp ứng xuất sắc cho quy mô MVP).
