# Kết quả kiểm tra ARCH-01 / ARCH-02 (13/11/2026)

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `python3 -m py_compile scripts/verify_arch_live.py` | PASS | Chỉ kiểm tra cú pháp Python. |
| `python3 scripts/verify_arch_live.py --help` | PASS | CLI hoạt động; chưa gọi API/DB. |
| `python3 scripts/midcv_diagnostics.py` | PASS: không thiếu file trọng yếu, không có dấu merge conflict | Không chứng minh build hoặc luồng nghiệp vụ. |
| Rà soát mã trạng thái và SQL `<=>` | Có phân biệt `PENDING_VECTOR`, `FALLBACK_USED`, `PGVECTOR_READY`; SQL yêu cầu hai vector READY/cùng model/1024 chiều và JD đúng source hash | Cần biên dịch và kiểm thử bằng DB thật. |
| Maven backend, frontend build, Docker/PostgreSQL, provider và browser | **CHƯA CHẠY** | Môi trường bàn giao ZIP không có Maven, Docker, `psql`, dịch vụ database và provider đang hoạt động; không đủ cơ sở báo PASS. |

Test cũ ở `NativePgvectorMatchingTest` dùng Mockito cho lệnh SQL, không phải một lần chạy PostgreSQL; đã chỉnh bài kiểm tra fallback không nhận trạng thái hoàn tất Pgvector khi thiếu vector xác nhận. Phép chứng minh Pgvector và chuyển trạng thái yêu cầu chạy `scripts/verify_arch_live.py` trên môi trường đầy đủ theo `docs/ARCH_01_02_LIVE_ACCEPTANCE.md`.
