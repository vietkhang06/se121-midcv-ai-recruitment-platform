# HR EXPERIENCE FRONTEND SPECIFICATION (PHASE 6 BASELINE)

Tài liệu này đặc tả Kiến trúc Trải nghiệm Giao diện dành cho Nhà tuyển dụng (HR Recruiter Portal UI System).

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC THIẾT KẾ HR PORTAL

* **Tối ưu hóa Quyết định Tuyển dụng:** Giúp Nhà tuyển dụng dễ dàng đánh giá ứng viên, kiểm tra bằng chứng minh chứng và bảng xếp hạng AI mà không cần hiểu độ phức tạp kỹ thuật bên dưới.
* **Tiêu thụ Trực tiếp Backend AI Engine (Consuming Approved Phase 4 Engine):** Giao diện tuyệt đối **không tự tính điểm số hay tự sắp xếp hạng**, mà tiêu thụ 100% dữ liệu đối sánh `MatchResult`, `MatchFactor`, `Evidence` và `GitHubAssessment` từ API Spring Boot Phase 4.
* **Bảo mật & Phân quyền Doanh nghiệp (Company Security & Isolation):** Recruiter của Công ty A tuyệt đối không được truy cập bài tuyển dụng, đơn ứng tuyển hay bảng xếp hạng của Công ty B (HTTP 403 Forbidden).

---

## 2. DANH MỤC CÁC PHÂN HỆ VÀ TUYẾN ĐƯỜNG ROUTING HR

1. **HR Dashboard (`/recruiter`):** Tổng quan bài tuyển dụng active, bài nháp draft, tin đã xuất bản published và tổng số đơn ứng tuyển.
2. **Company Verification & Profile (`/recruiter/company`):** Quản lý hồ sơ công ty và kiểm soát trạng thái xác minh (`PENDING`, `VERIFIED`, `REJECTED`).
3. **Job Management (`/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/[id]`):** Tạo và quản lý tin tuyển dụng với cổng kiểm soát xác thực (Company Verification Gate).
4. **Application List (`/recruiter/jobs/[id]/applications`):** Xem danh sách đơn ứng tuyển và bản ghi snapshot CV đã nộp.
5. **Candidate Ranking (`/recruiter/jobs/[id]/ranking`):** Bảng xếp hạng ứng viên AI dựa trên quy tắc Phase 4 Ranking Safety.
6. **Candidate Inspection & Match Analysis (`/recruiter/applications/[id]`):** Đánh giá chi tiết 11 mục đối sánh ứng viên, điểm số 3 tầng, kỹ năng Bắt buộc vs Ưu tiên, minh chứng và đánh giá GitHub trung tính.
