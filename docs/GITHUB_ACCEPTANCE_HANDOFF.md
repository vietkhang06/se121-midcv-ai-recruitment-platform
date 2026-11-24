# MidCV – bàn giao nâng cấp GitHub và nghiệm thu

**Phạm vi:** bản sửa trên ZIP nguồn `c9dfaa274427e498d833a6f8bc69e49c14bb6400`. Đây là bản triển khai source để tích hợp và kiểm thử, chưa phải kết quả nghiệm thu live. Không dùng số liệu trong các báo cáo cũ để chứng nhận bản này.

## 1. Khởi chạy và nghiệm thu GitHub (ưu tiên P0/P1)

1. Sao lưu DB và thư mục upload theo hướng dẫn của `scripts/midcv_backup.py`. Sử dụng DB thử nghiệm; không reset DB đang dùng. Migration Flyway **V45** bổ sung các cột snapshot, không backfill bằng dữ liệu giả.
2. Sử dụng cấu hình `.env.example` và `docs/OAUTH_GITHUB_SETUP.md`. Tạo GitHub OAuth App, Homepage `http://localhost:3000`, callback `http://localhost:8080/api/v1/auth/oauth/github/callback`. Điền `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` ở server. `GITHUB_TOKEN` là tùy chọn để tăng hạn mức gọi API công khai; không yêu cầu ứng viên cung cấp PAT, không để token vào frontend hay commit. Nếu chạy remote, callback phải đúng backend public URL.
3. Dựng hệ thống theo README (`start-dev.bat` hoặc Docker Compose theo cấu hình repo). Xác nhận migration V45 đã thành công, worker đang chạy, backend có kết nối GitHub API. Kiểm tra `EMBEDDING_MODEL` của backend và model thực tế tại AI worker; đường Pgvector canonical yêu cầu 1024 chiều. Không trộn vector từ model khác hoặc khai báo 1536 chiều trong báo cáo nếu chưa đo.
4. Candidate liên kết OAuth với **tài khoản GitHub của chính mình**, lưu hồ sơ/CV có URL cùng username. Có ít nhất một repository công khai, không fork/archive, chứa ngôn ngữ thực tế khớp yêu cầu của JD, ví dụ Java. Repo có topic `spring-boot` chỉ là tín hiệu metadata, không tự chứng minh kỹ năng Spring Boot. URL tài khoản sai hoặc tài khoản người khác không được xác minh.
5. HR công ty đã xác minh, JD IT thuộc gói hỗ trợ AI, có Required/Preferred rõ ràng, publish. Dùng HR có quyền xem chi tiết Pro (hoặc dev override hợp lệ của dự án). Candidate xác nhận CV, nộp **đơn mới** và đồng ý AI. Lưu application ID. Không dùng đơn cũ trước migration để chứng minh luồng GitHub mới.
6. Worker MATCH thu thập dữ liệu GitHub trước khi chấm. Đợi kết quả PGVECTOR_READY; mở hồ sơ ứng viên ở HR, kiểm tra Core, GitHub, Overall, repo URL, thời điểm thu thập, scope, trạng thái chủ sở hữu và minh chứng. Mở link repo trực tiếp để đối chiếu. Nếu chưa có điểm, xem trạng thái scan thay vì gán 0. Trường hợp lỗi có thể đồng bộ GitHub từ hồ sơ hoặc chạy tính lại theo chức năng sẵn có và theo dõi queue; nếu snapshot thành công đã lưu thì không lấy dữ liệu mới để thay đổi lịch sử của đơn.
7. Chạy công cụ kiểm tra với token của **HR thuộc công ty đó** và PostgreSQL tương ứng. Biến `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` và mật khẩu cấu hình an toàn tại máy test (`psql` phải có trong PATH). Không ghi token hoặc CV thật vào Git.

PowerShell (thay giá trị trong dấu `<...>` bằng ID và token của môi trường test):

```powershell
$env:MIDCV_HR_TOKEN = '<HR access token>'
python scripts/verify_github_live.py --application-id '<application UUID>' --expected active --output-dir acceptance/github/it-owned
```

Chạy lại `--expected neutral` với IT không có GitHub, GitHub chỉ URL chưa xác minh, repo không phù hợp, repo không có dữ liệu công khai hoặc JD ngoài IT; đợi Core hoàn tất. Chạy `--expected declined` với đơn từ chối AI. Mỗi ca dùng output-dir riêng. Script kiểm tra ID, phiên bản, điểm DB/API, trọng số và đối chiếu GitHub live với dữ liệu lưu; không tạo điểm hay dữ liệu mẫu. Nếu dữ liệu repository đã đổi, ghi sự khác biệt; không giả định scan lịch sử là dữ liệu hiện tại.

## 2. Phương pháp điểm GitHub trong bản sửa

- Dùng GitHub REST API `/users/{username}`, `/users/{username}/repos`, `/users/{username}/events/public`, `/repos/{owner}/{repo}/languages`. Cache public metadata 6 giờ, tối đa 100 repo, tối đa 10 repo gốc gần đây được lấy language breakdown; không truy cập repo private. Số liệu giới hạn này **không đại diện toàn bộ lịch sử GitHub**.
- Pinned handle theo CV nộp / profile / OAuth, identity so khớp `provider_subject` với GitHub ID thật và login. Đây là bằng chứng liên kết OAuth đã lưu, không phải chứng nhận tác giả tất cả code hay token còn hiệu lực. Thu hồi trên phía GitHub chưa được nghiệm thu live.
- Chỉ điểm khi có đồng ý AI, JD IT đủ điều kiện, có bằng chứng ngôn ngữ khớp yêu cầu và identity OWNED; loại repo fork/archive. `language_partial` hoặc thiếu dữ liệu -> không có điểm GitHub. Topic chỉ hỗ trợ; tên repo chung, stars và forks không làm tăng điểm.
- Gọi `R` là tập tên kỹ năng Required/Preferred đã chuẩn hóa, `L` là tập kỹ năng trong R có language bytes dương, `T` là tập kỹ năng trong R có topic khớp. Khi L không rỗng: `GitHub = 0.40*(100*|L|/|R|) + 0.35*(100*|L union T|/|R|) + 0.25*activity`. Activity là tuổi lần push gần nhất trên repo liên quan (<=14 ngày: 100; <=60: 85; <=180: 60; còn lại: 40). Nếu không có thời điểm hợp lệ, chia tổng hai thành phần đầu cho 0.75. Push date **không** chứng minh người dùng đã commit hay trình độ cá nhân.
- Theo policy mặc định, `Overall = 0.85*Core + 0.15*GitHub`; nếu không có GitHub đủ điều kiện, Overall = Core, GitHub=null, weight=0. Đây là không trừ điểm vì thiếu dữ liệu, không phải bảo đảm thứ hạng không thay đổi hoặc không có thiên lệch. Policy GitHub tối đa 15%.
- Snapshot public scan gắn application; match result giữ assessment riêng, phiên bản thuật toán `v2.1-public-evidence`. Không tự gán `VERIFIED` cho tín hiệu topic/repo. Những đơn cũ chưa có snapshot mới giữ trạng thái thiếu dữ liệu khi tính lại, không backfill điểm GitHub từ profile hiện tại.

## 3. Bảng backlog nghiệm thu

`Đã sửa` = source đã chỉnh, không đồng nghĩa với live PASS. `Cần chạy` = có công cụ/test nhưng chưa có dữ liệu live. `Mở` = vẫn còn việc triển khai hoặc đánh giá.

| # | Trạng thái bàn giao | Bằng chứng / bước cần thực hiện |
|---|---|---|
| 11 | Cần chạy | Candidate upload/edit/confirm, HR publish, apply, inspect, quyết định, Candidate xem lại; cùng ID; lưu HTTP/DB/UI. |
| 12 | Cần chạy | `scripts/verify_arch_live.py` + `scripts/verify_midcv_pgvector_live.sql`; lưu trạng thái trước và sau, screenshot thật. |
| 13 | Cần chạy | Source dùng 1024 chiều, mặc định bge-m3; xác minh model runtime, hash và SQL bằng ARCH verifier; cập nhật báo cáo/slide sau khi đo. |
| 14 | Đã sửa một phần | GitHub lỗi/thiếu không chặn nộp đơn, scan ở worker; chạy provider chính lỗi, fallback lỗi và vector pending trên test deployment. Chưa nghiệm thu cả ba ca AI. |
| 15 | Đã sửa | Pin consent/eligibility, bỏ scan với opt-out, không đưa provisional vào phân loại final; chạy 2 đơn đồng ý/từ chối, kiểm tra HR vẫn thấy đơn và API inspection từ chối opt-out. |
| 16 | Đã sửa | Pin JD ngay cả đơn không AI, giữ CV snapshot và GitHub observation; thử sửa CV/JD sau nộp, mở lại hồ sơ cũ. |
| 17 | Cần dữ liệu | `scripts/evaluation/extraction_metrics.py` tính P/R/F1 exact normalized entity theo PDF_TEXT, PDF_SCAN, DOCX, JD; thu thập nhãn độc lập và output thật, không có F1 nghiệm thu. |
| 18 | Cần dữ liệu | `scripts/evaluation/production_ranking_metrics.py`; chạy độc lập các bộ IT và ngoài IT với nhãn relevance 0–3 và score export backend; đối chiếu rank/tie-break thực tế. Chưa có NDCG nghiệm thu. |
| 19 | Đã sửa một phần | Repo evidence lưu URL thật, không gán xác minh kỹ năng; `verify_github_live.py`; rà soát thủ công cả CV/JD offsets/hash và ghi tỷ lệ đúng/sai/thiếu. |
| 20 | Đã triển khai code | `ApplicationGithubEvidenceService`, worker MATCH, cache + V45, UI HR; chạy live các ca IT owned/không GitHub/private/API lỗi/ngoài IT. |
| 21 | Đã sửa một phần | So khớp stable GitHub ID + username từ local OAuth link. OAuth round-trip và revocation live chưa kiểm chứng. |
| 22 | Cần chạy | Các test RBAC/snapshot có sẵn; thử Candidate A/B, HR A/B, Admin với từng API. |
| 23 | Cần chạy | CAS snapshot, queue lease, score transaction; chạy duplicate/tab/HR race/worker restart thực tế, chưa nghiệm thu đồng thời. |
| 24 | Đã có cache, cần đo | `github_cache` TTL 6h, `scripts/evaluation/live_api_benchmark.py`; đo request, provider call, latency stage/p50/p95 và version invalidation, chưa có số đo. |
| 25 | Mở | Đã sửa thống kê Submitted và thứ tự điểm UI; dashboard vẫn fan-out theo JD. Cần đo và quyết định thêm endpoint aggregate/pagination. |
| 26 | Kiểm thử một phần | Frontend 55 contract/unit pass; AI worker 16 pass, 2 live deselected; evaluation/backup 14 pass; Java parser 371 files, không lỗi cú pháp. Chưa Maven compile/JUnit, frontend build/lint/CI trên commit chốt. |
| 27 | Cần chạy | `scripts/midcv_backup.py` có test offline; diễn tập backup/restore vào DB riêng, người khác dựng lại và mở dữ liệu mẫu thật. |
| 28 | Bảng bàn giao đã tạo | Bảng này là status của bản sửa; điền ngày chạy, SHA commit mới, dataset version, test, kết quả và đường dẫn bằng chứng thật trước bảo vệ. |

## 4. Đánh giá trích xuất và xếp hạng

`extraction_metrics.py` nhận JSONL có `document_id`, `format`, `fields`: CV phải có skills/experience/education/projects, JD có required/preferred. Gold thêm `annotator`; prediction thêm `source: BACKEND_API`. Tập ID phải giống nhau, không trùng. Chấm exact match sau NFKC/casefold/whitespace; trường hợp không xác định mẫu số trả null. Mỗi mục cần chọn quy tắc gán nhãn nhất quán trước khi chạy. Ví dụ lệnh (file phải do nhóm thu thập, không được lấy ví dụ làm dữ liệu nghiệm thu):

```powershell
python scripts/evaluation/extraction_metrics.py --gold acceptance/gold-extraction.jsonl --predictions acceptance/backend-extraction.jsonl --output acceptance/extraction-metrics.json
python scripts/evaluation/production_ranking_metrics.py --ground-truth acceptance/it-gold.jsonl --predictions acceptance/it-backend.jsonl --k 5 --output acceptance/it-ranking.json
python scripts/evaluation/production_ranking_metrics.py --ground-truth acceptance/non-it-gold.jsonl --predictions acceptance/non-it-backend.jsonl --k 5 --output acceptance/non-it-ranking.json
```

Chọn K không vượt số ứng viên mỗi JD; script ranking hiện sắp theo score rồi candidate ID khi tie, chưa mặc nhiên chứng minh thứ tự thật của backend. Đối chiếu với rank backend trước khi báo cáo NDCG. Lưu dữ liệu ẩn danh, nhãn độc lập, phiên bản chính sách, commit và báo cáo thô.

## 5. Kiểm thử còn phải thực hiện trên máy nhóm

```powershell
cd backend
mvn test
cd ../frontend
npm ci
npm run build
npm run lint
node --test tests/*.test.mjs
```

Chạy Playwright theo cấu hình repo và live integration theo tài liệu ARCH. Không dùng kết quả offline làm bằng chứng API GitHub thật. Máy tạo bản sửa không có Maven/Docker và không phân giải được api.github.com, vì vậy chưa thực thi backend live, migrations hoặc OAuth. Không có kết luận PASS cho toàn backlog. Các file log kiểm thử offline nằm trong `docs/acceptance-offline/`.
