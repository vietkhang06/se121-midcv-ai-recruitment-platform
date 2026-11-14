# Claim reconciliation

| Claim | Classification | Current evidence | Correct statement |
|---|---|---|---|
| G01 is fully live | CONTRADICTED | Public API 2/2; no project OAuth round-trip | Public repository evidence is live verified; OAuth ownership logic is tested, not live round-trip verified |
| U01 is only React local state | CONTRADICTED | Real PostgreSQL 14/14 and real HTTP 1/1 | Account workspace is DB/API-backed; remaining gap is combined browser/restart coverage |
| U02 works across required modes | LIVE_INFRA_VERIFIED | Playwright 15/15 on production build | Supported role shells, target viewports, locales and themes passed targeted browser acceptance |
| S02 is protected by keyword blacklist | CONTRADICTED | Boundary encoding, safe error channels, schema grounding and parser limits | Protection uses trust boundaries and validation; document content is still preserved as evidence data |
| Offline CI is green | CONTRADICTED | Frontend lint: 73 errors, 145 warnings | Deterministic suites/build pass, but required repository lint is red |
| Live CI passed | IMPLEMENTED_NOT_RUN_ON_GITHUB | actionlint exit 0 only | Workflow is syntactically verified; a pushed GitHub run is still required |
| External LLM/provider passed | BLOCKED | No paid call performed | External provider acceptance remains not configured/not run |
| All six tasks are complete | CONTRADICTED | Matrix has 2 PASS and 4 PARTIAL | U02 and S02 pass the verified scope; G01/U01/E02/E03 retain explicit blockers |

