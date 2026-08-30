# 07. QUY TẮC NGHIỆP VỤ HỆ THỐNG (BUSINESS RULES)

Tài liệu này tổng hợp toàn bộ các quy tắc nghiệp vụ áp dụng nhất quán trong toàn bộ hệ thống.

---

## 1. QUY TẮC PHÂN LẠI KỸ NĂNG VÀ TRỌNG SỐ JD (JOB REQUIREMENT RULES)

### BR-JOB-001: Phân biệt Kỹ năng Bắt buộc (Required) và Kỹ năng Ưu tiên (Preferred)
* **Required Skills (Kỹ năng Bắt buộc):** Là danh sách kỹ năng cốt lõi bắt buộc ứng viên phải đáp ứng để hoàn thành công việc.
  * Nếu ứng viên thiếu 1 kỹ năng Required, **điểm Kỹ năng (Skill Score) bị trừ nặng (Penalty)**.
* **Preferred Skills (Kỹ năng Ưu tiên):** Là kỹ năng cộng thêm, không bắt buộc.
  * Nếu ứng viên có kỹ năng Preferred, ứng viên được cộng thêm điểm thưởng (Bonus Score).
  * Nếu ứng viên thiếu kỹ năng Preferred, **không bị trừ điểm**.

### BR-JOB-002: Quy đổi Trình độ Kinh nghiệm (Seniority & Experience Mapping)
* Hệ thống quy định khung kinh nghiệm tối thiểu theo Cấp bậc (Seniority Level) nếu HR không nhập số năm cụ thể:
  * `INTERN`: $0$ năm.
  * `FRESHER`: $< 1$ năm.
  * `JUNIOR`: $1 - 2$ năm.
  * `MID_LEVEL`: $2 - 4$ năm.
  * `SENIOR`: $4 - 7$ năm.
  * `LEAD_MANAGER`: $> 7$ năm.

---

## 2. QUY TẮC CHUẨN HÓA VÀ TRÍCH XUẤT DỮ LIỆU CV (CV EXTRACTION RULES)

### BR-CV-001: Chuẩn hóa Từ điển Kỹ năng (Skill Normalization Rule)
* Toàn bộ tên kỹ năng từ CV và JD phải được chuyển về chữ thường và ánh xạ về Từ điển Kỹ năng Chuẩn (Normalized Skill Dictionary).
* **Ví dụ:**
  * `["React.js", "ReactJS", "React JS", "react"]` $\rightarrow$ `React`
  * `["Spring Boot", "SpringBoot", "Spring-boot"]` $\rightarrow$ `Spring Boot`
  * `["Postgres", "PostgreSQL", "Postgres-SQL"]` $\rightarrow$ `PostgreSQL`

### BR-CV-002: Quy tắc Tính Tổng số năm Kinh nghiệm
* Tổng số năm kinh nghiệm của ứng viên được tính bằng tổng khoảng thời gian làm việc không bị chồng lấp (Non-overlapping duration) tại các dự án/công ty trong quá khứ.
* Thời gian đang làm việc (Ví dụ: *"2023 - Present"*) được tính mốc kết thúc là thời điểm hiện tại (`current_date`).

---

## 3. QUY TẮC CHẤM ĐIỂM VÀ XẾP HẠNG (MATCHING & RANKING RULES)

### BR-MATCH-001: Thang điểm và Khoảng giá trị Match Score
* Điểm Match Score (`overall_score`) là số nguyên nằm trong khoảng từ **$0\%$ đến $100\%$**.
* Phân loại mức độ phù hợp:
  * $\ge 80\%$: **HIGH MATCH** (Rất phù hợp - Ưu tiên phỏng vấn).
  * $60\% - 79\%$: **MEDIUM MATCH** (Phù hợp trung bình - Cần xem xét thêm).
  * $< 60\%$: **LOW MATCH** (Ít phù hợp).

### BR-MATCH-002: Quy tắc Xử lý Thiếu Dữ liệu (Missing Data Handling)
* Nếu CV ứng viên không ghi rõ Học vấn: Điểm `Education Score` mặc định nhận giá trị trung bình $50\%$, không đánh rớt trực tiếp ứng viên.
* Nếu CV không ghi rõ Số năm kinh nghiệm chi tiết: AI trích xuất tổng số năm từ giai đoạn làm việc. Nếu hoàn toàn không thể tính toán, hệ thống gắn nhãn *"Kinh nghiệm chưa xác định"* và không cho điểm phần thưởng kinh nghiệm.

### BR-MATCH-003: Quy tắc Xử lý Xếp hạng Bằng điểm (Tie-Breaking Rule)
Khi hai hoặc nhiều ứng viên có cùng tổng điểm `overall_score` đến từng chữ số thập phân, thứ tự xếp hạng sẽ được phân định theo thứ tự ưu tiên sau:
1. Ứng viên có số điểm **Required Skills Score** cao hơn.
2. Ứng viên có số năm **Kinh nghiệm làm việc** thực tế nhiều hơn.
3. Ứng viên thực hiện **Nộp đơn (Apply) sớm hơn** (`applied_at ASC`).

---

## 4. QUY TẮC BẢO MẬT & TRÍCH DẪN MINH CHỨNG (EXPLANATION & EVIDENCE RULES)

### BR-EXPLAIN-001: Nguyên tắc Zero Hallucination đối với Minh chứng
* Tất cả các câu trích dẫn minh chứng (Evidence Snippets) hiển thị trong báo cáo AI Matching **BẮT BUỘC** phải là chuỗi văn bản nguyên bản (Exact Substring Match) xuất hiện trong nội dung file CV của ứng viên.
* Hệ thống sẽ kiểm tra đối chiếu (String Verification Check): Nếu đoạn trích dẫn do LLM trả về không tìm thấy trong văn bản CV thô, minh chứng đó sẽ bị loại bỏ khỏi giao diện hiển thị.

### BR-EXPLAIN-002: Quy tắc Chạy lại AI Matching (Rematching Trigger)
Hệ thống chỉ chạy lại quy trình AI Matching cho một công việc khi:
1. HR thực hiện chỉnh sửa các yêu cầu bắt buộc (Required Skills hoặc Min Years of Experience) trong JD của bài đăng và bấm nút *"Chạy lại AI Matching"*.
2. Candidate tải lên bản CV mới cập nhật và nộp lại cho công việc.
