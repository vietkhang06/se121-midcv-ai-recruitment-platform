# OVERALL MATCH SCORE FORMULA SPECIFICATION

Tài liệu này đặc tả Mô hình Điểm Đối sánh Tổng thể (Overall Match Score $S_{\text{overall}}$).

---

## CÔNG THỨC CHÍNH THỨC ($S_{\text{overall}}$)

1. **Công việc Kỹ thuật + GitHub Hợp lệ:**
   $$S_{\text{overall}} = 0.85 \cdot S_{\text{core}} + 0.15 \cdot S_{\text{github}}$$
2. **Công việc Không phải Kỹ thuật / GitHub Không khả dụng:**
   $$S_{\text{overall}} = S_{\text{core}}$$

Tất cả các điểm số thành phần được làm tròn chính xác 2 chữ số thập phân (`RoundingMode.HALF_UP`).
