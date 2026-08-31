# CV LIBRARY & DUAL-PATH CV WORKFLOWS SPECIFICATION

Tài liệu me đặc tả Thư viện Multi-CV của Ứng viên (`/candidate/cvs`).

---

## 1. QUẢN LÝ THƯ VIỆN MULTI-CV (`/candidate/cvs`)

* Mỗi ứng viên có thể sở hữu nhiều bản CV cho các vị trí/ngành nghề khác nhau.
* **Các thao tác trên Thẻ CV:**
  * **Xem trước (Preview):** Xem toàn bộ nội dung cấu trúc CV.
  * **Chỉnh sửa (Edit):** Mở CV Builder để điều chỉnh phiên bản.
  * **Nhân bản (Duplicate):** Tạo bản sao CV để nộp cho vị trí mới.
  * **Xuất PDF (Export):** Xuất file PDF giữ nguyên phiên bản đã chọn.
  * **Xóa (Delete):** Xóa bản ghi CV khi được cho phép.

---

## 2. KÊNH UPLOAD CV (PDF/DOCX)

* Hỗ trợ tải lên file sẵn có PDF hoặc DOCX.
* Tự động gọi API Python AI Worker bóc tách nội dung và chuẩn hóa kỹ năng.
