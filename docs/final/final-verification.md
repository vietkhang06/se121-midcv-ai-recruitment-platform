# Final Release Verification Checklist (`docs/final/final-verification.md`)

## 1. Phase 8 Final Checklist

- [x] **Repository Clean**: Dead code, temporary files, unused imports removed.
- [x] **No Secrets Committed**: Scanned workspace for API keys, passwords, and tokens. Zero secrets found.
- [x] **README Complete**: Root [`README.md`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/README.md) updated covering all 21 required sections.
- [x] **Environment Documented**: [`.env.example`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/.env.example) updated with all required configuration variables.
- [x] **Docker Works**: [`docker-compose.yml`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docker-compose.yml) starts PostgreSQL 16 + Pgvector container with health checks.
- [x] **Database Migration Works**: Flyway migrations run cleanly on empty database to create full schema.
- [x] **Backend Tests Pass**: 39 / 39 Spring Boot Maven tests pass (`BUILD SUCCESS`).
- [x] **Python Tests Pass**: 17 / 17 Python AI Worker Pytest tests pass.
- [x] **Frontend Build Passes**: Next.js 16 production build compiles with 0 errors.
- [x] **Playwright E2E Passes**: 11 / 11 Playwright browser integration tests pass.
- [x] **Candidate Flow Works**: Landing $\rightarrow$ Job Search $\rightarrow$ Profile $\rightarrow$ CV Builder $\rightarrow$ PDF Export $\rightarrow$ Quick Apply.
- [x] **HR Flow Works**: Company Profile $\rightarrow$ Job Creation $\rightarrow$ Application List $\rightarrow$ AI Ranking Engine $\rightarrow$ Candidate Inspection.
- [x] **AI Engine Works**: JD Extraction $\rightarrow$ CV Parsing $\rightarrow$ Skill Normalization $\rightarrow$ Vector Embedding Search.
- [x] **Matching Engine Works**: 3-Tier Match Score ($S_{\text{overall}}$, $S_{\text{core}}$, $S_{\text{github}}$) and Required Skill Gating enforced.
- [x] **GitHub Assessment Works**: Language distribution, activity signal, recency, and neutral fallback policies verified.
- [x] **Security Works**: Multi-tenant recruiter ownership isolation (HTTP 403) and CV file access control enforced.
- [x] **Demo Data Works**: Stable seed dataset created for 3 companies, 5 jobs, 10 candidates, and deterministic mock fallback.
- [x] **Demo Script Works**: Concise 3-part storyline documented in [`docs/final/demo-scenario.md`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/final/demo-scenario.md).
- [x] **Screenshots Captured**: 12 E2E screenshot artifacts saved in `frontend/e2e/screenshots/`.
- [x] **Limitations Documented**: Technical and scope boundaries honestly documented in [`docs/final/limitations.md`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/final/limitations.md).
- [x] **Traceability Complete**: Requirement $\rightarrow$ Use Case $\rightarrow$ Domain $\rightarrow$ API $\rightarrow$ Database $\rightarrow$ UI $\rightarrow$ Test fully mapped.
