# MidCV — Release Acceptance & Cross Review (E04)

Ngày lập: 01/11/2026. Phiên bản nguồn tham chiếu: source ZIP được gửi trong hội thoại, đã có V30. **Tài liệu này là checklist để thực hiện nghiệm thu; trạng thái mặc định là NOT_VERIFIED, không phải kết quả nghiệm thu đã chạy.**

## 1. Cổng release P0

| Gate | Điều kiện đóng | Evidence bắt buộc | Trạng thái tại lúc tạo |
|---|---|---|---|
| S01 — HTTP security matrix | Role, tenant, access/refresh token, query-token rejection và CORS được xác minh qua HTTP | Backend test log + `fullstack-live-acceptance.spec.ts` log + ma trận role/tenant đã điền | NOT_VERIFIED |
| E01 — Full-stack E2E | Frontend + backend + PostgreSQL + file storage chạy cùng nhau; có lỗi mạng, restart và tenant boundary | Playwright live report; HTTP test log; restart-persistence log | NOT_VERIFIED |
| E04 — Cross review | Tất cả UC đã có reviewer độc lập, không còn P0 blocker, evidence truy nguyên được | PR/commit, reviewer, checklist ký xác nhận và release log | NOT_VERIFIED |

Không release khi còn P0 fail/unknown, có migration chưa thử, hoặc backup không restore được. Unit/Mockito/H2 không thay thế HTTP/PostgreSQL/SMTP/OAuth/LLM acceptance.

## 2. Checklist 15 Use Cases gốc

| UC | Phạm vi cần review | Evidence tối thiểu | Owner review | Trạng thái |
|---|---|---|---|---|
| UC-01 Register | Candidate/Recruiter register, email verification, resend, validation | HTTP response + DB rows + email test inbox/SMTP evidence | Chưa phân công | NOT_VERIFIED |
| UC-02 Login | Login, access/refresh rotation, expiry, logout, OAuth callback | HTTP token matrix + session DB + OAuth provider evidence | Chưa phân công | NOT_VERIFIED |
| UC-03 Manage Candidate Profile | Profile CRUD, draft/confirm CV, reload | Browser E2E + HTTP + DB before/after | Chưa phân công | NOT_VERIFIED |
| UC-04 Upload CV | Upload PDF/DOCX/image, extraction status, review/confirm, file hash | File SHA-256 + DB metadata + processing logs + restart | Chưa phân công | NOT_VERIFIED |
| UC-05 Search Jobs | Public search, keyword/location, page/size, empty state | Browser + API query/result count from DB | Chưa phân công | NOT_VERIFIED |
| UC-06 View Job | Public job detail and visibility rules | Anonymous HTTP + browser page | Chưa phân công | NOT_VERIFIED |
| UC-07 Apply Job | Confirmed CV gate, duplicate/concurrent apply, immutable snapshot | Concurrent HTTP result 1×201 + 5×409; snapshot SQL before/after CV edit | Chưa phân công | NOT_VERIFIED |
| UC-08 Create Job | HR creates DRAFT under own company | HR A success; Candidate/Admin denied; DB ownership | Chưa phân công | NOT_VERIFIED |
| UC-09 Edit Job | HR edits own DRAFT; no cross-tenant edit | HR A success; HR B denied; reload persisted fields | Chưa phân công | NOT_VERIFIED |
| UC-10 Publish Job | VERIFIED/ACTIVE company gate, close/restore/suspend behavior | HTTP state transitions + audit log + public search | Chưa phân công | NOT_VERIFIED |
| UC-11 View Applications | HR views own job applications and ranking pages | HR A success; HR B denied; pagination total matches DB | Chưa phân công | NOT_VERIFIED |
| UC-12 View Candidate | Application snapshot and private candidate details | Participant/company permission matrix + attachment hash | Chưa phân công | NOT_VERIFIED |
| UC-13 Run Matching | Real worker/provider request, timeout/fallback, persisted result | Worker trace with requested/resolved model + persisted result IDs | Chưa phân công | NOT_VERIFIED |
| UC-14 View Ranking | Ranking result tied to current persisted applications | SQL reconciliation + browser sorting/pagination | Chưa phân công | NOT_VERIFIED |
| UC-15 View Matching Explanation | Evidence-backed explanation and authorization | Evidence rows/trace IDs + HR tenant boundary + candidate scope | Chưa phân công | NOT_VERIFIED |

## 3. Business tasks in the 01/11 source package

| Task | Reviewer phải kiểm tra | Evidence cần attach | Status |
|---|---|---|---|
| Q01 | Onboard/company verification, suspend, appeal, concurrent review lock, audit target state | HR→Admin lifecycle; SQL appeal/suspension/audit; case còn suspension khác | NOT_VERIFIED |
| Q02 | Admin users/jobs/reports/taxonomy/audit, role matrix, counters | Admin role 200 vs HR/Candidate 403; SQL counts reconcile; report retry conflict | NOT_VERIFIED |
| Q03 | Admin backend config vs worker environment; trace after change/restart; no key leak | Runtime API redacted output; actual worker trace; restart backend+worker and re-check | NOT_VERIFIED |
| N01 | Transactional notification/outbox; unread; retry/backoff; opt-out; inactive users | DB outbox before/after commit; SMTP/Mailpit delivery and retry evidence | NOT_VERIFIED |
| N02 | Chat send/read/block/retry/restart and application ownership | Same `clientId`/same body returns same message; changed body 409; outsider 404; restart proof | NOT_VERIFIED |
| S01 | Entire HTTP security matrix, roles, tenants and token handling | `docs/SECURITY_HTTP_MATRIX_20261101.md` + live test logs | NOT_VERIFIED |
| Z01 | Production deployment, healthcheck, rollback | `docker compose ps`, health status, deployment log, rollback exercise on staging | NOT_VERIFIED |
| Z02 | DB + upload backup/restore and checksum | Backup manifest, pg_restore catalog, target recovery DB and restored file SHA list | NOT_VERIFIED |
| E01 | Full-stack E2E, network failure, restart, tenant | Playwright live report + restart-persistence log + DB evidence | NOT_VERIFIED |
| E04 | Cross-review and release closure | This checklist complete; reviewer and commit/PR recorded per UC | NOT_VERIFIED |

## 4. Cross-review procedure

1. Reviewer must not be the primary author of the code being reviewed. Reviewer records name, date, commit SHA and PR URL. Do not use a verbal “đã xem” without the commit reference.
2. Run static review first: scope, secrets, authorization, tenant filter, transaction boundary, migrations, log redaction and rollback path.
3. Run the regression suite and live acceptance suite. Attach raw log/report, not only a screenshot of a green summary.
4. Independently inspect SQL counts/ownership/audit records for one successful and one denied case. Record expected vs actual counts.
5. Every failed test becomes a tracked defect with severity, owner and retest link. P0 must be closed and retested by a different person.
6. Release approver checks DB migration fresh + upgrade, backup restore, persistent uploads, SMTP, provider/model trace, health checks, CORS origin and TLS domain before sign-off.

## 5. Sign-off record

| Role | Person | Date | Commit SHA / PR | Decision | Notes |
|---|---|---|---|---|---|
| Author / PM | Chưa điền | — | — | PENDING | — |
| Reviewer 1 (independent) | Chưa điền | — | — | PENDING | — |
| Reviewer 2 / QA | Chưa điền | — | — | PENDING | — |
| Release approver | Chưa điền | — | — | PENDING | — |

**Release decision:** `NO-GO` until all P0 gates are PASS and all required evidence has been attached.
