# MidCV — Kế hoạch thực thi 2 tuần (02/11/2026–15/11/2026)

## Mục tiêu

Đưa các luồng cốt lõi của MidCV đến trạng thái có thể vận hành và nghiệm thu: OCR tiếng Việt có hậu xử lý LLM có kiểm soát, upload CV tin cậy, SSE có thể phục hồi, truy vấn JPA an toàn khi OSIV tắt, matching chỉ sử dụng CV đã xác nhận, E2E trên backend/worker/database thật, cùng quy trình triển khai và phục hồi có backup.

Mục tiêu 90% là **mục tiêu kế hoạch**, không phải kết quả đã đạt. Chỉ công nhận khi có evidence cho từng tiêu chí.

## Branch và commit dự kiến

| Thứ tự | Task | Branch | Commit message |
|---:|---|---|---|
| 1 | W3-AI-01 — OCR tiếng Việt + LLM post-processing | `feat/W3-AI-01-ocr-vietnamese-correction` | `feat(ai): add evidence-preserving Vietnamese OCR correction` |
| 2 | W3-BE-01 — CV upload reliability | `fix/W3-BE-01-cv-upload-reliability` | `fix(cv): harden upload validation and storage rollback` |
| 3 | W3-BE-02 — SSE lifecycle/reconnect | `fix/W3-BE-02-sse-processing-resilience` | `fix(sse): harden event replay and processing lifecycle` |
| 4 | W3-BE-03 — JPA transaction boundaries | `fix/W3-BE-03-jpa-transaction-boundaries` | `fix(jpa): enforce transactional read boundaries` |
| 5 | W3-AI-02 — CV/JD matching integrity | `feat/W3-AI-02-cv-jd-pipeline-integrity` | `feat(matching): enforce confirmed CV pipeline integrity` |
| 6 | W4-QA-01 — real E2E | `test/W4-QA-01-cv-pipeline-e2e` | `test(e2e): cover real CV extraction to candidate ranking` |
| 7 | W4-DO-01 — production/recovery | `chore/W4-DO-01-production-readiness` | `chore(deploy): harden production deployment and recovery` |
| 8 | W4-PM-01 — release evidence | `docs/W4-PM-01-release-acceptance` | `docs(release): add evidence-based acceptance report` |

## Task breakdown and exit criteria

### W3-AI-01 — OCR Vietnamese correction
- Call OCR correction only when extraction metadata says OCR was used.
- Keep original OCR text as immutable evidence.
- Use exact-span suggestions, bounded categories, confidence threshold and anti-fabrication rules.
- Auto-apply only narrow, high-confidence common-word repairs with visible OCR corruption markers.
- Keep address and technical-term suggestions review-only; expose them to the Candidate in the CV review UI.
- Persist correction status and suggestions separately from the editable canonical draft.
- Exit: AI Worker tests pass; Tesseract OCR fixture tests pass; live Vietnamese-image acceptance passes on configured providers.

### W3-BE-01 — upload reliability
- Validate filename, extension, magic bytes and size before creating records.
- Use the exact storage key and metadata returned by `Documents.upload` instead of reconstructing a key from the raw client filename.
- Save the already validated byte array; remove temporary/orphan files on failures and rollbacks.
- Exit: Java unit/integration tests pass and the original HTTP 500 request/stack trace is reproduced and verified fixed.

### W3-BE-02 — SSE processing resilience
- Strictly parse Bearer headers and `Last-Event-ID` cursors.
- Verify DB-backed replay, reconnect, de-duplication, heartbeat, restart and session revocation.
- Exit: Java unit tests and live PostgreSQL/browser reconnect test pass.

### W3-BE-03 — JPA boundaries
- Keep OSIV disabled.
- Build DTOs while the required lazy relationships remain inside a read transaction.
- Test admin and recruiter HTTP reads against PostgreSQL.
- Exit: no `LazyInitializationException` in the target APIs under OSIV=false.

### W3-AI-02 — matching integrity
- Only a confirmed CV version owned by the applicant may be used for an application.
- Score from reviewed professional sections; exclude PII/provenance/unreviewed extraction fields.
- Preserve immutable application CV snapshots and deterministic scoring.
- Exit: regression tests pass and a live application appears in the HR ranking with a valid score/inspection record.

### W4-QA-01 — E2E
- Live API E2E from real candidate login and upload through extraction, review, confirm, application, HR ranking and inspection.
- Separate live Vietnamese-image OCR acceptance verifies correction metadata survives worker persistence and review API projection.
- These tests create real CV/application records; use dedicated disposable test accounts and jobs.
- Exit: both gated acceptance tests pass against the group's configured test stack.

### W4-DO-01 — production readiness
- Docker production images, exact-origin CORS, readiness health checks, HTTPS reverse proxy.
- Backup DB + uploads before any app image/migration deployment; verify SHA-256 and restore only into new recovery DB/volume.
- Exit: Compose config/build, deployment, backup verification and non-destructive restore rehearsal pass on the target host.

### W4-PM-01 — release acceptance
- Evidence-based status for each requirement, test command, commit SHA, logs, blockers, owner and remaining risk.
- Exit: review/sign-off; no P0/P1 defects open; 90% measured from agreed scope/weights, not from task status labels.

## Quy tắc thực thi

1. Không thay đổi dữ liệu production khi chưa có backup được verify.
2. Không đưa mock vào live acceptance; fixture/mock chỉ dành cho unit/contract tests.
3. Không tự động xác nhận tên riêng, địa chỉ hoặc thuật ngữ do LLM đề xuất.
4. Không đánh dấu DONE nếu chưa có test/evidence tương ứng.
5. Thay đổi Java, Docker, Playwright và live DB phải được chạy lại trên máy có Maven, Docker, PostgreSQL, Node dependencies và tài khoản thử nghiệm thật.
