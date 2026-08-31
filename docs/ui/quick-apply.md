# JD-AWARE QUICK APPLY SPECIFICATION (PHASE 5 CORRECTION BASELINE)

Tài liệu này đặc tả Luồng Nộp đơn Nhanh thông minh theo Yêu cầu JD (JD-Aware Quick Apply Workflow).

---

## QUY TRÌNH NỘP ĐƠN NHANH THEO YÊU CẦU JD (JD-AWARE QUICK APPLY FLOW)

1. **Kích hoạt từ Chi tiết Việc làm:** Ứng viên bấm `[ Nộp đơn ứng tuyển ngay ]` tại trang công khai `/jobs/[id]`.
2. **Kiểm tra Xác thực:** Nếu chưa đăng nhập $\rightarrow$ Hiển thị Modal Auth Gate.
3. **Tải Yêu cầu Nộp đơn của JD (JD Application Requirements):**
   * Mức lương mong muốn ($/tháng).
   * Thời gian báo nghỉ (Notice Period: 0, 15, 30 ngày).
   * Đường dẫn Minh chứng (GitHub / Portfolio URL).
   * Câu hỏi nộp đơn cụ thể theo JD (ví dụ: *"Số năm kinh nghiệm Java của bạn?"*).
4. **Prefill Thông tin & Kiểm tra Trường Bắt buộc:** Tự động điền dữ liệu từ Hồ sơ Ứng viên và CV đã chọn. Làm nổi bật các trường bắt buộc chưa điền.
5. **Chọn CV & Bảo tồn Snapshot:** Chọn 1 bản CV cụ thể từ thư viện. Lưu giữ cố định phiên bản snapshot (`appliedCvId` & `appliedCvVersion`).
6. **Khống chế Nộp Trùng lặp (Duplicate Submission Prevention):** Vô hiệu hóa nút bấm Submit khi yêu cầu đang thực thi.
