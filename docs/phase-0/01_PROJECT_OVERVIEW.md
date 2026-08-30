# 01. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

## 1. TÊN ĐỀ TÀI & THÔNG TIN DỰ ÁN
* **Tên chính thức:** Nền tảng tuyển dụng hỗ trợ đối sánh Job Description (JD) và Hồ sơ ứng viên (CV) bằng Vector Embedding và Large Language Model (LLM).
* **Mã dự án:** AI-RECRUIT-PLATFORM
* **Phiên bản tài liệu:** 1.0.0 (Phase 0 Baseline)
* **Ngày phát hành:** 30/08/2026

## 2. BỐI CẢNH & ĐỘNG LỰC PHÁT TRIỂN
Trong thị trường tuyển dụng hiện đại, số lượng ứng viên nộp hồ sơ cho mỗi vị trí tuyển dụng (đặc biệt trong ngành Công nghệ Thông tin) thường rất lớn, gây ra áp lực quá tải cho bộ phận Tuyển dụng (HR/Recruiter). Phương pháp sàng lọc CV truyền thống gặp phải các hạn chế nghiêm trọng:
1. **Sàng lọc thủ công tốn thời gian:** HR mất từ 3–5 phút cho mỗi CV để đối chiếu với JD, dẫn đến thời gian tuyển dụng (Time-to-Hire) kéo dài.
2. **Khớp từ khóa đơn thuần (Keyword Matching) thiếu hiệu quả:** Các hệ thống ATS cổ điển chỉ lọc dựa trên từ khóa chính xác (Exact Match), dễ bỏ sót những ứng viên tiềm năng dùng từ đồng nghĩa hoặc mô tả kỹ năng theo cách khác.
3. **Thiếu giải thích minh bạch:** HR khó đánh giá nhanh vì sao một ứng viên được xếp hạng cao hay thấp nếu không đọc toàn bộ hồ sơ.

Sự phát triển của công nghệ **Vector Embedding** và **Large Language Model (LLM)** mở ra khả năng hiểu ngữ nghĩa (Semantic Understanding) sâu sắc của cả văn bản JD lẫn CV, từ đó tính toán độ phù hợp (Match Score), tự động xếp hạng (Ranking) và đưa ra giải thích dựa trên minh chứng thực tế trong CV (Evidence-based Explanation).

## 3. TẦM NHÌN & SỨ MỆNH SẢN PHẨM
* **Tầm nhìn (Vision):** Trở thành giải pháp tuyển dụng thông minh hàng đầu, biến quá trình sàng lọc hồ sơ từ thủ công thành trải nghiệm đối sánh ngữ nghĩa chuẩn xác, minh bạch và tối ưu hóa năng suất HR.
* **Sứ mệnh (Mission):** 
  * Cung cấp cho **Candidate** công cụ tìm kiếm việc làm minh bạch, ứng tuyển dễ dàng và nhận phản hồi công bằng dựa trên năng lực thực sự.
  * Cung cấp cho **HR** một trợ lý AI phân tích JD–CV chuyên sâu, tự động trích xuất thông tin, chấm điểm đa chiều và đưa ra minh chứng rõ ràng giúp ra quyết định tuyển dụng nhanh chóng và chính xác.

## 4. CÁC THÀNH PHẦN THAM GIA CHÍNH (STAKEHOLDERS)
| Stakeholder | Vai trò & Trách nhiệm chính |
| :--- | :--- |
| **Candidate (Ứng viên)** | Người dùng tìm kiếm công việc, tạo hồ sơ, tải lên CV (PDF/DOCX), theo dõi trạng thái ứng tuyển. |
| **HR / Recruiter (Nhà tuyển dụng)** | Người dùng tạo công ty, đăng tuyển Job, nhập JD, quản lý ứng viên, chạy AI Matching, xem xếp hạng và giải thích minh chứng. |
| **System Administrator (Quản trị viên)** | Quản lý người dùng, giám sát hiệu năng hệ thống, theo dõi hạn ngạch gọi API LLM/Embedding. |
| **AI Matching Engine (Hệ thống AI)** | Mô-đun tự động trích xuất thực thể, tính toán Vector Embedding, chạy scoring hybrid và sinh giải thích minh chứng. |

## 5. TÓM TẮT PHẠM VI MVP (EXECUTIVE SUMMARY)
Hệ thống tuyển dụng tập trung hoàn toàn vào luồng cốt lõi từ **JD + CV $\rightarrow$ Matching $\rightarrow$ Score $\rightarrow$ Ranking $\rightarrow$ Explanation**.
* **Đầu vào:** Nhà tuyển dụng nhập JD (text/form); Ứng viên tải CV (PDF/DOCX).
* **Xử lý:** Trích xuất văn bản (Text Extraction), Chuẩn hóa dữ liệu (Normalization), Tạo Vector Embedding (Pgvector), Tính toán điểm tương đồng đa tiêu chí (Skill, Experience, Education, Semantic).
* **Đầu ra:** Dashboard hiển thị danh sách ứng viên xếp hạng theo Match Score (0–100%), bảng phân tích kỹ năng (Matching vs Missing Skills) và câu giải thích kèm trích dẫn minh chứng trực tiếp từ CV.
