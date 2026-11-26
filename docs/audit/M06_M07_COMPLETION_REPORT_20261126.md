# Báo cáo hoàn thiện Module 06 và 07 — 26/11/2026

## Phạm vi và cách đánh giá

Prompt thực thi tại `docs/tasks/M06_M07_COMPLETION_EXECUTION_PROMPT.md` đã được áp dụng trực tiếp. Kết luận chỉ dựa trên source, database PostgreSQL sạch, unit/integration test, production build và Playwright; code tồn tại nhưng chưa có bằng chứng không được tính là hoàn tất.

## Hiện trạng sau lần thực hiện

| Module | Đã xác minh tốt | Được hoàn thiện trong lần này | Còn điều kiện nghiệm thu |
|---|---|---|---|
| M06 | Upload validation, quota/lock, draft-confirm, file gốc, review/error mapping | Builder save/reload/template, lịch sử phiên bản thật từ API, bộ E2E hiện hành | Luồng live có worker AI thật và bộ fixture DOC/DOCX/image hỏng cần chạy trong môi trường đầy đủ |
| M07 | Unique candidate-job ở DB, snapshot bất biến, deadline, optimistic HR decision, audit/status propagation | Chặn JD đủ vacancy; khóa JD khi chuyển `HIRED`; chặn double-click cùng event loop | Ma trận live AI consent/worker-down và notification ngoài process cần môi trường đầy đủ |

## Thay đổi thực hiện

1. Application dùng quy tắc duy nhất `candidate + job` như constraint hiện hữu; bổ sung kiểm tra số `HIRED` trước khi nhận đơn mới.
2. Khi HR chuyển đơn sang `HIRED`, service khóa pessimistic theo JD rồi đếm số đã tuyển. Hai transaction tuyển đồng thời vì vậy không thể vượt `vacancyCount`.
3. Quick Apply có khóa request bằng `ref` ngay lập tức, khắc phục khoảng trống trước khi React cập nhật `isSubmitting` khi double-click.
4. Frontend không còn dựng giả lịch sử `v1.0`: mỗi CV tải version summary thật qua endpoint `/candidate/cvs/{id}/versions`, tối đa ba request song song theo quota hiện hành; lỗi endpoint có fallback an toàn.
5. Builder giữ template/presentation, round-trip dữ liệu, reload và save; test cũ phụ thuộc seed ngầm được thay bằng API mock có trạng thái, xác minh persistence thực tế.
6. E2E upload success mô phỏng đúng pipeline bất đồng bộ: upload chỉ hoàn tất sau `processing-status=COMPLETED`.

## Ý nghĩa

- Không oversell versioning: UI phản ánh phiên bản backend thực tế thay vì luôn báo `v1.0`.
- Bảo toàn toàn vẹn vacancy cả ở đầu vào ứng tuyển và thời điểm ra quyết định tuyển dụng.
- Chống gửi trùng ở ba lớp: UI single-flight, service/lock, database unique constraint.
- Test ổn định hơn vì mô phỏng đúng API contract và lifecycle bất đồng bộ, không phụ thuộc dữ liệu seed ẩn.

## Bằng chứng kiểm thử

- Backend regression chọn lọc: **28/28 PASS** (`ApplicationDuplicateProtectionTest`, snapshot immutable/version, business regression).
- Backend M06 trên PostgreSQL/pgvector sạch: **13/13 PASS**; **44 migration PASS**. `TaskHttpAcceptanceTest` có 23 test bị skip do profile live không được bật, không tính PASS.
- Frontend unit contract + typecheck: **6/6 PASS**, TypeScript PASS.
- Production build Next.js: **PASS**, 51 route được build.
- Playwright M06/M07 lần chạy rộng: 15 case ban đầu PASS và phát hiện 8 test/contract lỗi. Sau sửa, upload mapping **6/6 PASS**, version/builder **2/2 PASS**, uploaded review/save **1/1 PASS**. Application workflow **7/7 PASS**, JD editor **3/3 PASS** từ cùng lượt chạy.
- `git diff --check`: PASS, chỉ có cảnh báo line-ending Windows.

## Các điểm chưa được tuyên bố DONE

1. `TaskHttpAcceptanceTest` live profile chưa chạy nên chưa có bằng chứng HTTP live cho toàn bộ 23 case.
2. Worker AI thật, SMTP/notification consumer và hai browser tab thật chưa được dựng cùng stack trong lượt này.
3. Boundary checker hiện báo dependency có sẵn `application -> matching/document/ai` và `cv -> candidate`. Đây là nợ kiến trúc trước thay đổi lần này; không refactor diện rộng vì chạm phạm vi AI của thành viên khác.
4. Repository hiện có V44, không có V45 như mô tả ban đầu. Fresh migration chứng minh V1–V44 chạy được; không tạo migration V45 giả.

## Verdict

- **M06: READY WITH CONDITIONS** — nghiệp vụ chính, persistence và UI contract đã có bằng chứng; cần live worker/file-fixture matrix để READY.
- **M07: READY WITH CONDITIONS** — duplicate/snapshot/deadline/vacancy/concurrency đã được bảo vệ; cần live consent-worker-notification matrix để READY.

Ưu tiên kế tiếp: dựng một disposable full stack có worker, chạy 23 HTTP acceptance case không skip, sau đó chạy hai-tab apply với hai CV và ma trận consent `true/false/omitted` trên cùng SHA.
