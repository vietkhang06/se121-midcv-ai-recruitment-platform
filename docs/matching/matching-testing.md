# MATCHING ENGINE TEST STRATEGY SPECIFICATION (PHASE 4 CORRECTION BASELINE)

Tài liệu này đặc tả Chiến lược Kiểm thử Bộ máy Đối sánh và Danh mục 10 Golden Test Cases (Case A - J).

---

## DANH MỤC 10 GOLDEN TEST CASES (CASES A - J)

1. **CASE A (Strong Technical Match):** JD Backend Java + CV Java 3 năm + GitHub Java active $\rightarrow$ Output: $S_{\text{core}}$ cao, $S_{\text{github}}$ cao, $S_{\text{overall}}$ theo công thức 85/15.
2. **CASE B (GitHub Unavailable Fallback):** Cùng CV + Không có GitHub $\rightarrow$ Output: Fallback $S_{\text{overall}} = S_{\text{core}}$.
3. **CASE C (Non-Technical Job Fallback):** JD Marketing + Cùng GitHub $\rightarrow$ Output: Khóa điểm GitHub, Fallback $S_{\text{overall}} = S_{\text{core}}$.
4. **CASE D (Strict Tech Separation):** JD Java + CV JavaScript only $\rightarrow$ Output: Required skill score = 0pt (Phân biệt gắt gao).
5. **CASE E (Missing Optional Evidence):** JD AWS + CV không có AWS $\rightarrow$ Thiếu minh chứng nhưng không tự động rớt trực tiếp.
6. **CASE F (All Required + All Preferred):** Ứng viên có đủ tất cả kỹ năng bắt buộc và ưu tiên $\rightarrow$ SkillScore tối đa 100pt.
7. **CASE G (All Required + No Preferred):** Ứng viên có đủ kỹ năng bắt buộc nhưng không có kỹ năng ưu tiên $\rightarrow$ Vẫn đạt điểm mạnh (SkillScore = 80pt).
8. **CASE H (Irrelevant Experience):** 5 năm Marketing nộp cho JD 2 năm Java Dev $\rightarrow$ Điểm Relevant Experience = 0pt.
9. **CASE I (Relevant Experience):** 2 năm Java backend nộp cho JD 2 năm Java Dev $\rightarrow$ Điểm Relevant Experience = 100pt.
10. **CASE J (Semantic Similarity Validation):** "Spring Boot backend" vs "Java Spring Boot API" $\rightarrow$ Cosine similarity cao; "Spring Boot" vs "React UI" $\rightarrow$ Cosine similarity thấp hơn.
