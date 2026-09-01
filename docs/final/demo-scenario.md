# Live Demonstration Scenario (`docs/final/demo-scenario.md`)

## 1. Demo Storyline (Concise 3-Part Presentation)

### PART 1 — Candidate Experience
1. **First Visit Onboarding**: User navigates to landing page `http://localhost:3000`, selects "Candidate Journey".
2. **Public Job Search & Filters**: Filters jobs by "Technology" industry, views details of "Senior Java Backend Developer".
3. **CV Builder & Industry Recommendation**: Creates a new CV, chooses the "Technology Template", inputs Java, Spring Boot, PostgreSQL skills, previews real-time PDF template, exports PDF, and saves CV.
4. **JD-Aware Quick Apply**: One-click application attaching active CV version to "Senior Java Backend Developer" job.

### PART 2 — AI Engine Execution
1. **Document Extraction**: AI Worker parses raw JD requirements and candidate CV into structured JSON with quote snippets.
2. **Vector Embedding Search**: Generates 1536-dim vector embeddings and executes Pgvector Cosine Similarity search.
3. **GitHub Signal Assessment**: Fetches public GitHub repositories for `candidate-java`, computing 88.75% GitHub supporting score.
4. **3-Tier Matching & Ranking**: Computes $S_{\text{core}} = 90.75\%$, $S_{\text{overall}} = 90.45\%$, and ranks candidate #1 with 0 missing required skills.

### PART 3 — HR Recruiter Inspection
1. **Recruiter Login & Dashboard**: Log in as verified HR recruiter for FPT Software.
2. **Job Applications & Candidate Ranking**: Open "Senior Java Backend Developer" job $\rightarrow$ View AI Ranked Applicants.
3. **Candidate Inspection & Evidence**: Inspect Candidate #1 $\rightarrow$ View 3-Tier Match Breakdown ($S_{\text{overall}}$, $S_{\text{core}}$, $S_{\text{github}}$), matched skills (`Java`, `Spring Boot`, `PostgreSQL`), line-by-line quote evidence, and neutral GitHub assessment.

## 2. Deterministic Mock Fallback Mode
If external LLM or GitHub APIs are unreachable during live presentation, set `USE_MOCK_LLM=true` and `USE_MOCK_GITHUB=true`. The system will seamlessly fall back to stored deterministic responses without interrupting the live demonstration.
