# GITHUB SUPPORTING SCORING SPECIFICATION

Tài liệu này đặc tả Thuật toán Tính điểm Tín hiệu Hỗ trợ thứ hai từ GitHub ($S_{\text{github}}$).

---

## 1. CÔNG THỨC CHẤM ĐIỂM GITHUB ($S_{\text{github}}$)

$$S_{\text{github}} = 0.40 \cdot \text{Language} + 0.35 \cdot \text{Tech} + 0.15 \cdot \text{Activity} + 0.10 \cdot \text{Recency}$$

* **Language Match (40%):** Đối sánh vị trí xếp hạng ngôn ngữ repo (`Repository language distribution`).
* **Technology Evidence (35%):** Minh chứng công nghệ từ repo topics và mô tả.
* **Activity Signal (15%):** `HIGH` (100pt), `MODERATE` (85pt), `LOW` (60pt), `LIMITED` (40pt).
* **Recency (10%):** Mốc thời gian quan sát công khai gần nhất.

---

## 2. QUY TẮC FALLBACK VÀ THẮT CHẶT NGÀNH NGHỀ

* Công việc phi kỹ thuật (Marketing, Finance, Design): Khóa tín hiệu GitHub, áp dụng $S_{\text{overall}} = S_{\text{core}}$.
* Không có GitHub hoặc API lỗi: Áp dụng $S_{\text{overall}} = S_{\text{core}}$ mà không phạt trừ điểm ứng viên.
