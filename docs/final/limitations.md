# System Limitations (`docs/final/limitations.md`)

## 1. Honest Technical & Functional Limitations
1. **Public GitHub Observability**: GitHub activity signals are restricted to *public* repositories. Private commits or enterprise GitHub instances cannot be observed without OAuth scopes.
2. **LLM Output Variability**: While JSON schemas are enforced, variations in underlying LLM provider models (e.g. OpenAI vs local models) may affect minor phrasing in candidate summary notes.
3. **Repository Star/Fork Metric Noise**: Popular open-source repositories or forks do not necessarily reflect individual candidate code quality; therefore, stars and forks carry lower weight (10-15%) compared to direct language ratio matching.
4. **Development Environment Scale**: Current performance tests were executed on local PostgreSQL database instances with 10-candidate benchmark datasets; production environments at 100,000+ candidates require distributed Pgvector indexing (`IVFFlat` or `HNSW`).
