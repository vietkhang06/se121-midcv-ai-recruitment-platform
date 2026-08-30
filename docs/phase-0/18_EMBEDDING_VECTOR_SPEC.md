# 18. ĐẶC TẢ EMBEDDING VÀ VECTOR DATABASE (EMBEDDING & PGVECTOR SPEC)

Tài liệu này đặc tả mô hình Embedding, số chiều không gian vector, độ đo khoảng cách Cosine trong PostgreSQL (`pgvector`), cũng như chiến lược quản lý phiên bản embedding (Versioning & Stale Vector Invalidation).

---

## 1. CẤU HÌNH MÔ HÌNH EMBEDDING (MODEL SPECIFICATION)

* **Mô hình Embedding chính:** OpenAI `text-embedding-3-small` (Định hướng mặc định cho Production) hoặc `all-MiniLM-L6-v2` (Local Fallback).
* **Kích thước Vector (Dimension):** **1536 dimensions** (đối với `text-embedding-3-small`).
* **Độ đo Tương đồng (Similarity Metric):** **Cosine Similarity** ($\cos(\theta)$).
  * Công thức tính Cosine Similarity giữa Vector JD ($\vec{J}$) và Vector CV ($\vec{C}$):
    $$\text{Cosine Similarity} = \frac{\vec{J} \cdot \vec{C}}{\|\vec{J}\| \|\vec{C}\|} = \frac{\sum_{i=1}^{n} J_i C_i}{\sqrt{\sum_{i=1}^{n} J_i^2} \sqrt{\sum_{i=1}^{n} C_i^2}}$$
  * Khoảng giá trị trả về trong Pgvector (`1 - (embedding <=> jd_embedding)`): từ $0.0$ (hoàn toàn khác biệt) đến $1.0$ (hoàn toàn giống nhau).

---

## 2. QUY TRÌNH ĐÓNG GÓI VĂN BẢN TẠO VECTOR (EMBEDDING TEXT STRUCTURING)

Để đảm bảo Vector chứa đầy đủ ngữ nghĩa bài tuyển dụng và hồ sơ ứng viên mà không vượt quá context window:

### 2.1 Chuỗi Văn bản Đại diện JD (JD Vector String Format)
```text
JOB TITLE: Senior Java Spring Boot Developer
SENIORITY: Senior (3+ YOE)
REQUIRED SKILLS: Java, Spring Boot, PostgreSQL, Microservices, REST API
PREFERRED SKILLS: Docker, Kubernetes, AWS
RESPONSIBILITIES: Design scalable backend architectures, optimize SQL queries, build RESTful APIs.
```

### 2.2 Chuỗi Văn bản Đại diện CV (CV Vector String Format)
```text
CANDIDATE TITLE: Fullstack Backend Engineer
SUMMARY: 3+ years experience building scalable Java Spring Boot backend services and PostgreSQL databases.
SKILLS: Java, Spring Boot, PostgreSQL, REST API, Docker, Git
EXPERIENCE HIGHLIGHTS: Developed microservices for e-commerce system handling 100k daily users. Optimized PostgreSQL queries reducing latency by 35%.
```

---

## 3. CHIẾN LƯỢC CẬP NHẬT VÀ TÁI TẠO VECTOR (STALE VECTOR INVALIDATION)

1. **Version Tagging:** Cột `embedding_version` được lưu trữ trong bảng `cvs` và `jobs` (Mặc định: `v1.0-text-embedding-3-small`).
2. **Re-embedding Trigger:** Khi mô hình Embedding hệ thống được nâng cấp phiên bản mới, một Background Task sẽ quét tất cả các bản ghi có `embedding_version != CURRENT_VERSION` để tạo lại vector bất đồng bộ mà không gây gián đoạn hệ thống.
3. **Invalidation Policy:** Khi HR sửa thông tin mô tả JD hoặc Candidate tải lên bản CV mới, vector cũ lập tức bị đánh dấu hết hạn (`is_stale = true`) và được tạo lại ngay.
