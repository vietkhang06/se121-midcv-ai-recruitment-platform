# 26. TÀI LIỆU QUYẾT ĐỊNH KIẾN TRÚC (ARCHITECTURE DECISION RECORD - ADR)

Tài liệu này ghi lại các Quyết định Kiến trúc Công nghệ quan trọng (ADRs) cho Hệ thống Tuyển dụng AI.

---

## ADR-001: LỰA CHỌN THÀNH PHẦN CÔNG NGHỆ CỐT LÕI (TECH STACK SELECTION)

### Bối cảnh & Vấn đề
Hệ thống cần một Backend vững chắc cho các giao dịch nghiệp vụ doanh nghiệp (Doanh nghiệp, Tin tuyển dụng, Nộp đơn, Phân quyền, JWT) kết hợp với mô-đun AI mạnh về xử lý NLP, trích xuất văn bản từ file PDF/DOCX và tạo Vector Embedding.

### Quyết định (Decision)
Lựa chọn mô hình **Decoupled Architecture**:
* **Frontend:** Next.js (React 19, TypeScript, Vanilla CSS Tokens / Dynamic UI).
* **Core Business Backend:** **Java Spring Boot 3** (REST API, PostgreSQL JPA, Spring Security JWT, Transaction Management).
* **AI & Document Microservice:** **Python FastAPI** (NLP Text Parsing via PyPDF2/python-docx, Embedding Generation via LangChain/OpenAI, Entity Normalization).
* **Database:** **PostgreSQL 16 + Pgvector**.

### Lý do lựa chọn
1. Java Spring Boot mang lại sự tin cậy cao, chuẩn hóa kiến trúc doanh nghiệp, hiệu năng cao trong quản lý dữ liệu giao dịch và tích hợp phân quyền bảo mật mạnh mẽ.
2. Python FastAPI là môi trường tối ưu nhất thế giới hiện nay cho các thư viện xử lý tài liệu (PDF/DOCX) và các framework làm việc với AI/LLM.
3. Việc tách biệt giúp hệ thống có thể mở rộng độc lập (Scale Python AI Worker khi số lượng CV upload tăng đột biến mà không ảnh hưởng tới Backend chính).

---

## ADR-002: LỰA CHỌN VECTOR DATABASE: PGVECTOR VS STANDALONE VECTOR DB

### Bối cảnh & Vấn đề
Hệ thống cần lưu trữ và tìm kiếm vector tương đồng giữa JD và CV. Cần quyết định giữa việc tích hợp extension `pgvector` trực tiếp trong PostgreSQL hiện có hay triển khai một CSDL Vector độc lập (Qdrant / Chroma / Pinecone).

### Quyết định (Decision)
Lựa chọn **PostgreSQL 16 với tiện ích `pgvector`**.

### Lý do lựa chọn
1. **Đơn giản hóa Hạ tầng (Operational Simplicity):** Không cần quản lý, backup hay duy trì thêm một cụm Database server thứ hai. Tất cả dữ liệu quan hệ (Users, Jobs, CVs) và Vector Embeddings nằm trong cùng một CSDL.
2. **Hỗ trợ Giao dịch ACID (ACID Compliance):** Khi xóa 1 CV hoặc 1 Job, dữ liệu vector tương ứng được xóa đồng bộ tức thì bằng Foreign Key Cascade trong một Transaction duy nhất, tránh tình trạng Vector rác (Orphan Vectors).
3. **Hiệu năng cao với HNSW Index:** `pgvector` với chỉ mục HNSW hoàn toàn đáp ứng tốc độ tìm kiếm vector $< 200\text{ms}$ trên $500,000$ bản ghi.

---

## ADR-003: MÔ HÌNH CHẤM ĐIỂM HYBRID VS PURE EMBEDDING COSINE SIMILARITY

### Bối cảnh & Vấn đề
Có thể chỉ sử dụng điểm Cosine Similarity của Vector Embedding để làm điểm duy nhất xếp hạng hay không?

### Quyết định (Decision)
Lựa chọn **Hybrid Scoring Model** (Kết hợp $40\%$ Skill Score, $25\%$ Experience, $10\%$ Education, $10\%$ Project, $15\%$ Semantic Vector Embedding).

### Lý do lựa chọn
1. Phép tính Cosine Similarity thuần túy tuy giỏi về mặt ngữ nghĩa tổng thể nhưng **rất yếu trong việc phân biệt các điều kiện bắt buộc cứng (Hard Constraints)**. Nếu JD yêu cầu "Java" (Required) nhưng CV ứng viên chỉ có "Python" và làm dự án rất tốt, điểm Cosine Similarity vẫn có thể khá cao, gây đánh giá sai lệch.
2. Công thức Hybrid bảo đảm vừa phạt nặng các hồ sơ thiếu kỹ năng bắt buộc (Required Skills), vừa đánh giá được độ tương đồng ngữ nghĩa sâu sắc của dự án.

---

## ADR-004: NGUYÊN TẮC ZERO HALLUCINATION TRONG GIẢI THÍCH AI

### Bối cảnh & Vấn đề
Các mô hình LLM có nguy cơ tự bịa đặt ra thông tin kinh nghiệm hoặc kỹ năng không có trong CV để giải thích cho điểm số.

### Quyết định (Decision)
Áp dụng **Raw String Guardrails Verification Engine**. Mọi trích đoạn minh chứng (`cv_quote_snippet`) từ LLM bắt buộc phải vượt qua bài kiểm tra đối soát chuỗi trực tiếp trên văn bản CV thô trước khi hiển thị cho HR. Nếu không khớp $\rightarrow$ Tự động bị loại bỏ.
