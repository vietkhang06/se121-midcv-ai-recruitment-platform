# MatchJD — AI Recruitment Platform

Nền tảng tuyển dụng thông minh **MatchJD** hỗ trợ đối sánh JD và hồ sơ ứng viên bằng **Vector Embedding (Pgvector)** và **LLM Document Parsing** (hỗ trợ cả Ollama local và OpenAI).

---

## 1. Project Overview
**MatchJD** automates the recruitment pipeline by extracting structured requirements from Job Descriptions (JDs), parsing candidate Resumes/CVs into canonical profiles, generating vector embeddings, computing 3-tier match scores, and ranking applicants with transparent quote-based evidence and developer GitHub profile activity analysis.

---

## 2. Problem Statement
Traditional ATS platforms rely on naive keyword matching, leading to high false-positive rates, high screening latency for HR teams, unstandardized skill names (e.g., `SpringBoot` vs `Spring Boot`), and lack of objective evidence traceability. This platform solves semantic ambiguity using vector search, enforces mandatory required skill gating, and provides line-by-line evidence justification.

---

## 3. Main Features
- **Candidate Journey**: First-visit onboarding, public job discovery, interactive multi-industry CV builder (Technology, Marketing, Finance, Design), PDF export, CV library, and JD-aware quick application.
- **HR Recruiter Journey**: Company registration & verification, job posting management, AI candidate ranking engine, 3-tier score breakdown, line-by-line quote evidence inspection, and neutral GitHub assessment.
- **AI Core Processing**: LLM JD requirement extraction, LLM CV profile parsing, skill normalization, 1536-dim vector embedding generation (Pgvector), 3-tier matching engine, candidate ranking, and GitHub repository activity analysis.

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Next.js 16 (App Router + TailwindCSS)              │
└────────────────────────────────┬────────────────────────────────┘
                                 │ REST API / JWT
┌────────────────────────────────▼────────────────────────────────┐
│           Java 21 Spring Boot Backend Service (Port 8080)       │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTTP API                        │ JPA / Pgvector
┌───────────────▼───────────────┐ ┌───────────────▼───────────────┐
│ Python 3.11 AI Worker Service │ │ PostgreSQL 16 + Pgvector DB   │
│ (FastAPI, Port 8000)          │ │ (Port 5432)                   │
└───────────────────────────────┘ └───────────────────────────────┘
```

---

## 5. Technology Stack
- **Frontend**: Next.js 16.3.3, React 19, TypeScript, TailwindCSS, Lucide React, Playwright E2E.
- **Backend**: Java 21, Spring Boot 3.3.3, Spring Security JWT, Flyway Migration 10, Maven.
- **AI Worker**: Python 3.11, FastAPI, Pydantic v2, PyPDF, Docx, Pytest.
- **Database**: PostgreSQL 16 with `pgvector` extension for 1536-dim vector search.

---

## 6. Repository Structure
```
ai-recruitment-platform/
├── start-dev.bat       # One-Click Local Development Launcher
├── stop-dev.bat        # One-Click Stop Local Services
├── status-dev.bat      # One-Click Status Check
├── reset-db-dev.bat    # One-Click Safe Database Reset (Requires Y/N)
├── scripts/            # PowerShell Dev Scripts (start-dev.ps1, etc.)
├── backend/            # Java 21 Spring Boot Backend API
├── frontend/           # Next.js 16 App Router Frontend & Playwright E2E
├── ai-worker/          # Python 3.11 FastAPI AI Worker Engine
├── docs/               # Technical Documentation & Evaluation Reports
│   ├── evaluation/     # Phase 7 Evaluation Reports (9 Files)
│   └── final/          # Phase 8 Final Project Materials (17 Files)
├── docker-compose.yml  # PostgreSQL + Pgvector Docker Configuration
├── .env.example        # Environment Variables Template
└── README.md           # Master Documentation
```

---

## 7. Quick Start

### One-Click Local Development (Windows)
Double-click `start-dev.bat` in the project root directory.

The launcher automatically validates environment prerequisites (Docker Desktop, Java 21, Maven, Python, Node), starts PostgreSQL + Pgvector, opens dedicated terminal windows for Spring Boot Backend, Python AI Worker, and Next.js Frontend, waits for readiness health checks, and opens `http://localhost:3000` in your browser.

- **Start System**: Double-click `start-dev.bat`
- **Check Status**: Double-click `status-dev.bat`
- **Stop System**: Double-click `stop-dev.bat`
- **Reset Database**: Double-click `reset-db-dev.bat` (Prompts `Y/N` confirmation)

---

## 8. Environment Variables
Key variables in `.env.example`:
- `DATABASE_URL`: `jdbc:postgresql://localhost:5432/airecruit_db`
- `JWT_SECRET`: Base64 encoded secret string (>= 256 bits)
- `OPENAI_API_KEY`: OpenAI API Key (or use `USE_MOCK_LLM=true` for mock mode)
- `PORT_FRONTEND`: `3000`, `PORT_BACKEND`: `8080`, `PORT_AI_SERVICE`: `8000` (`http://localhost:8000/internal/ai/health`)

---

## 9. Docker Setup
```bash
docker compose up -d
docker compose ps
```

---

## 10. Backend Setup
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

---

## 11. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 12. AI Worker Setup
```bash
cd ai-worker
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

---

## 13. Database Setup
Database migrations run automatically via **Flyway** on backend startup. To safely reset local database:
- Double-click `reset-db-dev.bat` (or manually run `docker compose down -v && docker compose up -d`).

---

## 14. Testing
- **Backend Tests**: `cd backend && mvn test` (39 / 39 Passed)
- **AI Worker Tests**: `cd ai-worker && pytest` (17 / 17 Passed)
- **Frontend Production Build**: `cd frontend && npm run build` (Compiled 0 Errors)

---

## 15. E2E Testing
```bash
cd frontend
npx playwright test
```
(11 / 11 Browser Integration Tests Passed).

---

## 16. AI Evaluation
Empirical benchmark results documented in [`docs/evaluation/`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/evaluation/):
- **JD Extraction F1-Score**: 95.1%
- **CV Extraction F1-Score**: 94.5%
- **Skill Normalization Accuracy**: 98.2%
- **Precision@1**: 1.0 (100%) | **Precision@3**: 1.0 (100%) | **NDCG@5**: 0.962

---

## 17. Matching & Ranking
The 3-tier matching engine calculates:
$$S_{\text{core}} = 0.40 \cdot S_{\text{skill}} + 0.30 \cdot S_{\text{exp}} + 0.15 \cdot S_{\text{edu}} + 0.15 \cdot S_{\text{proj}}$$
$$S_{\text{overall}} = 0.85 \cdot S_{\text{core}} + 0.15 \cdot S_{\text{github}}$$
Candidates missing mandatory required skills are gated and penalised regardless of bonus preferred skills.

---

## 18. GitHub Analysis
Evaluates developer repositories based on Language Distribution (40%), Tech Evidence (35%), Activity Signal (15%), and Recency (10%). Non-technical positions (Marketing, Finance, Design) or missing profiles fallback to $S_{\text{overall}} = S_{\text{core}}$ without zero penalties.

---

## 19. Security
- Multi-tenant recruiter ownership enforced (`UnauthorizedAccessException` -> HTTP 403).
- Unvalidated file uploads blocked (MIME, size < 10MB, path traversal protection).
- Candidate CV files protected in private directories. Zero committed API keys or secrets in Git.

---

## 20. Known Limitations
- GitHub activity analysis is restricted to public repositories.
- Local development environment benchmark tested on 10-candidate datasets; production at 100,000+ candidates requires distributed IVFFlat/HNSW Pgvector indexes.

---

## 21. Demo Instructions
Follow step-by-step storyline in [`docs/final/demo-scenario.md`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/final/demo-scenario.md) and [`docs/final/local-development.md`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/docs/final/local-development.md). Set `USE_MOCK_LLM=true` and `USE_MOCK_GITHUB=true` for deterministic offline demonstration fallback mode.
