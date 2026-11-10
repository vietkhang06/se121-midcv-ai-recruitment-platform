# MidCV — QA regression patch & test evidence (04/11/2026)

## 1. Baseline and limits

- Source basis: `se121-midcv-ai-recruitment-platform-master(4).zip` supplied in the conversation on 04/11/2026. This is a ZIP snapshot, **not** a clone of the owner's current Git working tree. Newer local files and prior patches may differ.
- This patch changes **only the AI Worker GitHub/provider-health source, their tests, and an additive diagnostic script**. It does not alter candidate data, recruitment score weights, database schemas or authentication.
- No live PostgreSQL, Pgvector `<=>`, LLM chat completion, browser E2E, GitHub public network acceptance or Maven build was conducted in this runtime. All such acceptance criteria remain **NOT VERIFIED**.

## 2. Confirmed corrections

| Area | Problem observed | Fix | Regression evidence |
|---|---|---|---|
| LLM health | `/models` HTTP 200 with empty model list was treated as `model_resolved=true` | Report unresolved/unready until the configured model can be verified | `test_check_primary_provider_model_resolution` |
| GitHub input | Empty or foreign-domain profile URLs could be converted into unrelated GitHub usernames | `NOT_CONNECTED`, no API call, no candidate penalty; reject malformed usernames | `test_signal_integrity_regressions.py` |
| GitHub language ratio | Archived repos included in active language distribution | Retain repository evidence but exclude archived data from aggregate ratios | `test_archived_repos_preserved_but_excluded_from_language_aggregate` |
| GitHub recency | Profile `updated_at` incorrectly used as evidence of public code activity | Use the latest public non-fork, non-archived repository `pushed_at` timestamp instead | `test_github_public_activity_uses_nonarchived_nonfork_pushes` |
| GitHub future timestamps | Future timestamps were classified as recent activity | Return limited observable activity rather than HIGH | `test_future_dated_github_evidence_not_treated_as_high_activity` |
| Tests / provider | Unit test unexpectedly depended on real `.env` credentials | Configure a test-only model/key via `monkeypatch` | `test_provider_health.py` |
| Tests / health | Expected `UP` even when mandatory LLM/OCR unavailable | Assert actual `UP/DEGRADED` policy | `test_startup_and_health.py` |
| Tests / dates | Hardcoded 2026-09-01 GitHub activity became stale | Generate a relative timestamp for the unit fixture | `test_reality_manipulation.py` |
| Tests / GitHub usernames | Fixture URLs contained `_` characters forbidden in GitHub usernames | Use valid hyphenated usernames; preserve tested not-found/private behavior | `test_phase7_github_verification_acceptance.py` |
| Tests / legacy DOC | A header-only fake OLE container incorrectly expected a LibreOffice error | Expect secure invalid-container rejection; preserve separate plausible-container converter test | `test_document_extractor_advanced.py` |

**Important data limitation:** GitHub `pushed_at` is evidence of *repository activity*, not verified authorship by the candidate; do not describe it as confirmed personal commits. Some provider proxies do not expose models in `/models`; if so, a real chat-completion preflight remains necessary before declaring the LLM functional. 

## 3. Actual verification performed in this environment

| Command / scope | Observed outcome |
|---|---|
| `cd ai-worker && python -m pytest -q -k 'not test_gh01_valid_real_public_github_account and not test_gh02_repository_with_multiple_languages and not test_gh04_invalid_github_username'` | **263 passed, 3 deselected**, 23.46 seconds; see `evidence/2026-11-04/ai-worker-pytest-offline.log` |
| `cd frontend && node --test tests/*.test.mjs` | **39 passed, 0 failed**, with a reused local global TypeScript package for tests; see evidence log |
| TypeScript parser diagnostics for all frontend `.ts/.tsx/.js/.jsx` files | **148 files, 0 syntax errors**; this is not `tsc --noEmit` or `next build` |
| `python -m pytest -q scripts/tests/test_midcv_diagnostics.py` | **2 passed** |
| `python scripts/midcv_diagnostics.py` against extracted snapshot | 0 source/config merge markers in checked source paths, and critical files present |

**Do not treat** unit tests, mocked HTTP transports, fixture results, parser-only checks, or an open TCP port as a live integrated acceptance test. Tests excluded above require GitHub public network or provider API access.

## 4. Reproduce on Windows (project root)

> Before applying full-file overlays, copy current versions of each matching file to a backup or review diffs. This ZIP does **not** contain the user's newest local working-tree changes.

```powershell
# Offline conflicts and project layout
python .\scripts\midcv_diagnostics.py --json-out .\midcv-static-diagnostics.json

# Local service health (real HTTP/TCP requests, no credentials)
python .\scripts\midcv_diagnostics.py --live --json-out .\midcv-live-diagnostics.json

# If PostgreSQL uses another exposed port
python .\scripts\midcv_diagnostics.py --live --postgres-port 5433

# Java production + test compilation
mvn -f backend/pom.xml -DskipTests test-compile

# Run backend tests (not equivalent to E2E)
mvn -f backend/pom.xml test

# Worker test suite excluding three tests requiring live GitHub network
cd ai-worker
.\.venv\Scripts\python.exe -m pytest -q -k 'not test_gh01_valid_real_public_github_account and not test_gh02_repository_with_multiple_languages and not test_gh04_invalid_github_username'
cd ..

# Frontend checks
cd frontend
npm run test:contracts
npx tsc --noEmit
npm run build
cd ..
```

For an actual full-stack pass, separately run and document: Candidate registration/login; real CV upload and OCR; LLM structuring; review/confirm; exact CV version snapshot; JD extraction; real embedding provider; PostgreSQL/Pgvector `<=>`; Quick Apply; deterministic score factors; HR evidence inspection and human status decision; permissions/tenant isolation. **None of those steps is automatically proven by the diagnostic script.**

## 5. How to report issues

Share the *redacted* build/test log plus `midcv-static-diagnostics.json` and `midcv-live-diagnostics.json` (generated by the new script). Never attach `.env`, user CVs, JWTs, OAuth tokens, real candidate personal data, database dumps or complete AI-provider responses containing secrets.

## 6. Remaining acceptance status

- **PASS (offline scope only):** recorded unit/contract tests and source-level checks listed above.
- **NOT VERIFIED:** Maven build in the model runtime, PostgreSQL migration upgrade, real Pgvector operator use, model embeddings, public GitHub live API, full Next.js typecheck/build, authenticated candidate and HR flows, CV/OCR integration with real files and LLM, SSE/recovery, security/performance acceptance, business-score reproducibility against labeled ground truth.
- **No Git commits created:** the supplied source ZIP has no `.git` metadata. Do not manufacture branch names or commit SHAs.
