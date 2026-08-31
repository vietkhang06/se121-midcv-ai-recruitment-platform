# SEMANTIC MATCHING SPECIFICATION (PHASE 4 CORRECTION BASELINE)

Tài liệu này đặc tả Thuật toán Đối sánh Tương đồng Ngữ nghĩa (Semantic Matching Engine) và công thức chuyển đổi Cosine Similarity.

---

## CÔNG THỨC CHUYỂN ĐỔI COSINE SIMILARITY SANG SEMANTIC SCORE

$$\text{Score}_{\text{semantic}} = \max\left(0.0, \min\left(100.0, (1.0 - \text{cosine\_distance}) \times 100.0\right)\right)$$

* **Khoảng đầu ra:** Được giới hạn tuyệt đối trong khoảng $[0.0, 100.0]$ và làm tròn 2 chữ số thập phân (`RoundingMode.HALF_UP`).
* **Vị thế:** Điểm tương đồng ngữ nghĩa bổ trợ 15% cho Core Score nhưng **không thể đè đè lên kết quả trích xuất cấu trúc** (ví dụ: `Java` vs `JavaScript` ở bộ trích xuất cấu trúc vẫn trả về 0pt cho kỹ năng Java bắt buộc).
