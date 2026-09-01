# AI CANDIDATE RANKING SPECIFICATION (PHASE 6 BASELINE)

Tài liệu này đặc tả Giao diện Bảng Xếp Hạng Ứng Viên Chuẩn AI (`/recruiter/jobs/[id]/ranking`).

---

## 1. NGUYÊN TẮC QUY TRÌNH XẾP HẠNG (BACKEND SOURCED RANKING RULES)

* **Tiêu thụ Dữ liệu Trực tiếp từ Backend:** Giao diện không tự sắp xếp hay tự tính toán điểm số, mà tiêu thụ trực tiếp kết quả từ API `CandidateRankingService` Phase 4.
* **Quy tắc Ranking Safety:** Thứ tự sắp xếp bảo đảm:
  1. Số lượng kỹ năng Bắt buộc còn thiếu (`requiredSkillsMissing` ASC) được ưu tiên lên trước hàng đầu.
  2. Điểm Tổng thể ($S_{\text{overall}}$ DESC).
  3. Điểm Core JD-CV ($S_{\text{core}}$ DESC).
  4. Điểm Kỹ năng Bắt buộc (Required Skill Score DESC).
  5. Điểm Kinh nghiệm Phù hợp (Relevant Experience Score DESC).
  6. Thứ tự ID UUID Ứng viên (Candidate UUID ASC).

---

## 2. HIỂN THỊ TRÊN BẢNG XẾP HẠNG (RANKING TABLE COLUMNS)

1. **Hạng (#Rank):** Thứ hạng chính thức.
2. **Ứng viên & Chức danh:** Họ tên ứng viên, Headline kinh nghiệm.
3. **Overall Match ($S_{\text{overall}}$):** Điểm đối sánh tổng thể (Khớp 85% Core + 15% GitHub khi kích hoạt).
4. **Core JD-CV Score ($S_{\text{core}}$):** Điểm đối sánh trực tiếp giữa JD và CV.
5. **GitHub Supporting Score ($S_{\text{github}}$):** Điểm tín hiệu minh chứng mã nguồn bổ trợ (Hiển thị *Not connected / Non-technical* khi không áp dụng).
6. **Kỹ năng Bắt buộc (Required Skills Status):** Hiển thị số kỹ năng khớp/thiếu. Nếu thiếu kỹ năng bắt buộc, **huy hiệu màu Đỏ/Rose sẽ làm nổi bật rõ ràng**.
7. **Kinh nghiệm Phù hợp:** Số năm kinh nghiệm làm việc liên quan trực tiếp.
8. **Thao tác:** Nút Xem Chi Tiết và Nút Chọn So Sánh Song Song.
