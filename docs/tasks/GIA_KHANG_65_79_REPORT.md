# Báo cáo Gia Khang — STT 65–79, loại 71

> Báo cáo này giữ bằng chứng lịch sử trước tích hợp master mới. Kết quả và migration hiện tại: [Quality review 02/11/2026](GIA_KHANG_QUALITY_REVIEW_20261102.md). Các suite mới đã được tách theo task; dùng tên test trong báo cáo review thay cho các tên suite gộp bên dưới.

Ngày cập nhật: 02/11/2026. Thư mục thực hiện: `D:\UIT-2026_2027_HK1\DoAn1\1-11-2026\se121-midcv-ai-recruitment-platform`.

Đã tạo và áp dụng [prompt thực thi](GIA_KHANG_65_79_PROMPT.md) trước triển khai. Phạm vi đúng 14 task Gia Khang; không làm C02/STT 71 của Việt Khang, không sửa checkbox Google Sheet. Sau chỉ dẫn của chủ dự án, phần kiểm thử tiếp tục chỉ dùng provider mock; không gọi API trả phí trong đợt tiếp tục này. Không commit, push hoặc deploy.

**Kết luận:** có triển khai và bằng chứng unit/contract/browser mock cho các nhóm chức năng bên dưới. Chưa nghiệm thu full-stack 14/14, chưa xác nhận production readiness hoặc chất lượng mô hình AI thật. Giữ nguyên hai scoring engine và công thức/phiên bản theo DEC-08. Không thay đổi quyền quyết định tuyển dụng của Recruiter.

**Cập nhật runtime sau báo cáo (02/11/2026):** đã sửa môi trường Python ở `ai-worker/.venv`. Docker của chủ dự án hoạt động trở lại; phát hiện host port 5432 thuộc DB dự án khác. Đã sao lưu DB cũ vào thư mục diagnostics bị ignore, giữ container `airecruit-postgres-pgvector` và volume `ai-recruitment-platform-demo_postgres_data`, publish host port 5434; `.env` cục bộ trỏ đúng DB và compose project cũ. Backend startup đã validate 29 migrations, áp dụng V21–V29 thành công trên DB dev cũ; `GET /api/v1/jobs` trả HTTP 200. Lần smoke test tắt background worker và không gọi provider thật, sau đó dừng backend test. Các script startup/status đã đọc/hiển thị cổng cấu hình. Điều này xác nhận startup/migration, chưa xác nhận cache invalidation, race hay full pipeline; các mục thiếu bên dưới được giữ làm checklist lịch sử.

## Ma trận 14 task

| STT | Task | Thay đổi và bằng chứng hiện có | Còn thiếu cho nghiệm thu thật |
|---|---|---|---|
|65|R02|Polling không dừng giả ở lượt 60; SSE/poll cleanup, AbortSignal, ngăn callback cũ; đồng bộ timeout backend→worker. Contract frontend kiểm tra 65 lượt poll/abort; HTTP worker thật với provider mock hoàn tất sau hơn 66 giây.|Chưa chạy job >60 giây xuyên DB queue→backend→UI; chưa nghiệm thu SSE reconnect qua mạng thật. Hủy UI chỉ dừng chờ.|
|66|O01|Thay fixture giả bằng binary Word 97–2003 thực; giữ fixture hỏng làm negative case; extractor từ chối container giả, generator không ghi đè fixture hợp lệ. 6 test extraction qua runtime LibreOffice thật đã pass trước đó.|Cần lặp lại trên môi trường triển khai sau build image; Docker hiện không lên.|
|67|O02|Service/endpoint proposal và apply riêng, source SHA, diff/offset, allowlist typography, ngăn thay số/contact/facts và stale source; backend lưu proposal theo revision; UI chọn từng sửa và xác nhận. Unit, HTTP worker + mock provider, browser đều pass apply/reject/cancel/unsafe.|Chưa chạy toàn tuyến browser→backend→PostgreSQL→worker; chất lượng đề xuất provider thật chưa đo.|
|68|O03|5 mẫu synthetic có nhãn nguồn độc lập; runner CER/WER từng mẫu, checksum/config/error, hỗ trợ approved reviews để đo sau sửa. Extraction/OCR local thật đã thành công 5/5.|Chưa có benchmark sau đề xuất được duyệt; không tuyên bố mức cải thiện. Nhãn là synthetic, không phải hội đồng chuyên gia.|
|69|L01|Grounding ở đường sync; repair/fallback giữ provider đúng, fail-fast lỗi auth/config, tối đa một repair; schema hữu hạn/range; explainer không tin điểm hoặc prose tùy ý của LLM. Unit/provider contract và HTTP success/503→fallback pass.|API key/model thật do chủ dự án gắn và kiểm tra; mock không đánh giá hallucination ngoài bộ ca hiện có.|
|70|C01|Version/revision guard dưới parent lock; giữ trường ẩn/card IDs/provenance, reject structured overwrite; frontend gửi revision mới, chống save/confirm chồng nhau. Unit lifecycle/stale; browser kiểm tra edit trong lúc save, save lỗi/retry.|Chưa chạy PostgreSQL simultaneous save/confirm, rollback, checksum upload→confirm toàn tuyến. Client cũ vẫn được phép không gửi revision để tương thích.|
|72|C03|Builder canonical mapping giữ UUID, ngày, GPA, tech arrays, dữ liệu ẩn; lưu template; preview/export cùng dữ liệu. Browser pass save lỗi→retry→reload/template/mobile/PDF. PDF mở đọc được, 1 trang, đã render và xem bố cục.|Chưa nghiệm thu browser→backend lưu thật; PDF chỉ kiểm tra CV synthetic đã dùng, không đảm bảo mọi bố cục CV dài.|
|73|T01|Alias/token boundaries chống Java/JavaScript, C/C++/C#, React/React Native; không gắn nhãn SEMANTIC cho fuzzy text; vector Top-K và LLM bounded IDs. Unit adversarial paths pass.|Độ chính xác vector/model thật trên tập nhãn lớn chưa đo.|
|74|M01|Reject vector sai dimension/model/count/NaN/zero; fallback re-embed cả cặp; cache confirmed version/model/source SHA, migration additive V29; preview không ghi cache. Unit cache binding và lifecycle pass; trước đó 1 test pgvector SQL thật pass.|V29 và cache integration chưa chạy trên full backend; model embedding thật chưa đo. Synthetic vector không chứng minh semantic accuracy.|
|75|M02|Không đoán năm kinh nghiệm từ seniority; gộp khoảng thời gian hoàn tất không chồng lấn; scoring đọc đúng section; lặp 100 lần trong cả hai engine, factors/weights/gating/ranking/policy regression pass.|Policy/recalculate endpoints cùng DB thật và golden dataset nghiệp vụ chưa chạy full-stack.|
|76|M03|Runner lấy predictions từ endpoint ranking backend, ghi raw pages và engine/version, labels độc lập; IDCG dùng toàn bộ nhãn; metrics từ chối duplicate/unlabelled IDs và phát hiện candidate thiếu. Metrics unit pass.|Chưa có lần chạy runner với backend/DB thật và relevance dataset đầy đủ; không công bố NDCG chất lượng sản phẩm từ mock.|
|77|M04|Controller đọc selected confirmed version + published JD, không save; frontend loading/error/retry/confirmed selection; worker gap/roadmap đúng kỹ năng thiếu và không tạo roadmap vô cớ. Unit Java, HTTP worker/mock và browser pass.|Chưa nghiệm thu toàn tuyến cùng DB; evidence độc lập trả NOT_REQUESTED, không giả đã xác minh.|
|78|M05|Giữ phân tách screening và application, không tạo ứng viên/application giả; tests pipeline/lifecycle/version và repeatability riêng pass.|Screening upload→result, retry idempotency và thay CV/JD qua DB thật còn chờ.|
|79|M06|Lưu CV version/hash/JD requirements + semantic trace; inspection dùng snapshot, quote phải là substring nguồn, legacy thiếu input ghi rõ. Unit trace/current-draft isolation/factors pass.|Chưa nghiệm thu inspection từ dữ liệu persisted thật sau sửa CV/JD và recalculation.|

## Kiểm thử đã chạy

Các log `diagnostics/gia-khang/` được giữ cục bộ và đang bị Git ignore. [Tổng hợp JSON](evidence/mock-test-summary.json) lưu exit code, thời điểm cập nhật và SHA-256 của log cuối. Không cộng các lần chạy lặp thành số test độc lập.

| Bộ kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
|Java targeted, đợt cuối|56 passed, 0 failure/error/skip; exit 0|`diagnostics/gia-khang/backend-final-mock.log`; Surefire XML của 9 class|
|Python targeted, đợt cuối|97 passed, 1 deprecation warning; exit 0|`diagnostics/gia-khang/python-final-mock.log`|
|Frontend contract, đợt cuối|20 passed, 0 fail; exit 0|`diagnostics/gia-khang/frontend-contracts-final.log`|
|Playwright Chrome, HTTP mocked|4 passed; exit 0|`diagnostics/gia-khang/browser-final-mock.log`|
|Worker HTTP + local provider stub|4 nhóm hành vi pass, gồm request 69,48 giây; exit 0|[JSON](evidence/worker-http-mock.json), `diagnostics/gia-khang/worker-http-mock-final.log`|
|TypeScript / ESLint test files|pass; exit 0|`typescript-final.log`, `frontend-tests-lint.log` trong diagnostics|
|Production frontend build / lint phần source thay đổi|pass ở lượt trước; source UI không sửa thêm trong lượt tiếp tục này|`frontend-build.log`, `frontend-lint.log` trong diagnostics|
|DOC với LibreOffice thực|6 passed; exit 0, lượt trước|`diagnostics/gia-khang/doc-local-runtime.log`|
|SQL pgvector thực, DB test riêng|1 passed ở lượt trước, không chạy lại đợt này|`diagnostics/gia-khang/backend-targeted.log`; `GiaKhangPgvectorLiveTest`|
|OCR local thật|5/5 thành công; exit 0, lượt trước|[OCR report](evidence/ocr-benchmark-live.json)|

Lượt Python trước có 109 pass ở tập chọn khác (`python-targeted.log`); không cộng với 97. Lượt Java trước có 54 pass gồm 1 SQL thật; đợt cuối là 56 test mock và không chạy lại SQL. Những lượt browser trước lỗi do fixture/selector được giữ trong log lịch sử; bộ 4 ca cuối đã chạy lại thành công.

OCR CER/WER trước sửa: English image 0/0; Vietnamese image 2,13%/10,87%; bilingual scan 2,71%/16,88%; Vietnamese blurred 1,28%/6,52%; native PDF 0/0. Không có approved after-review, trường `after` để null. File `ocr-benchmark.json` là lần thử host thiếu Tesseract, không phải số liệu pass thay thế cho report `ocr-benchmark-live.json`.

PDF bằng chứng: [builder-export.pdf](evidence/builder-export.pdf), [render trang 1](evidence/builder-export-page1.png), [desktop](evidence/builder-desktop.png), [mobile](evidence/builder-mobile.png). PDF đã kiểm tra 1 trang, nội dung đủ tên/kinh nghiệm/dự án/GPA, không còn trang trắng. Đây là dữ liệu synthetic qua HTTP mock.

## Chạy lại mock, không cần API key

Từ repository root, sau khi cài dependency vào `.venv` và `frontend/node_modules`:

```powershell
.venv/Scripts/python.exe scripts/run_gia_khang_mock_worker.py

Push-Location frontend
npm run test:contracts
npx tsc --noEmit
npx playwright test e2e/gia-khang.spec.ts e2e/gia-khang-guidance.spec.ts e2e/cv-uploaded-review-save.spec.ts
Pop-Location

Push-Location backend
mvn -q '-Dtest=GiaKhangAcceptanceContractTest,GiaKhangVectorGapContractTest,AuditRemediationRegressionTest,AuditCvLifecycleRegressionTest,AuditScreeningPipelineRegressionTest,EmbeddingLifecycleAndStateHardeningTest,EmbeddingPersistenceTest,MatchingFactorAndPolicyTest,CandidateRankingTest' test
Pop-Location

Push-Location ai-worker
../.venv/Scripts/python.exe -m pytest tests/test_gia_khang_contracts.py tests/test_fallback_orchestration.py tests/test_openai_compatible_client.py tests/test_audit_grounding_regressions.py tests/test_synthetic_fixtures_extraction.py tests/test_phase4_taxonomy_normalization_acceptance.py tests/test_phase8_skill_gap_roadmap_acceptance.py -q
Pop-Location
```

HTTP runner dùng worker thật và stub OpenAI/Ollama tại localhost:18019; không phải mô hình AI. Nó kiểm tra cấu hình trước launch, từ chối cổng đang bị chiếm, không đưa API key thật vào tiến trình và tự dừng các child của nó khi kết thúc. Mỗi lượt có một request chờ 65 giây có chủ đích. Nếu cài đặt dotenv cũ vẫn ghi đè cấu hình từ file `.env`, preflight sẽ fail closed thay vì gọi provider ngoài.

## Bước nghiệm thu thật còn lại

1. Khởi động DB test riêng; áp dụng và kiểm tra V29. Không reset DB người dùng. Docker Desktop hiện lỗi startup do socket `sailor-ingest.sock`; chưa sửa hoặc factory reset.
2. Dùng `scripts/verify_gia_khang_live.py` với cấu hình DB test riêng và `--provider-mode mock` để chạy core/documents/screening; script này chưa chạy thành công toàn tuyến, không phải evidence pass. Provider thật chỉ opt-in với `MIDCV_ENABLE_PAID_TESTS=1` và `--provider-mode real` do chủ dự án chủ động chọn.
3. Gắn key/model ở server; kiểm tra success/auth/config/transient/repair/fallback và nguồn output. Không gắn key vào frontend hoặc commit file env.
4. Nghiệm thu race/rollback/checksum, job dài/SSE, vector invalidation/model consistency qua DB, backend ranking/recalculate/relevance metrics và screening retry. Chạy browser với backend thật thay vì route mock.
5. Chuẩn bị nhãn OCR sau sửa đã duyệt và relevance dataset độc lập; chạy hai runner benchmark, lưu raw predictions/config và kết quả thực. Không dùng điểm/vector mock để kết luận chất lượng AI.

Full-suite repository chưa được xác nhận sạch: baseline backend trước đó 448 test có 10 failure, 83 error, 17 skip (gồm fixture cũ và dependency DB); đợt này chỉ xác nhận các suite mục tiêu ở bảng trên. Không diễn giải targeted pass thành toàn bộ repository pass.
