# Hướng dẫn áp dụng và khởi chạy bản sửa MidCV

## 1. Nội dung bàn giao

Bản đầy đủ `midcv/` được sửa từ đúng ZIP đã audit. ZIP gốc không bị thay đổi. Danh sách file và unified diff được xuất ở thư mục bàn giao; dấu `-` là dòng bỏ, dấu `+` là dòng thêm. Không xóa file source nào. Không commit/push/deploy hoặc chạy trên database thật của bạn trong phiên này.

Hai cách áp dụng:

1. Giải nén `midcv/` vào thư mục mới, ví dụ `C:\MidCV-Remediation`. Đây là cách dễ đối chiếu nhất; cần bổ sung `.env` cục bộ của bạn.
2. Nếu muốn dùng repo Git hiện tại: kiểm tra `git status`, lưu các thay đổi riêng của bạn, chạy `git apply --check <đường-dẫn>\changes.patch` trước. Chỉ khi check thành công mới `git apply <đường-dẫn>\changes.patch`. Patch được tạo từ ZIP baseline, nên một repo khác revision có thể không áp dụng được. Không dùng reset/force để ép patch. File có trong patch không cần chép thêm lần nữa.

`backend/src` là source build chính. Các bản `backend/bin` cũ trong ZIP được giữ nguyên để không xóa dữ liệu đã cung cấp; không dùng chúng thay source hoặc làm bằng chứng kiểm thử.

## 2. Công cụ

- JDK21 có cả `java` và `javac`, Maven3.9.x.
- Node >=20.9.0 theo package Next được cài; lượt kiểm tra dùng Node24.19.0 và npm11.9.0.
- Python3.12 được dùng cho kiểm thử; tạo virtual environment riêng.
- Docker Desktop để dùng PostgreSQL/pgvector dev bên dưới; không bắt buộc nếu bạn tự chuẩn bị DB tương đương.
- Tesseract5 cùng `eng` và `vie` để kiểm OCR; LibreOffice nếu cần DOC. Không có các thành phần này thì không đánh dấu OCR/DOC acceptance hoàn tất.
- Primary LLM endpoint/key/model hợp lệ. Ollama và embedding model phù hợp nếu dùng fallback hoặc HR screening.

Kiểm tra trong PowerShell:

```powershell
java --version
javac --version
mvn --version
node --version
npm --version
python --version
docker version
tesseract --version
tesseract --list-langs
```

## 3. Tạo cấu hình cục bộ

Trong PowerShell, vào root của `midcv/`:

```powershell
Set-Location C:\MidCV-Remediation
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Sửa các mục sau; các giá trị `<...>` là chỗ bạn điền, không để nguyên:

```dotenv
DATABASE_URL=jdbc:postgresql://127.0.0.1:55432/airecruit_db
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<mat-khau-DB-dev-do-ban-dat>
JWT_SECRET=<chuoi-base64-ngau-nhien>
FILE_STORAGE_PATH=./uploads
WORKER_ENABLED=true
PORT_BACKEND=8080
LLM_PRIMARY_BASE_URL=<base-url-OpenAI-compatible-cua-ban>
LLM_PRIMARY_API_KEY=<key-cua-ban>
LLM_PRIMARY_MODEL=<model-ma-endpoint-cua-ban-ho-tro>
LLM_FALLBACK_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=<model-chat-da-cai-cua-ban>
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_URL=http://127.0.0.1:11434
EMBEDDING_MODEL=bge-m3
ENABLE_DEV_AI_TEST_ENDPOINTS=false
USE_MOCK_LLM=false
```

Backend `AiClient` dùng OLLAMA_URL/EMBEDDING_MODEL; Python dùng OLLAMA_BASE_URL/OLLAMA_EMBEDDING_MODEL. Hai bên phải trỏ đến model embedding tương thích cho screening. CV structuring gọi PRIMARY trước; key thiếu/sai hoặc model404 sẽ fail rõ, không được xem là lỗi tạm thời để tự chuyển fallback.

Sinh một giá trị JWT_SECRET base64 bằng Python rồi lưu vào `.env` của bạn:

```powershell
python -c "import base64,secrets; print(base64.b64encode(secrets.token_bytes(48)).decode())"
```

Không đưa `.env` vào source control. Không copy credentials vào phần báo cáo hoặc ảnh chụp log. Script import bên dưới chỉ gán KEY=VALUE, không thực thi giá trị như PowerShell và không in giá trị.

## 4. Database dev tách biệt

Dùng file Compose mới, không dùng volume `postgres_data` sẵn có:

```powershell
. .\scripts\Import-MidcvEnv.ps1
docker compose -p midcv-remediation -f docker-compose.remediation.yml config --quiet
docker compose -p midcv-remediation -f docker-compose.remediation.yml up -d postgres
docker compose -p midcv-remediation -f docker-compose.remediation.yml ps
```

DB này dùng cổng55432 và volume riêng. Backend tự chạy Flyway theo cấu hình dự án khi khởi động; hướng dẫn này dành cho DB dev mới. Không trỏ DATABASE_URL vào dữ liệu sản xuất. Chưa có migration mới trong bản sửa và không có backfill snapshot lịch sử. Sau khi một volume đã được khởi tạo, đổi biến POSTGRES_PASSWORD không tự đổi mật khẩu trong DB cũ; dùng lại thông tin ban đầu hoặc thực hiện quy trình quản trị DB riêng.

Khi cần dừng, dùng `docker compose -p midcv-remediation -f docker-compose.remediation.yml stop`. Không có bước `down -v` trong hướng dẫn này.

## 5. Worker — terminal thứ nhất

Mở PowerShell tại root, import `.env` trước khi chuyển thư mục. Việc này giúp chạy được ngay cả khi python-dotenv chưa được cài; không cần sửa requirements để chỉ đọc `.env`.

```powershell
. .\scripts\Import-MidcvEnv.ps1
Set-Location ai-worker
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Worker là dịch vụ nội bộ. Mở `http://127.0.0.1:8000/docs`. Endpoint health thực tế là `GET /internal/ai/health`; trạng thái có thể degraded khi provider/OCR thiếu. Health trả HTTP200 không đồng nghĩa OCR/provider đã sẵn sàng. Kiểm tra từng trường `ocr`, `llm`, `embedding`.

Nếu dùng Ollama, khởi động riêng `ollama serve`, kiểm tra `ollama list`, và cài đúng model chat/embedding ghi trong cấu hình của bạn. Tên model mặc định trong repo chưa phải bằng chứng model có sẵn trên máy hoặc endpoint của bạn. Không dùng mock mode để kết luận live acceptance.

## 6. Backend — terminal thứ hai

Mở PowerShell mới tại root:

```powershell
. .\scripts\Import-MidcvEnv.ps1
Set-Location backend
mvn -DskipTests package
mvn spring-boot:run
```

Backend mặc định gọi worker `http://localhost:8000/internal/ai`; dùng cổng8080. Sau startup phải kiểm tra log Flyway/JPA và kết nối DB. Trường hợp DB/schema hoặc provider thiếu chưa được nghiệm thu trong phiên sửa; không bỏ qua validate bằng cách đổi `ddl-auto` sang create/update.

Nếu bạn dùng layout khác máy local, cấu hình đúng `app.ai-worker.url` của Spring; không nối thêm `/api/v1` vào worker URL. Đây là internal AI prefix, khác public backend prefix.

## 7. Frontend — terminal thứ ba

Từ root:

```powershell
Set-Location frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
corepack pnpm install --frozen-lockfile
npm run build
npm run start
```

Mở `http://localhost:3000`. Chạy phát triển có thể dùng `npm run dev` thay cho build/start. Trong `frontend/.env.local`, dùng `NEXT_PUBLIC_API_URL=http://localhost:8080`; đường dẫn endpoint trong client đã có `/api/v1`. Sửa biến NEXT_PUBLIC cần build/start lại. Không dùng nhãn NEXT_PUBLIC_API_BASE_URL của một số mô tả audit cũ; tên biến thực tế là NEXT_PUBLIC_API_URL.

## 8. Kiểm thử trước khi dùng demo

Worker, tại `ai-worker/`:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_audit_grounding_regressions.py tests/test_fallback_orchestration.py tests/test_openai_compatible_client.py -q
.\.venv\Scripts\python.exe -m pytest -q
```

Frontend, tại `frontend/`:

```powershell
npm run test:contracts
npm run build
```

Backend, tại `backend/`:

```powershell
mvn "-Dtest=AuditRemediationRegressionTest,AuditDocumentAccessSqlTest,AuditCvLifecycleRegressionTest,AuditScreeningPipelineRegressionTest,ScreeningCvAdapterTest,CandidateCvConfirmationIntegrationTest,CandidateCvDraftAndEvidenceIntegrationTest,EndToEndCoreProductFlowIntegrationTest" test
```

Lượt bàn giao dùng javac/JUnit trực tiếp khi Maven resolution chưa hoàn tất trong runtime. Không ghi các kết quả đó thành `mvn test PASS`. Java agent Byte Buddy được nạp trước để chạy Mockito trong runtime hạn chế self-attach; môi trường máy bạn có thể không cần. Hãy đối chiếu `REMEDIATION_VALIDATION.md` trước khi diễn giải test result.

Bộ test backend cũ còn nhiều fixture scoring dựng raw CV nhưng không dựng applied CONFIRMED version. Chúng phải được rà soát theo contract mới trước khi dùng làm acceptance; không bật raw fallback chỉ để làm các fixture này pass. Full `mvn test`, PostgreSQL/pgvector acceptance và browser E2E chưa được báo pass trong bản bàn giao này.

## 9. Checklist chạy luồng thật

1. Candidate A upload CV tổng hợp → trạng thái xử lý thật → review DRAFT → lưu sửa → confirm.
2. Thử confirm khi processing/failed: phải bị chặn. Candidate B không xử lý/read CV của A.
3. Preview JD bằng CV đã chọn: số application không tăng. Nộp thật mới tạo application/snapshot.
4. Nộp CV Bv2, sửa bản mới sau đó: hồ sơ nộp giữ Bv2 và UI hiện số2.
5. HR cùng công ty xem đúng application/version; HR khác công ty bị từ chối.
6. HR lưu90/10, re-score, đối chiếu effective weights và breakdown; GitHub không có vẫn overall=core.
7. HR screening CV mới: có vector/model trước matching; sửa JD rồi screening mới phải dùng JD mới.
8. Theo dõi SSE và polling qua server thật; không dùng progress giả để nghiệm thu.

Các bước trên là kế hoạch nghiệm thu, không phải output đã quan sát trong phiên sửa. Nếu lỗi, lưu status/code/correlation ID và log đã che dữ liệu nhạy cảm; không tự thay dữ liệu lịch sử hoặc xóa volume để thử lại.
