# MID-01..MID-17 evidence-based status — source snapshot `(4)` + carried-forward patches

The project archive contains no `.git` directory. Branch, HEAD, commit SHAs and uncommitted work on the user's machine **cannot be inspected or asserted** from a ZIP. This document is a **code-change ledger**, not a signed acceptance report. The official 03-11-2026 RTM is not included in the snapshot; full reconciliation is blocked.

| Task | Implementation evidence in package | Verified here | Acceptance status / blocker |
|---|---|---|---|
| MID-01 | `VersionedEmbeddingLifecycle`, `ApplicationService`, `CVService`, `JobService`, `PipelineWorker`, V32 | Unit-level tests in previous delivery only | PARTIAL; actual post-apply Pgvector E2E not observed |
| MID-02 | `EmbeddingService`, `PgvectorCosineSimilarity`, V32 | Source and SQL inspection | PARTIAL; canonical model live verification, fresh/upgrade migration not run |
| MID-03 | `ai-worker/app/services/jd_parser.py`, `test_jd_grounding_mid03.py` | JD tests 12 PASS with mocks, includes existing tests | PARTIAL; live bilingual extraction, versioning and safe rollback not verified |
| MID-04 | V33, `Evidence`, `MatchingEngineService`, `MatchInspectionResponse` | Source/offset design, no DB available | PARTIAL; GitHub provenance and complete factor lineage need work |
| MID-05 | Existing Candidate/HR routes and old scripts | NOT RUN | BLOCKED; need real browser, users, DB, worker and LLM |
| MID-06 | Prior evaluation fixtures | NOT RUN | BLOCKED; independent N>=50 document labels not provided; do not invent |
| MID-07 | `scripts/evaluation/production_ranking_metrics.py` | 4 pure-math/data-contract tests shared with MID-12 PASS | PARTIAL; needs full production API prediction exports and independent graded relevance |
| MID-08 | `JobMatchingPolicyService`, `CandidateRankingService`, `MatchingEngineService`, `PolicyVersionInvalidationTest` | New Java tests authored, Maven NOT RUN | PARTIAL; JPA/queue live acceptance and formula reconstruction still needed |
| MID-09 | Existing queue/SSE tests | NOT RUN | BLOCKED; runtime upload/reconnect/restart tests needed |
| MID-10 | Prior `github_client`, `github_analyzer`, public activity tests | Targeted offline tests 19 PASS (combined QA group) | PARTIAL; real public GitHub live acceptance not run |
| MID-11 | Existing cache components | NOT RUN | NOT VERIFIED; invalidation, stampede and tenant tests needed |
| MID-12 | `scripts/evaluation/live_api_benchmark.py` | Metric-calculator unit tests PASS | PARTIAL TOOLING; no actual API load executed; no full pipeline metrics |
| MID-13 | Existing matching tests + Python technology distinction tests | Relevant offline tests included in 19 PASS | PARTIAL; multi-industry ground-truth acceptance not run |
| MID-14 | Existing RBAC/prompt injection paths | NOT RUN | NOT VERIFIED; requires live negative-security tests |
| MID-15 | Docker/Compose and existing migrations | NOT RUN | NOT VERIFIED; must backup and restore to isolated DB before acceptance |
| MID-16 | This ledger + pre-existing docs | Source reconciliation only | PARTIAL; official dated RTM absent and metrics require independent verification |
| MID-17 | Existing demo notes | NOT RUN | NOT VERIFIED; real anonymized Candidate/HR walkthrough needed |

## Critical architectural invariants

1. A persisted embedding metadata row does not prove a vector was generated. A successful test must verify the source-bound CV and JD vectors using the identical active embedding model and actual SQL `<=>` execution.
2. Candidate-reviewed structured content has separate provenance from the uploaded file bytes. The new evidence quote offsets are anchored to **reviewed text**, and never falsely presented as original PDF spans.
3. Required and Preferred skills are distinct. No arbitrary new numeric scoring weights were selected.
4. Policy changes invalidate old rankings. `STALE_POLICY` results are not shown as current until the worker recalculates them.
5. Candidate score is advisory. HR owns the final recruitment decision. No AI model makes a final hiring decision.

## Known important gaps

- Embedding is presently document-level/canonical input, not yet independently verified as section-aware multi-vector matching for all listed qualifications.
- Semantic fallback is explicitly labeled `TF_CONCEPT_COSINE_SIMILARITY`, which is **not** equivalent to Pgvector embeddings. Requiring Pgvector in an acceptance test must check the method and SQL path.
- `JDParser` hardens quote verification but does not yet persist every JD extraction offset/model/prompt version to the database.
- Legacy match factors sometimes carry explanatory summary text rather than exact evidence quotes. Do not label those summaries verified original-source excerpts.
- A safe migration needs database-level verification and backups before use; run Flyway on a fresh database and a copy of the existing database.
- The new Java JUnit tests were **not compiled** in the preparation environment (no Maven); local build success must be demonstrated before applying to a real shared environment.

## Local verification checkpoints

Run `git status`, `git diff --check`, backend Maven full tests, Python pytest full, frontend TypeScript/build, Playwright, then `scripts/Test-MidcvPgvectorLive.ps1`. Preserve raw outputs and environmental metadata. A skipped test remains skipped. A build success remains compilation evidence, not live product proof.
