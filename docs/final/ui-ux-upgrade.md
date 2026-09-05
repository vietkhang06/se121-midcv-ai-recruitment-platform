# Báo Cáo Thiết Kế Giao Diện & Nâng Cấp Trải Nghiệm Người Dùng (UI/UX Upgrade Report)

**Dự án:** Nền tảng tuyển dụng AI hỗ trợ đối sánh JD và hồ sơ ứng viên bằng Vector Embedding và LLM  
**Giai đoạn:** Post-Implementation Stabilization & Product Polish  
**Trạng thái:** HOÀN TẤT (COMPLETED)  
**Ngày thực hiện:** 03/09/2026  

---

## 1. Mục Tiêu & Triết Lý Thiết Kế (Design Philosophy)

Mục tiêu cốt lõi của đợt nâng cấp UI/UX là loại bỏ hoàn toàn cảm giác "AI SaaS đại trà" (generic SaaS clichés: dải gradient tím neon chói lóa, khối hình cầu AI phát sáng vô nghĩa, robot 3D stock, linh vật sáo rỗng). Thay vào đó, nền tảng được định hình là một **Hệ Thống Tuyển Dụng & Đối Sánh Nhân Sự Nghiêm Túc, Đáng Tin Cậy và Chuẩn Mực Doanh Nghiệp (Enterprise-Grade & Human-Centric)**.

### Bộ Tiêu Chuẩn Visual & Interaction:
1. **Typography & Màu Sắc:**
   - **Màu nền:** Slate 950 (`#020617`) và Slate 900 (`#0f172a`) với viền Slate 800 (`#1e293b`).
   - **Bảng màu định danh chức năng (Semantic Palette):**
     - Indigo / Blue (`#6366f1` / `#4f46e5`): Hành động chính, điều hướng hệ thống.
     - Cyan / Teal (`#06b6d4` / `#0891b2`): Kỹ thuật, Vector AI, minh chứng dữ liệu, độ tương đồng ngữ nghĩa.
     - Emerald Green (`#10b981` / `#059669`): Xác minh thành công, điểm đối sánh cao (≥ 85%), trạng thái bảo mật.
     - Amber / Gold (`#f59e0b` / `#d97706`): Quyền hạn Doanh nghiệp, Cảnh báo mức độ trung bình, Top 1 Ứng viên xuất sắc nhất.
     - Rose / Red (`#f43f5e` / `#e11d48`): Kỹ năng bắt buộc bị thiếu (Gated warning), lỗi ràng buộc.
2. **Loại Bỏ Biểu Đồ Tròn Khổng Lồ:** Thay thế các biểu đồ Donut/Circle cồng kềnh bằng **Linear Progress Bars** và **Compact Score Blocks** đa tầng, kết hợp mã màu trực quan để HR dễ dàng quét bảng điểm trong 3 giây.
3. **Typography Rõ Ràng:** Phông chữ hệ thống hiện đại, tối ưu hóa kích thước chữ cho văn bản kỹ thuật và dữ liệu bảng xếp hạng.

---

## 2. Thư Viện Đồ Họa Vector Độc Quyền (Bespoke Custom Vector Library)

Thay vì sử dụng ảnh stock hoặc icon mờ nhạt, toàn bộ hệ thống đã được trang bị thư viện 9 thành phần vector SVG độc quyền tại [`frontend/src/components/illustrations/Illustrations.tsx`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/frontend/src/components/illustrations/Illustrations.tsx):

| Tên Vector SVG | Vị trí Sử dụng | Mục đích & Nội dung Thể hiện |
| :--- | :--- | :--- |
| `HeroIllustration` | Trang chủ (`/`) | Sơ đồ kiến trúc không gian đối sánh vector 1536 chiều giữa JD và CV với điểm Cosine và minh chứng GitHub. |
| `CandidateOnboardingIllustration` | Modal chào mừng First Visit | Minh họa định hướng sự nghiệp, hồ sơ năng lực cá nhân và mục tiêu ứng tuyển. |
| `CompanyVerificationIllustration` | First Visit & Xác minh DN | Minh họa tòa nhà doanh nghiệp, huy hiệu bảo mật và giấy phép kinh doanh được chứng thực. |
| `EmptyJobsIllustration` | Danh mục việc làm (`/jobs`) | Minh họa kính lúp tìm kiếm không có kết quả với hướng dẫn đặt lại bộ lọc. |
| `EmptyCVIllustration` | Thư viện CV (`/candidate/cvs`) | Minh họa tập hồ sơ mở kèm nút kêu gọi tạo CV hoặc tải lên file PDF/DOCX. |
| `EmptyApplicationsIllustration` | Lịch sử nộp đơn (`/candidate/applications`) | Minh họa phong bì ứng tuyển chờ gửi với liên kết khám phá tin tuyển dụng. |
| `EmptyCandidatesIllustration` | Bảng xếp hạng (`/recruiter/jobs/[id]/ranking`) | Minh họa bục vinh danh ứng viên kèm nút hạ ngưỡng điểm lọc. |
| `AiProcessingIllustration` | Bộ xử lý đối sánh AI | Minh họa luồng nén embedding và trích xuất thực thể JD/CV. |
| `GitHubNeutralIllustration` | Đánh giá GitHub Inspection | Minh họa nhánh Git trung tính, không áp đặt phạt điểm cho ứng viên phi kỹ thuật. |

---

## 3. Flagship CV Builder 3-Cột (3-Column Desktop Studio Layout)

Địa chỉ trang: [`frontend/src/app/candidate/cvs/builder/page.tsx`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/frontend/src/app/candidate/cvs/builder/page.tsx)

### Cấu trúc 3 Cột:
1. **Cột 1: Sections Navigator (Điều hướng Mục nội dung):**
   - Danh sách các mục CV: Thông tin liên hệ, Tóm tắt bản thân, Kinh nghiệm làm việc, Kỹ năng chuyên môn, Học vấn & Bằng cấp, Dự án & Minh chứng.
   - Thêm mục mới, xóa mục, và chuyển đổi mục soạn thảo linh hoạt.
2. **Cột 2: Active Section Editor (Khu vực Soạn thảo Trực tiếp):**
   - Tiêu đề mục và ô nhập văn bản theo thời gian thực (real-time keystroke synchronization).
   - Tích hợp gợi ý chuẩn hóa ngành nghề mục tiêu.
3. **Cột 3: Live A4 Document Preview (Xem trước Văn bản A4 Thời gian thực):**
   - Thiết kế mô phỏng trang giấy trắng A4 chuẩn in ấn (`210mm x 297mm`) với bóng đổ chân thực.
   - Bộ điều khiển phóng to/thu nhỏ tài liệu (Zoom Controls: 75%, 100%, 125%).
   - Tích hợp tính năng in trực tiếp ra file PDF thật thông qua lệnh `@media print` của CSS browser (`window.print()`).
   - Tự động lưu vĩnh viễn vào bộ nhớ `localStorage` (`saveCandidateCV()`).

---

## 4. Trải Nghiệm Nộp Đơn 5 Bước Quick Apply (5-Step Stepper UX)

Thành phần: [`frontend/src/components/application/QuickApplyModal.tsx`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/frontend/src/components/application/QuickApplyModal.tsx)

### Quy trình 5 bước:
1. **Bước 1 — Chọn Bản CV Ứng Tuyển (Choose CV):** Lựa chọn phiên bản CV phù hợp nhất từ thư viện đa CV của ứng viên.
2. **Bước 2 — Xác Nhận Thông Tin Cá Nhân (Confirm Information):** Xem và kiểm tra Họ tên, Email, Số điện thoại, Headline.
3. **Bước 3 — Trả Lời Câu Hỏi Tuyển Dụng (Application Questions):** Phản hồi các câu hỏi đặc thù do Nhà tuyển dụng đặt ra cho vị trí JD.
4. **Bước 4 — Xem Lại Đơn Nộp (Review Application):** Kiểm tra toàn diện thông tin trước khi xác nhận gửi đơn.
5. **Bước 5 — Gửi Đơn Thành Công (Confirmation & Snapshot Frozen):**
   - Đóng băng bản sao CV thành **Immutable Snapshot** có số phiên bản (v1.0, v2.0).
   - Tự động thêm ứng viên vào Bảng Xếp Hạng Tuyển Dụng của HR theo thuật toán Ranking Safety.

---

## 5. Bảo Mật Quyền Riêng Tư Ứng Viên Trong Match Inspection

Địa chỉ trang: [`frontend/src/app/recruiter/applications/[id]/page.tsx`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/frontend/src/app/recruiter/applications/[id]/page.tsx)

- **Mặc định:** Email và Số điện thoại của ứng viên được ẩn giấu hoàn toàn (`n***@example.com`, `091***678`) nhằm chống thu thập dữ liệu trái phép (anti-scraping) và đảm bảo tính khách quan khi chấm điểm AI.
- **Nút "Mở khóa Liên hệ / Unlock Contact":** Chỉ khi HR bấm nút mở khóa để tiến hành phỏng vấn, thông tin liên lạc đầy đủ mới được hiển thị cùng huy hiệu xác nhận bảo mật.

---

## 6. Trực Quan Hóa Điểm Số (Score Visualization & Linear Bars)

Thành phần: [`CandidateRankingTable.tsx`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/frontend/src/components/recruiter/CandidateRankingTable.tsx)

- Mỗi dòng ứng viên hiển thị thanh **Linear Progress Bar**:
  - `Overall Match Score ≥ 85%`: Màu xanh ngọc Emerald rực rỡ kèm nhãn **High Match**.
  - `70% ≤ Overall Match Score < 85%`: Màu xanh Cyan / Indigo kèm nhãn **Good Match**.
  - `Overall Match Score < 70%`: Màu Slate xám trung tính.
- Huy hiệu cảnh báo màu đỏ (`Missing: X`) xuất hiện ngay bên cạnh đối với ứng viên thiếu kỹ năng bắt buộc (Required Skills Gated).
- Ứng viên Xếp hạng 1 hiển thị huy hiệu vinh danh **Top 1** màu vàng kim.
