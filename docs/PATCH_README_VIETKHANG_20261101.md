# MidCV — Patch source cho task Việt Khang (01/11/2026)

## Áp dụng patch

1. Sao lưu source hiện tại hoặc tạo một branch riêng trước khi thay đổi.
2. Giải nén ZIP patch này **ngay tại thư mục gốc repo** (thư mục có `backend/`, `frontend/`, `ai-worker/`). Cho phép ghi đè đúng các file trùng tên.
3. Không ghi đè `.env`, `.env.local`, `.env.production` hoặc bất kỳ secret đang dùng. Gói chỉ có `.env.production.example` làm mẫu.
4. Chạy test theo `docs/TASKS_VIETKHANG_20261101.md`. Chỉ đánh dấu task DONE khi có log chạy thật và bằng chứng đối soát.

## Nội dung

Patch chứa 10 file đã sửa và các file mới cho CORS/HTTP acceptance, production Docker/Caddy, backup/restore, live Playwright E2E, restart-persistence probe, checklist release và tài liệu kiểm thử. Danh sách chính xác nằm trong `PATCH_FILES_MANIFEST.txt`.

## Kiểm thử đã chạy trong môi trường tạo patch

- `python -m unittest discover -s scripts/tests -p 'test_*.py' -v`: **8/8 PASS**.
- `cd ai-worker && PYTHONPATH=. python -m unittest discover -s tests -p 'test_*.py' -v`: **4/4 PASS** (runtime configuration contract suite).
- `python -m compileall -q scripts ai-worker/app ai-worker/tests`: PASS.
- Parse YAML bằng PyYAML: `docker-compose.production.yml`, `backend/src/main/resources/application.yml`, `backend/src/main/resources/application-prod.yml`: PASS.
- `python scripts/midcv_backup.py --help`: PASS.

## Chưa thể xác nhận trong môi trường tạo patch

Môi trường tạo patch không có Maven, Docker CLI/daemon, PostgreSQL server, PowerShell hoặc `frontend/node_modules`. Vì vậy chưa chạy được Maven/JUnit, Docker build/compose, PostgreSQL HTTP acceptance, SMTP/Mailpit, provider/LLM live, Playwright E2E, PowerShell deploy/rollback hoặc restart-persistence. Các test/code này đã được thêm nhưng **không được xem là đã nghiệm thu**.

## Cảnh báo an toàn

- `scripts/Deploy-MidcvProduction.ps1` yêu cầu `-AllowProduction` và `.env.production` thật; hãy thử trên staging trước.
- `scripts/midcv_backup.py restore` chỉ tạo database và Docker volume phục hồi **mới**, không tự chuyển backend sang dữ liệu phục hồi và không ghi đè database/volume nguồn.
- `scripts/Test-MidcvRestartPersistence.ps1 -AllowRestart` restart backend của Compose stack; chỉ chạy trong maintenance window/staging.
- `docs/releases/RELEASE_ACCEPTANCE_E04_20261101.md` giữ trạng thái mặc định `NOT_VERIFIED` / `NO-GO` cho đến khi nhóm đính kèm evidence thật và reviewer độc lập ký xác nhận.
