# Architecture Summary (`docs/final/architecture-summary.md`)

## 1. System Architecture Layers
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

## 2. Technical Stack Specifications
- **Frontend**: Next.js 16.3.3, React 19, TypeScript, TailwindCSS, Lucide React, Playwright E2E.
- **Backend**: Java 21, Spring Boot 3.3.3, Spring Security JWT, Flyway 10, Lombok, Maven.
- **AI Worker**: Python 3.11, FastAPI, Pydantic v2, PyPDF, Docx, Pytest.
- **Database**: PostgreSQL 16 with `pgvector` extension for 1536-dimensional vector search.
