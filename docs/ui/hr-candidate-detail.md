# CANDIDATE MATCH INSPECTION SPECIFICATION (PHASE 6 BASELINE)

Tài liệu này đặc tả Trang Đánh giá Chi tiết Đối sánh Ứng viên dành cho HR (`/recruiter/applications/[id]`).

---

## 11 MỤC ĐÁNH GIÁ CHÍNH TRÊN TRANG INSPECTION (11 INSPECTION SECTIONS)

1. **Candidate Summary:** Tóm tắt thông tin ứng viên, chức danh, kinh nghiệm phù hợp, ngày nộp đơn.
2. **Match Summary & Score Breakdown:** Thẻ hiển thị 3 tầng điểm số: Overall Match ($S_{\text{overall}}$), Core Score ($S_{\text{core}}$ - 85%), GitHub Supporting Score ($S_{\text{github}}$ - 15% khi kích hoạt).
3. **Required Skill Status:** Đánh giá các kỹ năng Bắt buộc (`MATCH`, `PARTIAL`, `MISSING`). Kỹ năng Bắt buộc còn thiếu được hiển thị nổi bật màu **Đỏ/Rose**.
4. **Preferred Skill Status:** Đánh giá các kỹ năng Ưu tiên (`MATCH`, `MISSING`). Kỹ năng Ưu tiên còn thiếu được hiển thị **trung tính trong slate, tuyệt đối không phạt coi là thất bại nghiêm trọng**.
5. **Experience Breakdown:** Đánh giá số năm kinh nghiệm thực tế liên quan trực tiếp.
6. **Education Breakdown:** Đánh giá trình độ học vấn và bằng cấp đúng chuyên ngành.
7. **Project Breakdown:** Đánh giá các dự án thực tế và sản phẩm nổi bật.
8. **Snapshot CV Inspection:** Xem lại bản ghi snapshot nguyên phong của CV tại thời điểm nộp đơn, không bị ảnh hưởng khi ứng viên chỉnh sửa CV trong thư viện sau đó.
9. **Match Factors Breakdown:** Chi tiết các thành phần trọng số (Skill, Experience, Education, Project, Semantic, GitHub).
10. **Traceable Evidence & Human-Readable Explanation:** Danh sách minh chứng đối soát từ nội dung CV và đoạn văn giải thích lý do chấm điểm bằng ngôn ngữ tự nhiên.
11. **Neutral GitHub Assessment:** Đánh giá minh chứng mã nguồn công khai (xem chi tiết tại `hr-github-assessment.md`).
