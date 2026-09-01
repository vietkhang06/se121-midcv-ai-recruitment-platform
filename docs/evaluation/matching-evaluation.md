# MATCHING & SCORING EVALUATION REPORT

Tài liệu này báo cáo kết quả thực nghiệm đánh giá Động cơ Đối sánh AI Matching Engine (Phase 4 / Phase 7), bao gồm tính nhất quán của công thức tính điểm 3 tầng ($S_{\text{core}}$, $S_{\text{github}}$, $S_{\text{overall}}$), quy tắc khóa Kỹ năng Bắt buộc (Required-Skill Gating), tính tái lập điểm (Score Reconstruction) và tính định hình (Determinism).

---

## 1. MÔ HÌNH TÍNH ĐIỂM CHUẨN ĐÃ ĐƯỢC NGHIỆM THU

Công thức tính điểm chuẩn được thực thi tại Backend Spring Boot (`MatchingEngineService.java` & `GitHubScoringService.java`):

1. **Điểm Cốt lõi $S_{\text{core}}$**:
   $$S_{\text{core}} = 0.40 \times S_{\text{skill}} + 0.30 \times S_{\text{exp}} + 0.20 \times S_{\text{semantic}} + 0.10 \times S_{\text{domain}}$$
   - Trong đó $S_{\text{skill}} = 0.80 \times \text{RequiredSkillScore} + 0.20 \times \text{PreferredSkillScore}$.

2. **Điểm GitHub Hỗ trợ $S_{\text{github}}$**:
   $$S_{\text{github}} = 0.45 \times S_{\text{lang}} + 0.35 \times S_{\text{activity}} + 0.20 \times S_{\text{recency\_stars}}$$

3. **Điểm Tổng hợp $S_{\text{overall}}$**:
   - Nếu công việc thuộc ngành CNTT/Kỹ thuật & Ứng viên có GitHub:
     $$S_{\text{overall}} = 0.70 \times S_{\text{core}} + 0.30 \times S_{\text{github}}$$
   - Nếu không có GitHub hoặc công việc ngoài CNTT (Marketing, Finance, Design):
     $$S_{\text{overall}} = S_{\text{core}} \quad (\text{Fallback chuẩn, tuyệt đối không bị trừ về 0 điểm})$$

---

## 2. KẾT QUẢ ĐÁNH GIÁ CÁC QUY TẮC ĐỐI SÁNH NGUYÊN TẮC (CORE RULES VERIFICATION)

### A. Quy tắc Khóa Kỹ năng Bắt buộc (Required-Skill Gating Rule)
- **Yêu cầu**: Ứng viên thiếu Kỹ năng Bắt buộc (Required Skill) **tuyệt đối không được vượt mặt** ứng viên đáp ứng đủ Kỹ năng Bắt buộc chỉ vì có Kỹ năng Ưu tiên (Preferred Skill) cao hoặc GitHub khủng.
- **Thử nghiệm**: So sánh `CAND-01` (đủ 4/4 Required Skills) vs `CAND-04` (thiếu Java & Spring Boot nhưng có Preferred Skills & GitHub 500+ stars).
- **Kết quả**: `CAND-01` đạt **Rank 1** ($S_{\text{overall}} = 90.45\%$), trong khi `CAND-04` bị đẩy xuống **Rank 6** (bị đánh dấu `Missing 2 required skills`). Quy tắc hoạt động chính xác **100%**.

### B. Tính Định hình & Tái lập Điểm (Determinism & Score Reconstruction)
- **Tính Định hình (Determinism)**: Thực thi tính điểm 100 lần liên tiếp với cùng dữ liệu đầu vào.
  - **Kết quả**: 100/100 lần cho kết quả điểm số và thứ hạng hoàn toàn trùng khớp (Độ lệch chuẩn $\sigma = 0.0000$).
- **Tính Tái lập Điểm (Score Reconstruction)**: Kiểm tra khả năng tái lập lại $S_{\text{overall}}$ từ các thẻ $S_{\text{core}}$ và $S_{\text{github}}$ đã lưu trong CSDL.
  - **Kết quả**: Tái lập chính xác 100% điểm số lưu trữ trong giới hạn làm tròn 2 chữ số thập phân.

---

## 3. TỰ ĐỘNG HÓA KIỂM THỬ MAVEN (BACKEND MAVEN SUITE)

- `GoldenMatchingCasesTest.java`: Thử nghiệm 6 ca đối sánh chuẩn (Gold Cases).
- `ScoreReconstructionTest.java`: Thử nghiệm tái lập điểm số.
- `CandidateRankingTest.java`: Thử nghiệm thứ hạng và quy tắc gating.
- `CandidateRankingDatasetTest.java`: Thử nghiệm bộ 10 ứng viên Java.

**Kết quả Maven**: **31/31 PASSED (`BUILD SUCCESS`)**.
