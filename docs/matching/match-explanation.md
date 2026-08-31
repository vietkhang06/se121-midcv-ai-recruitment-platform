# MATCH EXPLANATION & SCORE RECONSTRUCTION SPECIFICATION

Tài liệu này đặc tả Cơ chế Tái tạo Điểm số Minh bạch (Score Reconstruction) và Giải thích Minh chứng.

---

## KHẢ NĂNG TÁI TẠO ĐIỂM SỐ 100% (SCORE RECONSTRUCTION)

* Mọi kết quả `MatchResult` đều được phân rã thành các bản ghi `MatchFactor` (`factor_type`, `score`, `weight`).
* Hệ thống có thể tái tạo chính xác điểm số tổng thể từ danh sách `MatchFactor` mà không cần gọi lại LLM hay thuật toán ngẫu nhiên.
* Tất cả các yếu tố đóng góp đều liên kết trực tiếp tới mã ID `Evidence` trong CSDL.
