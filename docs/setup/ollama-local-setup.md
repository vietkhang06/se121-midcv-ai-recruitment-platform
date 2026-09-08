# MatchJD — Local Ollama Setup & Configuration Guide

## 1. Overview
MatchJD provides zero-cost, privacy-first local AI execution for entity extraction (Job Descriptions & CVs) and semantic embedding generation via **Ollama**.

## 2. Prerequisites
- **Ollama** installed on the local system ([https://ollama.com](https://ollama.com))
- System RAM: Minimum 8GB recommended
- Models pulled:
  - LLM: `dna5rm/granite4.2:3b-8k`
  - Embedding: `nomic-embed-text:latest`

## 3. Pulling the Required Models
Run the following commands in terminal / PowerShell:
```bash
# Pull the reasoning LLM (Granite 4.2 3B 8k context)
ollama pull dna5rm/granite4.2:3b-8k

# Pull the vector embedding model (768 dimensions)
ollama pull nomic-embed-text:latest
```

Verify models are installed:
```bash
ollama list
```
Expected output:
```text
NAME                     ID              SIZE      MODIFIED
dna5rm/granite4.2:3b-8k  54498305f639    2.5 GB    ...
nomic-embed-text:latest  0a109f422b47    274 MB    ...
```

## 4. Environment Configuration
In `.env` and `ai-worker/.env`:
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=dna5rm/granite4.2:3b-8k
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:latest
USE_MOCK_LLM=false
```

## 5. Health Check & Smoke Tests
Run verification scripts from the project root:
```bash
# 1. Health check: Server, LLM model, Embedding model
python scripts/ollama_health_check.py

# 2. Embedding smoke test: Semantic similarity verification
python scripts/ollama_embedding_smoke_test.py

# 3. LLM smoke test: Live JD/CV extraction and anti-mock validation
python scripts/ollama_llm_smoke_test.py
```
