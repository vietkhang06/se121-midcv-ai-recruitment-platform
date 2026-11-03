# MidCV — Evidence thực thi (02/11/2026)

## Trạng thái tổng quan

Các thay đổi bên dưới đã được áp dụng vào working copy dựa trên source ZIP và patch ngày 01/11. ZIP nguồn không có thư mục `.git`; vì vậy branch và commit trong kế hoạch là **tên đề xuất**, chưa phải ref/commit đã tạo trong GitHub của nhóm.

| Task | Trạng thái source | Evidence hiện có | Còn phải xác minh |
|---|---|---|---|
| W3-AI-01 | Implemented trong worker và CV review API/UI | OCR correction, structuring, anti-fabrication tests; bilingual OCR/Tesseract tests | Live LLM + Vietnamese image flow, kiểm tra gợi ý trên browser |
| W3-BE-01 | Implemented | Filename/metadata/magic-byte/rollback regression tests được thêm/cập nhật | Chạy Maven; tái hiện chính xác request/stack trace 500 cũ |
| W3-BE-02 | Implemented | Strict Bearer parser, Last-Event-ID validation và unit tests được thêm/cập nhật | PostgreSQL replay, multi-instance/restart, browser reconnect/session revoke |
| W3-BE-03 | Implemented | Read-only transaction + HTTP acceptance được bổ sung | Chạy PostgreSQL acceptance với OSIV=false |
| W3-AI-02 | Guardrails hiện có được giữ lại; regression test mới | `ConfirmedCvInputTest` kiểm tra confirmed/owner/professional fields/PII exclusion | Chạy JUnit và live application-to-ranking |
| W4-QA-01 | Live acceptance tests được thêm | 2 bài gated API E2E (native PDF pipeline và Vietnamese OCR image) | Cài dependencies, cấp test accounts/job, chạy trên stack thật |
| W4-DO-01 | Production assets và safe backup/deploy logic được thêm | 12 Python tests; Python compile; Compose YAML parse | Docker build/compose up; PowerShell parse/deploy; restore rehearsal |
| W4-PM-01 | Draft release plan/evidence docs đã tạo | File kế hoạch và tài liệu này | Điền commit SHA, log thực thi live và sign-off sau khi chạy trên máy nhóm |

## Kiểm thử đã chạy trong working environment

### AI Worker — correction, structuring, grounding, health

Command:

```bash
cd ai-worker
PYTHONPATH=. python -m pytest -q \
  tests/test_ocr_text_correction.py \
  tests/test_cv_parser_ocr_correction_integration.py \
  tests/test_cv_structuring_ocr_correction.py \
  tests/test_cv_parser.py \
  tests/test_cv_non_fabrication.py \
  tests/test_cv_information_extraction.py \
  tests/test_api_endpoints.py
```

Result: **34 passed**.

### OCR/Tesseract — real local fixture tests

```bash
cd ai-worker
PYTHONPATH=. python -m pytest -q \
  tests/test_bilingual_ocr_integration.py \
  tests/test_document_extractor.py \
  tests/test_document_extractor_advanced.py \
  tests/test_tesseract_runtime.py \
  tests/test_ocr_text_correction.py
```

Result: **35 passed**. This proves local Tesseract fixture processing and test-level correction behavior, not that a production LLM provider was called successfully.

### Backup/restore and runtime contracts

```bash
PYTHONPATH=. python -m pytest -q \
  scripts/tests/test_midcv_backup.py \
  ai-worker/tests/test_runtime_configuration_contract.py
```

Result: **12 passed**.

### Static validation

- `python -m compileall -q ai-worker/app ai-worker/tests scripts/midcv_backup.py scripts/tests`: PASS.
- YAML parse for `docker-compose.production.yml`: PASS; 5 services detected.
- TypeScript syntax transpilation for `CVExtractionReviewModal.tsx`, `types/index.ts` and `fullstack-cv-pipeline-live.spec.ts`: PASS.

## Not run / do not claim as passed

- Maven/JUnit/Spring compilation and Java tests: Maven is not installed in this environment.
- Full frontend TypeScript typecheck / Playwright: `frontend/node_modules`, `@playwright/test` and Node type declarations are unavailable. The attempted project `tsc` run was blocked by missing dependencies/types; do not count it as a code pass.
- Docker build, container health, production compose startup, backup from PostgreSQL, PowerShell deploy/rollback and restore rehearsal: Docker CLI/daemon and PowerShell are unavailable.
- Live PostgreSQL, SSE reconnect/replay/restart, HTTP 500 original request reproduction, LazyInitializationException acceptance, live LLM, live OCR review API, live CV-to-HR ranking: not run.

## Defect notes / limitations

1. Upload source had a concrete filename/storage-key mismatch: `Documents.upload` stores a sanitized filename/key while the CV path previously reconstructed the key from the untrusted original filename. The implementation now uses canonical saved metadata. This is a real source defect corrected, but the group's historical HTTP 500 incident cannot be declared conclusively closed without its original request and stack trace.
2. AI Worker readiness previously treated some non-ready OCR states as healthy; the readiness rule now requires OCR `READY` and at least one reachable LLM provider. Docker healthcheck reads JSON `status`, not only HTTP 200.
3. OCR correction preserves raw OCR as ground truth. Technical-term/address proposals remain candidate-review-only; they are not silently injected into confirmed CV fields.
4. The new OCR review payload is persisted in `cv_versions.raw_structured_content` by the async worker and projected as `ocrCorrections` in `CVReviewResponse`, then rendered in the warnings/review tab.
5. Existing matching guardrails were retained rather than rewritten: only confirmed owned CV versions are accepted, professional reviewed content is used, and application snapshots remain immutable. New regression coverage still needs JUnit execution.

## Live acceptance environment required

At minimum:

- PostgreSQL + pgvector using current migrations.
- Backend and AI Worker reachable from the backend (`APP_AI_WORKER_URL`).
- Tesseract with `vie+eng` data and a reachable LLM provider.
- Frontend dependencies installed with the repository lockfile.
- Dedicated candidate and HR accounts; one fresh published job ID for the ranking E2E.
- Environment flags: `MIDCV_E2E_CV_PIPELINE=1` for the full CV/application path and `MIDCV_E2E_OCR_CORRECTION=1` for the Vietnamese image OCR path.

The E2E tests create persisted records. Do not run against production or personal accounts.
