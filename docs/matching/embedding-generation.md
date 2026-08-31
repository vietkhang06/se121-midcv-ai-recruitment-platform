# EMBEDDING GENERATION & PGVECTOR SPECIFICATION

Tài liệu này đặc tả Thuật toán Sinh Vector Embedding và Lưu trữ Tập trung duy nhất trên CSDL PostgreSQL với pgvector.

---

## 1. KHO LƯU TRỮ TRUNG TÂM (CENTRALIZED AUTHORITATIVE STORE)

* Toàn bộ 100% Vector Embedding của các thực thể (`JOB`, `CV`, `GITHUB`) được lưu duy nhất tại bảng `embeddings` (`entity_type`, `entity_id`, `model_name`, `dimension`, `embedding_vector vector(1536)`).
* Dimension bắt buộc: **1536** (`text-embedding-3-small`).
* Chỉ mục HNSW cosine:
  ```sql
  CREATE INDEX idx_embeddings_vector_hnsw ON embeddings 
  USING hnsw (embedding_vector vector_cosine_ops) WITH (m = 16, ef_construction = 64);
  ```

---

## 2. CHỈ SỐ COSINE SIMILARITY NORMALIZE

Công thức chuẩn hóa điểm số tương đồng $[0, 100]$:
$$\text{Score}_{\text{semantic}} = \max(0, \min(100, (1 - \text{cosine\_distance}) \times 100))$$
