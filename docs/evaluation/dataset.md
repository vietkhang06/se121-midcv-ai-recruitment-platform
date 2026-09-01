# EVALUATION DATASET & GROUND-TRUTH SPECIFICATION

Tài liệu này quy định cấu trúc bộ dữ liệu thử nghiệm chuẩn (Evaluation Benchmark Dataset) và bộ nhãn chuẩn (Ground-Truth Labels) cho toàn bộ việc đánh giá chất lượng trích xuất AI, xếp hạng ứng viên và đối sánh đa ngành.

---

## 1. DỮ LIỆU BẢNG XẾP HẠNG ỨNG VIÊN BÀI ĐĂNG BACKEND JAVA DEVELOPER (10 CANDIDATES DATASET)

Bài tuyển dụng chuẩn: **Senior Java & Microservices Engineer**
- **Kỹ năng Bắt buộc (Required Skills)**: Java, Spring Boot, PostgreSQL, Docker
- **Kỹ năng Ưu tiên (Preferred Skills)**: Redis, TypeScript, Pgvector
- **Số năm kinh nghiệm bắt buộc**: 3+ năm

### Danh sách 10 Ứng viên Thử nghiệm & Nhãn Chuẩn (Ground Truth):

| ID | Tên Ứng viên | Tóm tắt Hồ sơ & GitHub | Trạng thái Kỹ năng Bắt buộc | S_core (Dự kiến) | S_github (Dự kiến) | Thứ hạng Kỳ vọng (Ground Truth) |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **CAND-01** | Nguyen Van Java | 5 năm Java, Spring Boot, Microservices, Docker, PostgreSQL. GitHub active (Stars: 120, Recency: 2026). | 4/4 Match (0 Missing) | 90.75% | 88.75% | **Rank 1** ($S_{\text{overall}} = 90.45\%$) |
| **CAND-02** | Tran Thi Microservices | 4 năm Java, Spring Boot, Docker, PostgreSQL, Redis. Không kết nối GitHub cá nhân. | 4/4 Match (0 Missing) | 90.75% | N/A (Not connected) | **Rank 2** ($S_{\text{overall}} = 90.75\%$, Core Fallback) |
| **CAND-03** | Le Van Backend | 3 năm Java, Spring Boot, PostgreSQL, Docker. GitHub mới tạo, 1 repo, 0 stars. | 4/4 Match (0 Missing) | 85.20% | 45.00% | **Rank 3** ($S_{\text{overall}} = 73.14\%$) |
| **CAND-04** | Pham Van Python | 6 năm Python, Django, FastApi, Docker, PostgreSQL, GitHub khủng (Stars: 500+). **Thiếu Java & Spring Boot**. | 2/4 Match (Missing: Java, Spring Boot) | 55.40% | 95.00% | **Rank 6** (Bị khóa thứ hạng bởi Required Skill Gating) |
| **CAND-05** | Hoang Thi Junior Java | 1 năm Java, Spring Boot, PostgreSQL, Docker (Junior level). GitHub 10 repos học tập. | 4/4 Match (0 Missing) | 72.30% | 60.00% | **Rank 4** ($S_{\text{overall}} = 68.61\%$) |
| **CAND-06** | Vu Van Fullstack | 3 năm TypeScript, React, Node.js, Docker, Java cơ bản. GitHub active React/Node. | 3/4 Match (Missing: Spring Boot) | 62.10% | 75.00% | **Rank 7** (Missing Required Skill) |
| **CAND-07** | Dang Van DevOps | 5 năm Docker, Kubernetes, CI/CD, Go, Python. Không làm Java backend. | 1/4 Match (Missing: Java, Spring Boot, PostgreSQL) | 42.00% | 85.00% | **Rank 8** |
| **CAND-08** | Bui Thi Data Engineer | 4 năm Python, Spark, SQL, PostgreSQL, Docker. GitHub data pipelines. | 2/4 Match (Missing: Java, Spring Boot) | 48.50% | 70.00% | **Rank 9** |
| **CAND-09** | Doan Van Frontend | 4 năm React, Vue, TypeScript, TailwindCSS. GitHub UI repos. | 0/4 Match (Missing all required backend skills) | 25.00% | 80.00% | **Rank 10** |
| **CAND-10** | Ngo Van C++ | 4 năm C++, Embedded, Linux. GitHub C++ drivers. | 0/4 Match (Missing Java ecosystem) | 22.00% | 65.00% | **Rank 11** |

---

## 2. DỮ LIỆU ĐA NGÀNH NGHỀ (MULTI-INDUSTRY BENCHMARK DATASET)

| Ngành nghề (Industry) | Vị trí Tuyển dụng JD | Hồ sơ Ứng viên Thử nghiệm | Đặc tính Xử lý & Khóa quy tắc |
| :--- | :--- | :--- | :--- |
| **Technology** | Senior Java & AI Engineer | Nguyen Van Java CV | Đầy đủ Core JD-CV Score + GitHub Supporting Score ($S_{\text{overall}} = 0.70 S_{\text{core}} + 0.30 S_{\text{github}}$) |
| **Marketing** | Digital Performance Marketing Manager | Tran Marketing CV | Tự động **tắt GitHub Assessment**, $S_{\text{overall}} = S_{\text{core}}$ (Fallback chuẩn) |
| **Finance** | Senior Financial Auditor & Risk Analyst | Le Finance CV | Tự động **tắt GitHub Assessment**, trích xuất chuẩn chứng chỉ CPA/ACCA |
| **Design** | Senior UI/UX Designer | Pham Design CV | Tự động **tắt GitHub Assessment**, trích xuất công cụ Figma, Adobe XD |

---

## 3. BỘ CÂU HỎI ĐỐI KHÁNG AI (ADVERSARIAL HALLUCINATION EVALUATION DATASET)

1. **Test Case ADV-01 (Nghiêm cấm bịa đặt AWS)**:
   - CV Ứng viên: Chỉ chứa kinh nghiệm Docker & PostgreSQL. Không có từ khóa AWS.
   - Kỳ vọng: Lời giải thích AI **tuyệt đối không được khẳng định ứng viên có kinh nghiệm AWS**.

2. **Test Case ADV-02 (Nghiêm cấm bịa đặt Kubernetes từ GitHub)**:
   - GitHub Ứng viên: Chỉ chứa repos Python/FastAPI. Không chứa Kubernetes.
   - Kỳ vọng: Thẻ GitHub Assessment **không được liệt kê Kubernetes vào danh sách công nghệ minh chứng**.

3. **Test Case ADV-03 (Nghiêm cấm báo match sai kỹ năng JD)**:
   - JD không yêu cầu React.
   - Kỳ vọng: Match Factors **không được báo React là kỹ năng trùng khớp ưu tiên cho vị trí backend**.
