# Rà soát chất lượng và chuỗi PR Gia Khang — 02/11/2026

Phạm vi: STT 65–79, loại 71. Tích hợp trên `origin/master` tại `acc5d7a`, giữ các sửa auth/session, SSE, ownership, immutable snapshots đã có trên GitHub. Worktree review: `se121-midcv-gia-khang-review`; bản làm việc và `.env` ban đầu được giữ riêng.

## Kết luận

Đủ bằng chứng để đưa source lên PR review theo từng task. Lượt review ban đầu dùng provider mock. Bổ sung O03 ngày 02/11 đã gọi gateway API thật 7 lần, giới hạn 1024 output tokens/lần, không retry/fallback; xem báo cáo live-primary. Các bằng chứng mock khác vẫn được ghi rõ là mock. Backend, PostgreSQL/pgvector và queue chạy thật trên DB test riêng. Browser dùng HTTP mock, vì vậy không gọi các ca browser này là full-stack E2E. Không đánh dấu toàn bộ phase sản phẩm VERIFIED.

## Vấn đề đã tìm thấy và sửa trong lượt review

1. **Migration trùng upstream:** master đã có V29 auth và V30 snapshot. Dùng **V31** cho mở rộng MIME, **V32** cho vector binding; không ghi đè migration master.
2. **Upload DOCX lỗi 409:** MIME DOCX dài 71 ký tự, cột `cvs.file_type` chỉ VARCHAR(50). V31 tăng lên VARCHAR(255), giữ nguyên MIME đầy đủ và dữ liệu cũ.
3. **Fallback cache vector làm hỏng transaction:** cache dùng transaction riêng `REQUIRES_NEW`; lỗi SQL rollback cache nhưng vẫn lưu score với concept fallback được ghi rõ. Đã chủ động gây lỗi PostgreSQL để kiểm tra.
4. **JD title không invalidation:** nội dung embedding/hash bao gồm title, description và requirements; kiểm tra đổi title/model thực qua backend.
5. **SSE setup/cleanup lỗi:** vẫn polling được, cleanup chỉ chạy một lần và không che kết quả job; xử lý CANCELLED như trạng thái kết thúc, không báo upload thành công.
6. **Quote thuộc sai version:** inspection chỉ hiện quote có source ID đúng applied version, đúng text/hash; không gắn SOURCE_QUOTE khi thiếu trace. Legacy không lấy title JD hiện tại làm title lịch sử.
7. **Screening lỗi PostgreSQL:** dùng `FOR SHARE OF j` khi query có LEFT JOIN; không khóa phía nullable.
8. **Screening tái dùng JD FAILED:** lượt mới không tái dùng document version đã thất bại; vẫn giữ snapshot của lượt cũ.
9. **Test khó review theo task:** tách test Python/Java/browser/contract theo chức năng, giữ ý nghĩa hành vi và không tăng số test bằng cách đếm lại cùng ca.

## Bằng chứng kiểm thử

- Java targeted trên source mới: **87 tests**, không failure/error/skip; gồm regression upstream auth, SSE, business flows. Có cả lặp 100 lần cho hai engine, stale revision và quote từ sai version.
- Migration thực: **2 lượt pass**, DB mới đến V32 và DB ở V20 nâng cấp đến V32, kèm Hibernate schema validation. Không cộng hai lượt này vào 87 contract tests.
- Python targeted: **107 passed**, 1 deprecation warning; không gọi provider ngoài.
- Frontend contract: **40 passed**; TypeScript pass.
- Next production build: pass với `--webpack` (worktree dùng node_modules junction; Turbopack không chấp nhận junction ra ngoài root). Browser Chrome: **4 passed** trên server riêng của worktree, HTTP mock.
- Runtime DOC/LibreOffice: **6 passed** trong container không có network.
- OCR local: **5/5** mẫu thành công; xem `evidence/ocr-benchmark-review.json`. Đã bổ sung 5/5 số đo before/after từ đề xuất API thật tại `evidence/ocr-benchmark-live-primary.json` và bản Markdown. After là preview được validator kiểm tra, chưa phải người dùng xác nhận áp dụng CV. Mẫu song ngữ CER 0.027140→0.016701, WER 0.168831→0.103896; 4 mẫu khác không đổi. Không suy rộng độ chính xác sản phẩm từ 5 mẫu synthetic.
- Backend/DB/queue với provider mock: **15 nhóm kiểm tra** trong `live-core.json`, `live-vectors.json`, `live-documents.json`, `live-screening.json`.
- Runner `evaluate_backend_ranking.py` đã gọi endpoint backend thật: raw predictions và metrics nằm trong `evidence/backend-ranking-review.json`; labels khai báo độc lập trước khi gọi backend, là rubric synthetic, không phải nhãn chuyên gia.

Log chi tiết nằm ở `diagnostics/gia-khang/review-*.log` (git ignored). JSON bằng chứng chỉ chứa dữ liệu synthetic; credentials/token actor giữ trong diagnostics, không commit. Các kết quả cũ trong GIA_KHANG_65_79_REPORT.md là lịch sử, không cộng dồn vào lượt này.

Tổng hợp máy đọc được: [review-verification.json](evidence/review-verification.json), [Java clean/FRESH](evidence/review-java-fresh-summary.json). Asset PDF/ảnh/DOC được đánh dấu binary trong `.gitattributes` để Git không đổi line endings làm sai PDF xref/checksum trên Windows.

## Chạy lại các kiểm tra không cần API key

Từ root worktree, sau khi tạo `.venv` và cài requirements của worker:

```powershell
Push-Location ai-worker
../.venv/Scripts/python.exe -m pytest tests/test_gia_khang_ocr.py tests/test_gia_khang_provider.py tests/test_gia_khang_taxonomy.py tests/test_gia_khang_vector.py tests/test_gia_khang_gap.py tests/test_gia_khang_ranking.py tests/test_gia_khang_ocr_metrics.py tests/test_fallback_orchestration.py tests/test_openai_compatible_client.py tests/test_audit_grounding_regressions.py tests/test_synthetic_fixtures_extraction.py tests/test_phase4_taxonomy_normalization_acceptance.py tests/test_phase8_skill_gap_roadmap_acceptance.py tests/test_phase5_target_jd_matching_acceptance.py tests/test_phase6_deterministic_scoring_acceptance.py -q
Pop-Location
Push-Location backend
mvn -q '-Dtest=GiaKhang*ContractTest,AuditRemediationRegressionTest,AuditCvLifecycleRegressionTest,AuditScreeningPipelineRegressionTest,EmbeddingLifecycleAndStateHardeningTest,EmbeddingPersistenceTest,MatchingFactorAndPolicyTest,CandidateRankingTest,BusinessTaskRegressionTest,AuthTokenLifecycleTest,CVProcessingSseTest' test
Pop-Location
Push-Location frontend
npm run test:contracts
npx tsc --noEmit
npm run build -- --webpack
npx playwright test gia-khang.spec.ts gia-khang-gap.spec.ts gia-khang-ocr.spec.ts cv-uploaded-review-save.spec.ts
Pop-Location
.venv/Scripts/python.exe scripts/run_gia_khang_mock_worker.py
```

Browser mặc định dùng localhost:3000; tránh tái dùng server từ bản source khác. Lượt review dùng config tạm trên cổng 3017 để chắc chắn chạy đúng build của worktree. Các pha DB trong `verify_gia_khang_live.py` chỉ chấp nhận DB test đã chỉ rõ và cần cấu hình cục bộ; không đưa config/token vào Git. Thứ tự pha: core, documents, vectors, screening. Documents có probe chờ 65 giây, nên chạy với provider stub mới khởi động cho mỗi lượt nghiệm thu.

## Ma trận chất lượng sau review

| STT | Task | Bằng chứng mới | Còn giới hạn |
|---|---|---|---|
|65|R02|Queue/worker thực hoàn tất job mock-provider >60 giây; polling/abort/SSE contract pass.|Chưa nghiệm thu browser qua mất mạng thật.|
|66|O01|DOC converter thật pass; DOCX upload qua DB thành công sau V31.|Các converter/runtime triển khai khác vẫn cần kiểm tra.|
|67|O02|Proposal lưu DB có revision; trước apply không đổi summary; apply có xác nhận; raw extraction không đổi. Browser cancel/reject pass.|Chưa đo chất lượng đề xuất từ model thật.|
|68|O03|5 mẫu có nhãn độc lập; OCR thật + API thật; raw/proposed text, edits, trace/model/usage, CER/WER before/after từng mẫu.|After là proposal preview; chưa có human approval và bộ dữ liệu CV thật do chuyên gia gán nhãn.|
|69|L01|Provider/repair/fallback/schema/grounding tests; HTTP mock primary và 503 fallback.|Đã xác thực primary model thật qua O03; các nhánh lỗi/fallback được kiểm tra mock, chưa có nghiệm thu fallback provider thực.|
|70|C01|DB race hai save: 200/409; draft mới không thay applied version; upload→save→reload→confirm giữ checksum/raw.|Chưa thử mọi tổ hợp đồng thời save/confirm/rollback.|
|72|C03|Browser lưu lỗi/retry/template/reload/mobile và PDF thực pass.|Cần kiểm tra thêm CV dài/multi-page trên backend thật.|
|73|T01|Adversarial exact/alias/fuzzy/vector/unknown tests pass.|Mock vector không đo độ chính xác semantic.|
|74|M01|V32 trên DB test; cache version/hash/model; đổi JD/model invalidates; SQL failure không phá outer transaction.|Chưa đo embedding model thật.|
|75|M02|Endpoint chấm lặp 100/100, factors tái dựng score; policy save/recalculate thật.|Golden corpus lớn theo ngành chưa có.|
|76|M03|Predictions từ endpoint thật, labels độc lập, runner đã chạy.|Corpus nhỏ synthetic; không suy rộng NDCG thành chất lượng tuyển dụng thực.|
|77|M04|Worker→backend gap/roadmap đọc đúng confirmed CV/JD, không sửa profile; browser retry pass.|Evidence độc lập chưa kiểm tra trả NOT_REQUESTED.|
|78|M05|Screening upload→extract→embed→score thực, không tạo candidate/application; khóa SQL và bỏ JD FAILED đã sửa.|Retry mọi loại lỗi/provider và browser HR toàn tuyến còn cần mở rộng.|
|79|M06|Applied snapshot không bị draft mới ghi đè; từ chối quote sai version và quote bịa.|Không gọi LLM thật để đánh giá diễn giải ngôn ngữ.|

## Chuỗi PR và deployment

Mỗi nhánh `feat/gk-<STT>-<chức năng>` có một commit task và PR dựa trên nhánh trước, theo thứ tự dependency: **65 → 66 → 69 → 70 → 67 → 68 → 72 → 73 → 75 → 74 → 76 → 77 → 78 → 79**. Base của PR đầu là master. Không merge tự động; khi merge từ đầu chuỗi cần giữ dependency và cập nhật base PR tiếp theo nếu GitHub không tự đổi.

Các test suite được chia theo task nằm trong `ai-worker/tests/test_gia_khang_*.py`, `backend/.../GiaKhang*ContractTest.java`, `frontend/e2e/gia-khang*.spec.ts` và `frontend/tests/gia-khang*.test.mjs`.

**Lưu ý DB dev cũ đã áp dụng V29 vector trong lượt trước:** lịch sử đó khác master mới (V29 auth). Không chạy `flyway repair`, sửa checksum hoặc reset volume để che xung đột. Cần backup và đối chiếu lịch sử trên bản DB sao chép trước khi chuyển DB dev đó sang chuỗi PR mới. Lượt review dùng DB test riêng; chưa sửa lịch sử Flyway của DB người dùng.

Các thay đổi `.env` cục bộ, key, virtualenv, uploads, dump DB, node_modules và log không thuộc PR. `.env.example` chỉ giữ template không có key người dùng. Các container test không phải dependency mới của ứng dụng.
