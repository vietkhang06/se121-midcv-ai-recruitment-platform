# MatchJD — AI Provider Architecture

## 1. System Architecture
```
Next.js Frontend (MatchJD)
       ↓
Spring Boot Backend (API Gateway & Matching Coordinator)
       ↓
Python AI Worker (FastAPI Microservice)
       ↓
Provider Abstraction Layer (LLMClient & OllamaEmbeddingService)
  ├── OLLAMA (Default: dna5rm/granite4.2:3b-8k & nomic-embed-text:latest)
  ├── OPENAI (Benchmark / fallback configuration)
  └── MOCK   (Explicit test mode only via USE_MOCK_LLM=true)
```

## 2. Abstraction Design
- `LLMClient`: Configurable via `AI_PROVIDER` (`ollama`, `openai`, `mock`).
  - Implements bounded retries with exponential backoff.
  - Formats requests for structured JSON parsing (`format="json"`).
  - Handles reasoning models (e.g. `thinking` output) with multi-stage JSON extraction.
  - Strict non-mock guarantee when `use_mock=False`.
- `OllamaEmbeddingService`:
  - Generates 768-dimensional normalized dense vectors.
  - Implements cosine similarity calculation for offline or in-memory semantic scoring.

## 3. GitHub Analysis Independence
GitHub repository, language distribution, and recency analysis remain completely independent of the LLM provider:
```
Candidate GitHub URL
       ↓
GitHub REST API
       ↓
Public Repositories & Languages Distribution
       ↓
Recent Activity Signal & Relevance Analysis
       ↓
Evidence Breakdown (Supporting Score, zero-penalty fallback)
```
Ollama is never used as a proxy for GitHub API.
