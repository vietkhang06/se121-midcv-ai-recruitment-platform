# Guidelines for AI Coding Agents

Trước mỗi lần bắt đầu hoặc tiếp tục bất kỳ công việc nào trong repository **AI Recruitment Platform / MidCV**, Agent **BẮT BUỘC** phải đọc các tài liệu nguồn sự thật (Single Source of Truth) sau đây:

1. [docs/CORE_PRODUCT_FLOW.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/CORE_PRODUCT_FLOW.md) — Luồng sản phẩm chuẩn 15 bước từ upload CV đến Recruiter quyết định.
2. [docs/DOMAIN_RULES.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/DOMAIN_RULES.md) — Ranh giới công nghệ, quy tắc form thẻ lặp, phân tách nguồn gốc dữ liệu và nguyên tắc chống bịa.
3. [docs/IMPLEMENTATION_STATUS.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/IMPLEMENTATION_STATUS.md) — Bảng trạng thái thực tế các phase, lệnh test thật và blockers còn lại.
4. [docs/ACCEPTANCE_CRITERIA.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/ACCEPTANCE_CRITERIA.md) — Tiêu chí nghiệm thu có thể đo lường và kiểm chứng cho từng phase.
5. [docs/API_CONTRACT.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/API_CONTRACT.md) — Hợp đồng giao tiếp chi tiết giữa AI Worker và Backend/Frontend.
6. [docs/IMPLEMENTATION_PHASES.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/IMPLEMENTATION_PHASES.md) — Chi tiết lộ trình triển khai từ Phase 0 đến Phase 10.

---

## Nguyên tắc xử lý xung đột

Khi có yêu cầu mới mâu thuẫn với các tài liệu đã chốt:
1. **Không tự ý thay đổi kiến trúc hoặc mã nguồn.**
2. **Ghi nhận xung đột** rõ ràng về mặt kỹ thuật và nghiệp vụ.
3. **Yêu cầu người dùng xác nhận** định hướng giải quyết.
4. Sau khi người dùng xác nhận, **cập nhật [DECISION_LOG.md](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/DECISION_LOG.md)** trước khi tiến hành chỉnh sửa mã nguồn.
