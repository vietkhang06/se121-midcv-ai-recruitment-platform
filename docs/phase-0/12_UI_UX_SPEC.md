# 12. THIẾT KẾ GIAO DIỆN VÀ TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX SPECIFICATION)

Tài liệu này đặc tả chi tiết thiết kế cho **15 Màn hình Giao diện** thuộc phạm vi sản phẩm, tuân thủ nguyên tắc hiện đại, trực quan, card-based layout và làm nổi bật các chỉ số AI Matching.

---

## 1. NGUYÊN TẮC THIẾT KẾ & BỘ DESIGN TOKENS (DESIGN SYSTEM)

* **Phong cách tổng thể:** Modern Tech Recruitment, Clean, Card-based Layout, High Information Density nhưng thoáng mắt.
* **Màu sắc chủ đạo (Color Palette):**
  * **Primary Brand Accent:** Emerald Green `#059669` / Deep Teal `#0F766E` (Tạo cảm giác tin cậy, tươi mới).
  * **Dark Neutral (Text/Bg Dark):** Slate 900 `#0F172A`, Slate 800 `#1E293B`.
  * **Light Neutral (Bg Light):** Slate 50 `#F8FAFC`, Pure White `#FFFFFF`.
  * **Match Score Color Codes:**
    * **High Match ($\ge 80\%$):** Emerald Green `#10B981` (Badge mền, icon check xanh).
    * **Medium Match ($60\% - 79\%$):** Amber Gold `#F59E0B` (Badge cam vàng).
    * **Low Match ($< 60\%$):** Rose Red `#EF4444` (Badge đỏ nhẹ).
* **Typography:** Inter / Outfit (Google Fonts), phân cấp H1 (32px), H2 (24px), H3 (18px), Body (14px), Small Caption (12px).
* **Dynamic States Standard:**
  * **Loading State:** Skeleton Shimmer Animation cho các card/bảng.
  * **Empty State:** Hình minh họa vector đơn giản + Thông điệp hướng dẫn rõ ràng.
  * **Error State:** Banner thông báo lỗi màu đỏ champagne + Nút "Thử lại" (Retry).

---

## 2. CHI TIẾT ĐẶC TẢ 15 MÀN HÌNH (SCREEN-BY-SCREEN SPECIFICATIONS)

### MÀN HÌNH DÀNH CHO CANDIDATE & PUBLIC (01 - 08)

#### 01. Landing Page (Trang chủ Nền tảng)
* **Thành phần UI:** Hero Banner giới thiệu "Tìm việc làm bằng công nghệ AI Matching chuẩn xác", Khung Search lớn (Job Title, Location), Section Hot Jobs, Section Công ty hàng đầu, Footer.
* **CTA:** "Tìm việc ngay", "Tải CV lên", "Đăng tuyển dụng (Dành cho HR)".

#### 02. Search Result (Màn hình Kết quả Tìm kiếm việc làm)
* **Layout:** 2 cột (Cột trái: Bộ lọc Filter - Mức lương, Địa điểm, Cấp bậc, Kỹ năng; Cột phải: Danh sách Job Cards).
* **Job Card Component:** Logo công ty, Job Title (H2), Tên công ty, Tag Kỹ năng required, Mức lương, Button "Xem chi tiết".

#### 03. Job Detail Page (Xem Chi tiết Bài tuyển dụng)
* **Thành phần UI:** Header bài đăng, Badge Cấp bậc, Danh sách Required Skills (Chủ đạo), Preferred Skills, Số năm kinh nghiệm yêu cầu, Mô tả chi tiết, Nút cố định (Sticky) **"Ứng tuyển ngay" (Apply Now)**.

#### 04. Login Screen (Đăng nhập)
* **Thành phần UI:** Form gồm Email, Mật khẩu, Checkbox "Ghi nhớ đăng nhập", Nút "Đăng nhập", Link chuyển hướng Đăng ký.

#### 05. Register Screen (Đăng ký)
* **Thành phần UI:** Tab switch giữa "Tài khoản Ứng viên" và "Tài khoản Nhà tuyển dụng", Form Email, Mật khẩu, Xác nhận Mật khẩu, Họ tên.

#### 06. Candidate Profile Page (Hồ sơ Cá nhân Ứng viên)
* **Thành phần UI:** Avatar, Họ tên, Headline, Thông tin liên hệ, Section tóm tắt kỹ năng cá nhân, Kinh nghiệm cá nhân.

#### 07. CV Upload & Management Screen (Quản lý CV)
* **Thành phần UI:** Vùng Kéo-Thả Upload File (Drag & Drop Zone hỗ trợ PDF/DOCX $\le 10\text{MB}$), Danh sách các bản CV đã tải lên, Badge trạng thái "Đã phân tích AI", Nút xem trước file.

#### 08. Application History Screen (Lịch sử Ứng tuyển)
* **Thành phần UI:** Bảng danh sách các công việc đã nộp đơn, Ngày nộp, Tên CV đã dùng, Badge trạng thái ứng tuyển (`SUBMITTED`, `REVIEWED`, `MATCHED`).

---

### MÀN HÌNH DÀNH CHO HR / RECRUITER (09 - 15)

#### 09. HR Dashboard (Dashboard Nhà tuyển dụng)
* **Thành phần UI:** Stat Cards (Tổng số Job đang mở, Tổng ứng viên đã nộp, Tổng số lượt AI Matching hoàn tất), Bảng các công việc mới tạo, Biểu đồ phân bổ Match Score.

#### 10. Job Management Screen (Quản lý Danh sách Tin tuyển dụng)
* **Thành phần UI:** Bảng danh sách Jobs, Trạng thái (`DRAFT`, `PUBLISHED`, `CLOSED`), Số lượng đơn ứng tuyển, Ngày tạo, Nút thao tác (Sửa, Xem ứng viên, Đóng bài).

#### 11. Create/Edit Job Screen (Tạo / Chỉnh sửa Tin tuyển dụng)
* **Thành phần UI:**
  * Toggle Chế độ: **"Nhập thủ công"** vs **"Phân tích JD bằng AI"**.
  * Input Form: Job Title, Seniority, Salary Range, Multi-select Required Skills, Multi-select Preferred Skills, Min Experience Years, Education Requirement, Full Text Description.

#### 12. Candidate Applications Screen (Danh sách Ứng viên nộp đơn)
* **Thành phần UI:** Danh sách tổng hợp tất cả ứng viên đã nộp cho bài tuyển dụng, bộ lọc theo ngày nộp và tên ứng viên.

#### 13. Candidate Ranking Screen (Bảng Xếp hạng Ứng viên AI Matching - CORE UI)
* **Layout:** Top Toolbar (Bộ lọc Match Score Threshold slider $0-100\%$, Multi-select Skill Filter), Main Ranking Table.
* **Ranking Card Component:**
  * **Badge Rank:** #1, #2, #3 (Highlight vương miện/badge đặc biệt cho Top 3).
  * **Candidate Info:** Avatar, Họ tên, Headline.
  * **Match Score Badge:** Vòng tròn tiến trình màu sắc rực rỡ hiển thị % Match Score (VD: `88%`).
  * **Quick Skill Chips:** Chips kỹ năng trùng (Màu xanh), Chips kỹ năng thiếu (Màu đỏ mờ).
  * **Action Button:** "Xem minh chứng AI Explanation" (Primary CTA).

#### 14. Candidate Detail Screen (Chi tiết Hồ sơ Ứng viên & File CV)
* **Layout:** Split view 2 cột (Cột trái: Trình xem file CV PDF tích hợp; Cột phải: Thông tin profile trích xuất và nút kích hoạt AI report).

#### 15. AI Explanation Modal / View (Báo cáo Minh chứng AI Matching - CORE UI)
* **Thành phần UI:**
  * **Header:** Họ tên ứng viên $\leftrightarrow$ Job Title, Score tổng quan `91%` (HIGH MATCH).
  * **Section 1: Skill Match Matrix:**
    * $\checkmark$ **Matching Skills:** `Java`, `Spring Boot`, `PostgreSQL`, `REST API` (Hiển thị thẻ xanh kèm dấu check).
    * $\times$ **Missing Required Skills:** `AWS` (Hiển thị thẻ đỏ mờ).
    * $\Delta$ **Partial / Preferred Skills:** `Docker` (Hiển thị thẻ vàng).
  * **Section 2: Experience & Education Comparison:**
    * Yêu cầu JD: 2 năm kinh nghiệm $\leftrightarrow$ Thực tế CV: 3 năm (Badge `ĐẠT`).
  * **Section 3: Evidence Snippets (Minh chứng Trích xuất nguyên văn):**
    * Blockquote 1: *"Đã phát triển hệ thống backend xử lý 10,000 req/s bằng Java Spring Boot..."* (Trích từ trang 1 CV).
    * Blockquote 2: *"Tối ưu hóa cơ sở dữ liệu PostgreSQL giúp giảm 40% thời gian truy vấn..."* (Trích từ trang 2 CV).
  * **Section 4: Executive AI Summary:** Đoạn văn 3 câu nhận xét đánh giá tổng thể của AI.
