# Gia Khang acceptance task matrix

Execution time: `2026-11-14T10:38:16+07:00`  
Baseline/current Git HEAD: `fa52f2f53c3429a44b44d97b23417197e451691f` on `codex/gk-six-task-acceptance`  
State: verified working tree; not committed or pushed by this review.

| Task | Implemented and verified | Evidence | Status | Remaining acceptance gap |
|---|---|---|---|---|
| G01 | OAuth state/PKCE/browser binding, per-user provider login ownership, manual username remains unverified, repository/language provenance, safe fallback; real authenticated public GitHub API | `OAuthServiceStateTest` 4/4; `BusinessTaskRegressionTest` included in 19/19; live GitHub 2/2 | PARTIAL | No interactive GitHub OAuth callback round-trip or revoked-token run with project OAuth credentials |
| U01 | Real account/preferences/letters/upgrade HTTP, cross-user denial, real pgvector persistence, Flyway V27→current, backend restart/re-login, saved jobs/views/outbox service rules | `InboxIntegrationTest` 9/9; outbox 5/5; real HTTP 1/1; restart smoke PASS | PARTIAL | Browser+backend full E2E for saved-job/profile-view event was not run |
| U02 | One persisted theme store, initial DOM theme sync, VI/EN, light/dark, overflow and keyboard focus over supported role shells and required viewports | Playwright production browser 15/15; build/typecheck PASS | PASS | Role authentication was a browser fixture; U02 did not mutate RBAC or data flow |
| S02 | Prompt/document boundary, close-tag neutralization, schema grounding, bounded repair, PDF/DOCX negative cases, parser limits, redacted provider/API logs and safe error bodies | Python offline 268 passed; focused security cases included | PASS | No paid external LLM adversarial call; GitHub README is not ingested by the current product path |
| E02 | Current-worktree commands, sanitized raw logs/JUnit, SHA-256 manifest and claim reconciliation | This directory and `artifacts/SHA256SUMS.txt` | PARTIAL | A final commit SHA cannot exist until the user authorizes commit; evidence is tied to baseline SHA plus this working tree |
| E03 | Separate offline PR workflow and manually gated live-infrastructure workflow; real DB/worker/backend/frontend/browser, bounded optional provider, artifacts and sanitization | actionlint PASS; local component gates recorded | PARTIAL | Workflow has not run on GitHub at a final pushed commit; repository-wide frontend lint currently fails 73 errors/145 warnings |

Allowed final vocabulary: `PASS`, `PARTIAL`, `FAIL`, `BLOCKED`, `NOT_RUN`.
