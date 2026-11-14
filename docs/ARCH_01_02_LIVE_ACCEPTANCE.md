# ARCH-01 / ARCH-02 — nghiệm thu bằng dữ liệu thật

## Trạng thái hiện tại

**BLOCKED / chưa nghiệm thu full stack.** Bản ZIP này không kèm dịch vụ PostgreSQL, nhà cung cấp AI, thông tin đăng nhập Candidate/HR hay ảnh trình duyệt. Không lấy unit test hoặc fixture thay cho luồng thật. `docs/IMPLEMENTATION_STATUS.md` giữ các phase ở `NOT_STARTED` cho tới khi có bộ bằng chứng dưới đây.

## Hợp đồng matching

| `match_results.status` | `semantic_method` | Ý nghĩa |
|---|---|---|
| `PENDING_VECTOR` | `TF_CONCEPT_COSINE_SIMILARITY` | Chưa đủ vector CV/JD; điểm là tạm tính. |
| `FALLBACK_USED` | `TF_CONCEPT_COSINE_SIMILARITY` | Hai vector sẵn sàng nhưng truy vấn `<=>` không cho kết quả; điểm là tạm tính, cần xem log. |
| `PGVECTOR_READY` | `PGVECTOR_COSINE_SIMILARITY` | CV đã xác nhận có vector đúng hash nội dung, JD pinned có vector, cùng model và 1024 chiều; SQL `<=>` trả điểm. |

Không suy ra trạng thái Pgvector từ `overall_score`. Điểm fallback vẫn được lưu để HR tham khảo. Trường `embedding_model` chỉ có khi kết quả là Pgvector. Worker `EMBED` đã enqueue `MATCH` cho các application gắn với CV/JD sau khi vector hoàn tất; đối chiếu cùng `application_id` trước và sau để chứng minh tự cập nhật. Những hàng lịch sử `COMPLETED` không được tự gắn nhãn Pgvector; cần tính lại để có provenance mới.

## Chạy và thu bằng chứng

1. Trên máy có Docker, Maven, Node, Python, `psql` và provider cấu hình thật, làm theo các lệnh khởi động trong `README.md`: `docker compose up -d postgres`, chạy AI worker, `mvn spring-boot:run` trong `backend`, `npm run dev` trong `frontend`. Ghi `docker compose ps` và log của cả ba tiến trình; xác nhận provider thực sự trả OCR/embedding, không thay bằng mock.
2. Đăng nhập Candidate trên trình duyệt, upload CV thật qua `POST /api/v1/candidate/cvs/upload`, chờ xử lý, xem/chỉnh bản trích xuất rồi xác nhận `POST /api/v1/candidate/cvs/{id}/confirm`. Đăng nhập HR, tạo JD `POST /api/v1/jobs/draft` rồi `POST /api/v1/jobs/{id}/publish`.
3. Candidate ứng tuyển `POST /api/v1/candidate/applications` với `jobId`, `cvId`; giữ `data.id` làm **một** `application_id` xuyên suốt. Nếu inspection lúc này là `PENDING_VECTOR`, lưu nguyên HTTP JSON vào `before.json`. Chờ worker xử lý `EMBED`, `MATCH` (không chỉnh DB hoặc gọi thủ công để giả lập worker). HR mở `/api/v1/matching/applications/{id}/inspection`, xem minh chứng rồi quyết định qua `PUT /api/v1/recruiter/applications/{id}/status`; chụp màn hình HR có cùng application ID/trạng thái.
4. Đặt access token HR thật vào biến môi trường `MIDCV_HR_TOKEN`; cấu hình kết nối `psql` bằng `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`. Chạy:

   ```powershell
   python scripts/verify_arch_live.py --application-id <UUID> --screenshot <duong-dan-anh-HR.png> --before-json <before.json> --output-dir <thu-muc-bang-chung>
   ```

   Bỏ `--before-json` nếu không bắt kịp trạng thái tạm; khi đó **chưa chứng minh** điều kiện tự cập nhật. Script gọi API HR thật và `psql` thật, tự chạy SQL `<=>`, kiểm tra bản ghi của đúng application ID, snapshot CV/JD, model/hash/kích thước vector và lưu `inspection.json`, `database.json`, `report.json`. Token không được ghi vào các file này. Giữ ảnh chụp, HTTP phản hồi upload/confirm/publish/apply/decision, log worker và DB cạnh thư mục bằng chứng. Không đưa CV hoặc token thật vào Git công khai.

## Điều kiện đóng task

- ARCH-02: trường hợp chờ vector, dự phòng SQL và Pgvector đều được kiểm chứng; so sánh hai lần inspection của cùng application ID để chứng minh worker tự chuyển trạng thái, không chỉ gọi nút tính lại. `report.json` phải trả `PGVECTOR_LIVE_VERIFIED`.
- ARCH-01: ngoài bộ bằng chứng trên, xác nhận browser upload/review/confirm, tạo/publish JD, ứng tuyển, HR đọc minh chứng và quyết định; HTTP response, log và bản ghi DB đều đối chiếu cùng ID. Sau đó mới cập nhật trạng thái nghiệm thu phase 5, 6, 9, 10 trong `docs/IMPLEMENTATION_STATUS.md` kèm đường dẫn bộ bằng chứng và ngày chạy.
