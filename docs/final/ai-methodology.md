# AI Methodology (`docs/final/ai-methodology.md`)

## 1. LLM Document Parsing
- **System Instructions**: Enforces strict JSON schemas demarcating REQUIRED vs PREFERRED requirements and capturing exact text quote snippets for evidence traceability.
- **Prompt Injection Defense**: Untrusted user input (raw CV text or JD description) is wrapped inside `<UNTRUSTED_CONTENT>` tags with explicit system instructions prohibiting execution of embedded commands.

## 2. Skill Normalization Engine
Raw skill strings extracted from documents are mapped to standardized canonical names via alias lookup and text cleaning (e.g., `SpringBoot` $\rightarrow$ `Spring Boot`, `Postgres` $\rightarrow$ `PostgreSQL`, `k8s` $\rightarrow$ `Kubernetes`).

## 3. Vector Embeddings (1536-Dim)
- Text embeddings generated via OpenAI `text-embedding-3-small` (1536 dimensions).
- Persisted centrally in PostgreSQL using the `pgvector` extension with Cosine Similarity search.
