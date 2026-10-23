# MidCV — Current implementation and verification status

Updated after implementation work on 21/10/2026.

## Verification rule

Source changes, unit tests, compilation and a frontend build do not prove live acceptance. Functional phases without real end-to-end acceptance remain `NOT_STARTED` in the acceptance column below, even when source implementation exists. No production readiness claim is made. The original tracker is retained in `history/IMPLEMENTATION_STATUS_before_approved_remediation.md` as unverified historical assertions.

| Phase | Source implementation | Acceptance status | Remaining evidence |
|---|---|---|---|
| 0 Baseline | ZIP inventory and corrective decision recorded | BLOCKED | Git branch/HEAD/status unavailable in supplied ZIP |
| 1 Local extraction/OCR | Existing extractor code | NOT_STARTED | Real OCR/ground-truth/storage pipeline |
| 2 Structuring/fallback | Existing orchestration; stricter skill/GPA grounding added | NOT_STARTED | Approved live provider and backend integration |
| 3 Draft/review/confirm | Transition/active extraction guards and parent lock added | NOT_STARTED | PostgreSQL concurrency, browser review, file immutability acceptance |
| 4 Taxonomy | Existing code; no algorithm change here | NOT_STARTED | Full taxonomy integration acceptance |
| 5 Matching input/vector | Applied version binding; screening vector/schema boundary repaired | NOT_STARTED | Live DB/pgvector/model and both workflows |
| 6 Scoring/explanation | Existing algorithms retained; saved overall weights used | NOT_STARTED | Golden-score and explanation acceptance through real endpoints |
| 7 GitHub | OAuth identity linking and explicit public-only ownership status implemented; formula unchanged | NOT_STARTED | Provider/API live acceptance, scan/rate-limit acceptance |
| 8 Gap/roadmap | Existing worker source; not expanded by remediation | NOT_STARTED | Backend/UI integration not fully traced in audit |
| 9 HR review/decision | Existing code and corrected document access relation | NOT_STARTED | Live role/tenant/decision acceptance |
| 10 Full integration | Regression and contract tests; OAuth, CV builder and salary source changes implemented | NOT_STARTED | Browser acceptance and full upload-to-decision run with real dependencies |

Additional source work in this delivery: Google/GitHub login and registration callbacks, manual CV draft editor, explicit VND/month salary semantics and negotiable/undisclosed distinction. These do not change the acceptance status: see `IMPLEMENTATION_REPORT_20261021.md` and `MANUAL_ACCEPTANCE_20261021.md` for actual evidence and remaining checks.

See `REMEDIATION_VALIDATION.md` for the actual commands/results of this delivery. Tests labelled Integration in the old tracker may use mocks; they are not reclassified as live tests by their filename. No historical metric is overwritten with an invented replacement.
