# CV PARSING & SECTION DETECTION SPECIFICATION

Tài liệu này đặc tả Quy trình Đọc và Nhận diện Phân đoạn Hồ sơ Ứng viên (CV PDF/DOCX Parsing & Section Detection).

---

## 1. NHẬN DIỆN PHÂN ĐOẠN CHUẨN (CANONICAL SECTION DETECTION)

AI Worker tự động phân loại các tiêu đề tiêu chuẩn trong CV về 7+ nhóm phân đoạn canonical:
1. `PERSONAL_INFORMATION`: Họ tên, Email, SĐT, Địa chỉ, Tuổi.
2. `SUMMARY / OBJECTIVE`: Tóm tắt mục tiêu nghề nghiệp, giới thiệu bản thân.
3. `SKILLS`: Danh sách ngôn ngữ lập trình, công cụ, framework.
4. `EXPERIENCE`: Lịch sử làm việc, công ty, vị trí, khoảng thời gian.
5. `EDUCATION`: Bằng cấp, trường học, chuyên ngành.
6. `PROJECTS`: Các dự án cá nhân/thực tế, mô tả, tech stack.
7. `LANGUAGES`: Ngôn ngữ giao tiếp và mức độ thành thạo.

---

## 2. LIÊN KẾT PHIÊN BẢN (CV VERSION AWARENESS & EVIDENCE)

Trích xuất dữ liệu CV được gắn chặt với `cv_version_id` cụ thể. Mọi trích dẫn minh chứng (`CVEvidence`) đều lưu rõ `field_name`, `section`, `snippet` nguyên bản và `normalized_value` giúp truy vết minh bạch.
