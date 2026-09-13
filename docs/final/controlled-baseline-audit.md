# MidCV — Controlled Baseline Audit (WP-00)

> **Document Type**: Controlled Baseline Audit & System Snapshot  
> **Product Name**: **MidCV**  
> **Primary Research Topic**: "Nền tảng tuyển dụng thông minh hỗ trợ đối sánh ngữ nghĩa JD – CV và xác thực năng lực qua GitHub"  
> **Date**: September 7, 2026  
> **Git Commit HEAD**: `68e891c fix: fix playwright github test`  
> **Current Branch**: `master`  
> **Baseline Status**: **100% OPERATIONAL & VERIFIED**

---

## 1. Architecture Snapshot

```
Candidate Journey (Find Jobs, Matching, My CV, Profile, Help)
Recruiter Journey (Jobs, Candidates, Ranking, Match Reports, Analytics)
       │
       ▼
Next.js 16.3.3 App Router Frontend (Port 3000)
├── React 19, Turbopack, TailwindCSS
├── ThemeContext (Global dark/light toggle with localStorage persistence)
├── LanguageContext (Global VI/EN dictionary with localStorage persistence)
└── AuthContext (Session persistence, unverified gating, role management)
       │
       ▼ (REST API / JWT Bearer)
Spring Boot 3.3.0 Backend Service (Port 8080)
├── Java 21, Spring Security RBAC, Flyway Migrations
├── MatchingEngineService: Core Score (0.40 Skill + 0.25 Exp + 0.10 Edu + 0.10 Proj + 0.15 Sem)
├── GitHubScoringService: Supporting Score (0.40 Lang + 0.35 Tech + 0.15 Act + 0.10 Rec)
│   └── Zero Penalty Architecture: S_overall = S_core if GitHub is absent/private/failing
└── PostgreSQL 16 + Pgvector DB (Port 5432)
       │
       ▼ (HTTP Microservice)
Python 3.11 FastAPI AI Worker (Port 8000)
├── Multi-Provider Abstraction: Ollama (Default), OpenAI (Benchmarking), Mock (Test-only)
├── LLM: dna5rm/granite4.2:3b-8k (Structured JSON with think: false)
├── Embedding: nomic-embed-text:latest (768 dimensions)
└── GitHub Public Analyzer: Public Repositories, Languages, Recency Signal
```

---

## 2. Current Implementation Status

| Subsystem | Target Specification | Current State | Verification Evidence |
|:---|:---|:---|:---|
| **Branding** | MidCV (Rebranded product identity) | Fully rebranded across UI, modals, metadata, locales | Audited 0 occurrences of legacy branding in user-facing UI |
| **Theme System** | Global Dark/Light mode | Functional in `ThemeContext.tsx`, custom CSS variables in `globals.css` | Sun/Moon toggle active, persistent |
| **Language System** | Global Vietnamese / English switching | Functional in `LanguageContext.tsx`, dictionaries `vi.ts` / `en.ts` | VI/EN toggle active, persistent |
| **AI LLM Runtime** | Local Ollama `dna5rm/granite4.2:3b-8k` | Operational on `http://localhost:11434` with `think: false` | `scripts/ollama_llm_smoke_test.py` (Exit 0) |
| **AI Embedding** | Local Ollama `nomic-embed-text:latest` | Operational, generates real 768-dim vectors | `scripts/ollama_embedding_smoke_test.py` (Exit 0) |
| **Pgvector Schema** | Vector storage (Section 10 policy) | Schema holds `vector(1536)` (V1). Schema preserved pending V2 Flyway migration | Dimension check verified: 768 != 1536, zero destructive DB operations |
| **GitHub Integration** | Public REST API supporting signal | Active, zero-penalty fallback for missing/private/non-IT | 14 test cases in `RealityMatchingManipulationTest` pass |
| **CV Builder & Versioning** | Multi-industry CV builder | Basic save in `builder/page.tsx`, stores versions in client storage | Versioning needs explicit multi-version incrementation (WP-05) |
| **Auth & Security** | Email verification gate, RBAC | Blocks unverified login (HTTP 403), rate-limits resend (60s) | `email-negative-verification.spec.ts` (4/4 pass) |
| **Explainable AI (XAI)** | 3-tier score breakdown, grounded quotes | Detailed evidence in candidate inspection & rankings | Rendered in `/recruiter/jobs/[id]/ranking` and `applications/[id]` |

---

## 3. Baseline Test Status (Pre-Modification Execution Matrix)

| Test Suite | Command | Result | Pass Rate | Execution Time |
|:---|:---|:---:|:---:|:---|
| **Ollama Health Check** | `python scripts/ollama_health_check.py` | **PASS** | 3/3 checks | 5.2s |
| **Ollama Embedding Smoke** | `python scripts/ollama_embedding_smoke_test.py` | **PASS** | 100% | 12.1s (sim(A,B)=0.8430 > sim(A,C)=0.3332) |
| **Ollama LLM Smoke** | `python scripts/ollama_llm_smoke_test.py` | **PASS** | 100% | 83.2s (JD, CV & Anti-mock verified) |
| **AI Worker Unit Tests** | `pytest -v` (in `ai-worker/`) | **PASS** | 30/30 (100%) | 1.03s |
| **Backend Integration Tests** | `mvn test` (in `backend/`) | **PASS** | 78/78 (100%) | 10.5s |
| **Frontend Production Build** | `npm run build` (in `frontend/`) | **PASS** | 17/17 routes | 4.9s (Turbopack) |
| **Playwright E2E Tests** | `npm run test:e2e` (in `frontend/`) | **PASS** | 43/43 (100%) | 1.9m |

---

## 4. Known Risks & Technical Debt
1. **Ollama Hardware Latency**: Granite 4.2 3B inference takes ~20s per extraction on local CPU. `think: false` must remain active to prevent timeout from reasoning tokens.
2. **Pgvector Dimension Discrepancy**: Ollama embedding generates 768 dimensions while database schema `V1__initial_schema.sql` defines 1536 dimensions. As per Section 10 safety guidelines, the schema must NOT be altered or truncated without a planned Flyway migration.
3. **Remember Me Persistence**: `AuthContext.tsx` currently writes user and token to `localStorage` unconditionally on login. True "Remember Me" requires distinguishing persistent `localStorage` (when checked) from session-bound `sessionStorage` (when unchecked) without storing plaintext passwords.
4. **CV Version Immutability**: Currently `builder/page.tsx` overwrites `currentVersionNumber: 1` instead of incrementing versions upon subsequent saves.
5. **Top Navigation Width**: Long Vietnamese labels in `Navbar.tsx` can crowd intermediate viewport widths (1024px - 1280px).

---

## 5. Files Likely To Be Modified (by Work Package)

| Work Package | Focus Area | Candidate Files |
|:---|:---|:---|
| **WP-01** | Global Theme System | `frontend/src/app/globals.css`, `frontend/src/context/ThemeContext.tsx`, route layouts |
| **WP-02** | Global Language System | `frontend/src/context/LanguageContext.tsx`, `frontend/src/locales/vi.ts`, `frontend/src/locales/en.ts` |
| **WP-03** | Navigation / Top Bar UX | `frontend/src/components/layout/Navbar.tsx` |
| **WP-04** | CV Extraction Quality | `ai-worker/app/services/cv_parser.py`, `ai-worker/app/schemas/cv.py` |
| **WP-05** | CV Save + Versioning | `frontend/src/app/candidate/cvs/builder/page.tsx`, `frontend/src/lib/api.ts`, `frontend/src/app/candidate/cvs/page.tsx` |
| **WP-06** | Auth: Logout Confirmation | `frontend/src/components/layout/Navbar.tsx`, `frontend/src/components/auth/LogoutConfirmModal.tsx` |
| **WP-07** | Auth: Remember Me | `frontend/src/components/auth/AuthModal.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/context/AuthContext.tsx` |
| **WP-08 & WP-10** | Research UX & Match Report XAI | `frontend/src/app/jobs/[id]/page.tsx`, `frontend/src/app/recruiter/jobs/[id]/ranking/page.tsx`, `frontend/src/app/recruiter/applications/[id]/page.tsx` |
| **WP-09** | GitHub Supporting Evidence UX | `frontend/src/components/matching/GitHubEvidenceCard.tsx`, candidate detail views |
| **WP-12 & WP-13** | Search/Filter & Skill Normalization | `frontend/src/app/jobs/page.tsx`, `frontend/src/components/common/SkillAutocomplete.tsx` |
| **WP-14** | Quantitative Evaluation | `docs/final/ai-extraction-evaluation.md`, `docs/final/ai-ranking-evaluation.md` |

---

## 6. Files Explicitly Protected from Unnecessary Modification
- `backend/src/main/java/com/platform/recruitment/**` (Namespace, package structure, and existing algorithms must NOT be renamed for branding).
- `backend/src/main/resources/db/migration/V1__initial_schema.sql` (Flyway history must NOT be edited or deleted).
- `backend/src/main/java/com/platform/recruitment/matching/MatchingEngineService.java` (Core scoring formula $S_{\text{core}}$ is frozen).
- `backend/src/main/java/com/platform/recruitment/matching/GitHubScoringService.java` (GitHub supporting formula $S_{\text{github}}$ and zero-penalty logic are frozen).
- `ai-worker/app/evaluation/dataset.json` and `ranking_dataset.json` (Benchmark datasets must NOT be fabricated).
