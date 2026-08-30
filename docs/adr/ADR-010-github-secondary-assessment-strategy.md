# ADR-010: CHIẾN LƯỢC ĐÁNH GIÁ GITHUB LÀ TÍN HIỆU HỖ TRỢ THỨ HAO VÀ CÔNG THỨC CHẤM ĐIỂM CHÍNH THỨC

## Status
**ACCEPTED**

## Context
Dữ liệu GitHub public của ứng viên cung cấp các minh chứng thực tế bổ sung cho năng lực lập trình. Cần có công thức toán học minh bạch quy định tỷ lệ đóng góp của GitHub vào Điểm Match Result Tổng thể ($S_{\text{overall}}$), đồng thời bảo đảm tính công bằng tuyệt đối cho ứng viên không có tài khoản GitHub hoặc khi xảy ra sự cố API.

## Decision
1. **Official Scoring Model (Trọng số 85 / 15):**
   $$S_{\text{overall}} = 0.85 \cdot S_{\text{core}} + 0.15 \cdot S_{\text{github}}$$
   * Điểm Nòng cốt JD-CV ($S_{\text{core}}$) chiếm $85\%$ trọng số chủ đạo.
   * Điểm Hỗ trợ GitHub ($S_{\text{github}}$) chiếm $15\%$ trọng số bổ trợ.
2. **Kích hoạt Theo Ngữ cảnh JD (Conditionality Rules):**
   * Nếu JD là bài tuyển dụng phi kỹ thuật (Marketing, Sales, HR, Finance): Vô hiệu hóa GitHub ($w_{\text{github}} = 0.0, w_{\text{core}} = 1.0$) $\rightarrow S_{\text{overall}} = S_{\text{core}}$.
3. **Chiến lược Chuẩn hóa Theo Dữ liệu Khả thi (Available-Data Normalization Fallback Strategy):**
   * Khi ứng viên không có GitHub, URL bị hỏng hoặc API GitHub chạm giới hạn Rate Limit: Tự động áp dụng Fallback $w_{\text{core}} = 1.0, w_{\text{github}} = 0.0 \rightarrow S_{\text{overall}} = S_{\text{core}}$.
   * **Cam kết Công bằng (Fairness Guarantee):** Candidate **KHÔNG BỊ PHẠT VỀ ĐIỂM 0**, giữ nguyên điểm nòng cốt.
4. **Minh bạch Giao diện (UI Transparency):** Hiển thị riêng biệt 3 chỉ số điểm số ở Header báo cáo HR: Overall Match, Core JD-CV Score, GitHub Supporting Signal.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Giải quyết dứt điểm rủi ro "black-box score", giúp HR nắm rõ lý do vì sao ứng viên đạt điểm tương ứng.
  * Đảm bảo tính công bằng $100\%$ cho ứng viên làm dự án bảo mật nội bộ không có GitHub.
* **Đánh đổi (Trade-offs):**
  * Cần duy trì tính toán 3 chỉ số điểm và lưu trữ chi tiết các `match_factors` trong CSDL.
