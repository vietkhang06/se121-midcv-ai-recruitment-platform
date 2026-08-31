# STRUCTURED MATCHING SPECIFICATION (PHASE 4 FINAL CORRECTION BASELINE)

Tài liệu này đặc tả Thuật toán Đối sánh Cấu trúc (Structured Matching), Cổng kiểm soát Required Skill Gate và Ngữ nghĩa tách biệt giữa Kỹ năng Bắt buộc và Kỹ năng Ưu tiên.

---

## 1. TUYÊN BỐ QUY TẮC NGUYÊN TẮC THẮT CHẶT (CORE PRODUCT SEMANTIC RULE)

> **"Preferred skills can improve the numerical score, but cannot satisfy or override missing required skills."**
>
> *(Kỹ năng ưu tiên có thể làm tăng điểm số kỹ số, nhưng tuyệt đối không thể biến một kỹ năng bắt buộc bị thiếu thành MATCH hay làm lu mờ việc thiếu kỹ năng bắt buộc).*

---

## 2. CỔNG KIỂM SOÁT KỸ NĂNG BẮT BUỘC (REQUIRED SKILL GATE)

Mọi kết quả `MatchResult` phải ghi nhận công khai các chỉ số đếm độc lập:
* `required_skills_total`: Tổng số kỹ năng bắt buộc.
* `required_skills_matched`: Số kỹ năng bắt buộc khớp.
* `required_skills_missing`: Số kỹ năng bắt buộc bị thiếu.
* `preferred_skills_total`: Tổng số kỹ năng ưu tiên.
* `preferred_skills_matched`: Số kỹ năng ưu tiên khớp.
* `preferred_skills_missing`: Số kỹ năng ưu tiên bị thiếu.

---

## 3. MÔ HÌNH THÀNH PHẦN SKILL SCORE & CORE SCORE ($S_{\text{core}}$)

### A. Công thức Tách biệt Kỹ năng Bắt buộc & Ưu tiên (SkillScore Formula)
$$\text{SkillScore} = 0.80 \cdot \text{RequiredSkillScore} + 0.20 \cdot \text{PreferredSkillScore}$$
* **RequiredSkillScore (80%):** Kỹ năng bắt buộc chiếm vai trò chi phối.
* **PreferredSkillScore (20%):** Kỹ năng ưu tiên đóng góp điểm cộng tối đa 20%. Thiếu kỹ năng ưu tiên **tuyệt đối không làm rớt ứng viên**.

### B. Công thức Core Score chính thức ($S_{\text{core}}$)
$$S_{\text{core}} = 0.40 \cdot \text{SkillScore} + 0.25 \cdot \text{RelevantExp} + 0.10 \cdot \text{Edu} + 0.10 \cdot \text{Proj} + 0.15 \cdot \text{Semantic}$$

---

## 4. AN TOÀN XẾP HẠNG (RANKING SAFETY)

Bảo đảm 100% ứng viên **Candidate A** (đạt 100% Kỹ năng Bắt buộc, 0% Kỹ năng Ưu tiên) luôn xếp trên **Candidate B** (thiếu 1 Kỹ năng Bắt buộc, đạt 100% Kỹ năng Ưu tiên) thông qua việc ưu tiên tiêu chí `requiredSkillsMissing ASC` ở bước xếp hạng đầu tiên.
