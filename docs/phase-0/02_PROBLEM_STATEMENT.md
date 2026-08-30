# 02. PHÂN TÍCH BỔI CẢNH VÀ ĐẶC TẢ VẤN ĐỀ (PROBLEM STATEMENT)

## 1. VẤN ĐỀ THỰC TẾ TRONG TUYỂN DỤNG TRUYỀN THỐNG

### 1.1 Thách thức của Nhà tuyển dụng (HR / Recruiter)
* **Quá tải thông tin (Information Overload):** Một tin tuyển dụng IT phổ biến có thể nhận từ 50 đến hơn 300 CV. Việc đọc và phân tích từng CV thủ công tiêu tốn hàng chục giờ làm việc.
* **Sai lệch do lọc từ khóa (Keyword Matching Flaws):** Các công cụ lọc CV truyền thống chỉ thực hiện Exact Match từ khóa. Nếu JD yêu cầu "ReactJS" nhưng CV ứng viên viết "React", hoặc JD yêu cầu "PostgreSQL" nhưng CV viết "Postgres SQL Database", hệ thống cũ có thể loại bỏ hồ sơ tiềm năng.
* **Chủ quan và thiếu chuẩn hóa trong đánh giá:** Đánh giá điểm mạnh/yếu của ứng viên phụ thuộc vào cảm tính của từng HR, không có tiêu chuẩn chấm điểm nhất quán theo từng trọng số kinh nghiệm, kỹ năng bắt buộc (Required) và ưu tiên (Preferred).
* **Thiếu khả năng giải thích (Lack of Explainability):** Khi chuyển hồ sơ cho Hiring Manager, HR phải tóm tắt lại lý do vì sao ứng viên phù hợp, gây lặp lại công việc phân tích.

### 1.2 Thách thức của Ứng viên (Candidate)
* **Thiếu minh bạch (Black Hole Effect):** Ứng viên gửi CV nhưng không nhận được phản hồi hoặc không biết lý do hồ sơ bị từ chối/không phù hợp với vị trí.
* **Khó khăn trong việc đánh giá sự phù hợp cá nhân:** Ứng viên khó biết liệu hồ sơ của mình đã đáp ứng bao nhiêu % yêu cầu của JD trước khi quyết định nộp đơn.

## 2. PHÂN TÍCH NGUYÊN NHÂN RỄ CÂY (ROOT CAUSE ANALYSIS)
1. **Dữ liệu CV và JD là cấu trúc phi định hình (Unstructured Data):** Văn bản PDF/DOCX có bố cục (layout) đa dạng, font chữ khác nhau, thứ tự mục không cố định, khiến các parser thông thường dễ trích xuất sai thông tin.
2. **Ngôn ngữ mô tả kỹ năng tự do (Semantic Heterogeneity):** Ứng viên viết kinh nghiệm bằng nhiều cách khác nhau ("Tham gia phát triển API" vs "Xây dựng các RESTful Microservices").
3. **Mối quan hệ phi tuyến giữa các tiêu chí:** Kinh nghiệm 3 năm ở công ty công nghệ lớn có thể mang giá trị khác với 3 năm làm công việc không liên quan; kỹ năng bắt buộc (Required Skill) thiếu hụt phải bị trừ điểm nặng hơn kỹ năng cộng thêm (Preferred Skill).

## 3. GIẢI PHÁP ĐỀ XUẤT BẰNG AI / LLM & VECTOR EMBEDDING

### 3.1 Trích xuất và Chuẩn hóa Thông tin dựa trên LLM
Sử dụng LLM để đọc hiểu cấu trúc phi định hình của JD và CV, trích xuất thành các trường dữ liệu định hình (Structured JSON Schema):
* **Yêu cầu JD:** Job Title, Seniority, Required Skills, Preferred Skills, Min/Max Years of Experience, Education Level, Certifications, Responsibilities.
* **Hồ sơ Candidate:** Profile Summary, Parsed Skills, Total Experience Years, Detailed Work History (Project, Position, Tech Stack, Duration), Education, Certifications.

### 3.2 Đối sánh Ngữ nghĩa bằng Vector Embedding & Pgvector
Chuyển đổi các đoạn văn bản kinh nghiệm và yêu cầu công việc thành các Vector không gian nhiều chiều (Vector Embedding). Sử dụng khoảng cách Cosine trong **Pgvector** để đo đạc độ tương đồng ngữ nghĩa (Semantic Similarity), giải quyết triệt để bài toán từ đồng nghĩa và mô tả mở rộng.

### 3.3 Scoring Model Hybrid (Kết hợp Structured & Semantic Rules)
Xây dựng công thức tính điểm minh bạch kết hợp:
* Điểm kỹ năng bắt buộc (Required Skills Match)
* Điểm kỹ năng ưu tiên (Preferred Skills Match)
* Điểm số năm kinh nghiệm (Experience Match)
* Điểm học vấn & chứng chỉ (Education & Certification Match)
* Điểm tương đồng ngữ nghĩa dự án (Semantic Context Similarity)

### 3.4 Minh chứng giải thích dựa trên thực tế (Evidence-based Explanation)
LLM tổng hợp kết quả từ engine đối sánh và trích xuất nguyên văn các trích đoạn (Snippets) từ CV làm bằng chứng chứng minh cho từng tiêu chí phù hợp hay chưa phù hợp, đảm bảo tuyệt đối **không tự tạo ra minh chứng giả (Zero Hallucination)**.

## 4. TIÊU CHÍ BẢO ĐẢM THÀNH CÔNG (CRITICAL SUCCESS FACTORS)
1. **Độ chính xác trích xuất:** AI trích xuất đúng kỹ năng và số năm kinh nghiệm đạt $\ge 90\%$.
2. **Tốc độ xử lý:** Phân tích 1 CV mới và tính điểm matching với JD trong dưới 5 giây.
3. **Tính minh bạch:** 100% điểm Match Score đi kèm với danh sách kỹ năng khớp, kỹ năng thiếu và trích đoạn minh chứng thực tế từ CV.
