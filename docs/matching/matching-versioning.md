# MATCHING ALGORITHM VERSIONING SPECIFICATION

Tài liệu này đặc tả Quản lý Phiên bản Thuật toán Đối sánh (Matching Versioning Strategy).

---

## MÔ HÌNH PHIÊN BẢN (ALGORITHM VERSIONING)

* Cột `match_results.matching_algorithm_version` lưu trữ phiên bản thuật toán đối sánh tại thời điểm tính toán (e.g. `v1.0`).
* Khi thay đổi công thức tính điểm hay trọng số trong tương lai, kết quả tính toán cũ vẫn có thể được tái sản xuất nguyên phong.
