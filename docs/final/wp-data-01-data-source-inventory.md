# WP-DATA-01: Runtime Data Source Inventory & Purification Audit

**Platform**: MatchJD — Evidence-Based AI Recruitment Platform  
**Topic**: "Nền tảng tuyển dụng thông minh hỗ trợ đối sánh ngữ nghĩa JD – CV và xác thực năng lực qua GitHub"  
**Work Package**: WP-DATA-01 Runtime Data Purification & Empty-State Integrity  
**Audit Standard**: Zero Fabricated Records at Runtime • Absence of Data is a Valid State  

---

## 1. Executive Summary

This inventory audits and classifies every data source across MatchJD to enforce strict data integrity:
- **Core Principle**: Real runtime data must come exclusively from genuine runtime data sources (PostgreSQL database, Spring Boot REST API, authenticated user sessions).
- **Rule of Truth**: When the database contains zero runtime records, the UI must look like an authentic, empty production system. No hidden fallbacks, mocks, seed data, or fabricated business records may appear in runtime.
- **Controlled Test Isolation**: Test fixtures and benchmark datasets are strictly isolated to test runners and explicit test setups. They are never silently injected into normal user sessions.

---

## 2. Classification Schema

Every data source in MatchJD is classified into exactly one category:

| Classification | Definition |
|---|---|
| `RUNTIME_DATABASE` | PostgreSQL / Pgvector relational and vector data persisted by Spring Boot services. |
| `RUNTIME_API` | Spring Boot REST endpoints (`/api/v1/...`) and Python AI Worker microservice endpoints. |
| `UI_STATE` | Local component/page React state (`useState`, `useReducer`) managing transient interface interactions. |
| `CACHE` | Client-side memory cache or session-level cache invalidated on refresh or expiration. |
| `DEV_SEED` | Controlled development seed scripts intended exclusively for local development initialization. |
| `TEST_FIXTURE` | Deterministic benchmark datasets and mocks isolated strictly to automated unit/integration tests. |
| `E2E_FIXTURE` | Playwright test scripts, session storage fixtures, and browser init scripts. |
| `MOCK` | Stand-in mock service implementations (e.g., `MockEmailService`). |
| `DEMO_DATA` | Static illustrative UI widgets (e.g., AST parser visualization diagrams) with clear educational intent. |
| `HARDCODED_BUSINESS_DATA` | Fabricated business entities (users, jobs, CVs, rankings, applications) hardcoded into runtime components. |
| `UNKNOWN` | Unclassified or ambiguous data references. |

---

## 3. Data Source Inventory Table

| Source Identifier | File Location | Entity Affected | Type | Runtime Used | Intended Purpose | Action Taken |
|---|---|---|---|---|---|---|
| `SEED_COMPANY` | `frontend/src/lib/api.ts` | Company | `TEST_FIXTURE` | Was default fallback | Deterministic benchmark company | **ISOLATE**: Retain as benchmark fixture for tests; remove as runtime default fallback. |
| `SEED_RECRUITER` | `frontend/src/lib/api.ts` | RecruiterProfile | `TEST_FIXTURE` | Was default fallback | Benchmark recruiter persona | **ISOLATE**: Retain for test suite; unauthenticated recruiter gets clean empty profile. |
| `SEED_JOBS` | `frontend/src/lib/api.ts` | Job | `TEST_FIXTURE` | Was default fallback | Benchmark 8-job evaluation dataset | **ISOLATE**: Export as `BENCHMARK_SEED_JOBS`; `fetchJobs()` runtime defaults to empty `[]`. |
| `SEED_CANDIDATE` | `frontend/src/lib/api.ts` | CandidateProfile | `TEST_FIXTURE` | Was demo fallback | Benchmark candidate persona | **ISOLATE**: Scoped strictly to test sessions; unauthenticated/fresh candidate defaults to empty profile. |
| `SEED_CVS` | `frontend/src/lib/api.ts` | CV, CVVersion | `TEST_FIXTURE` | Was default fallback | Benchmark candidate CVs | **ISOLATE**: Export for testing; `fetchCandidateCVs()` runtime defaults to empty `[]`. |
| `SEED_APPLICATIONS` | `frontend/src/lib/api.ts` | Application | `TEST_FIXTURE` | Was default fallback | Benchmark application records | **ISOLATE**: `fetchCandidateApplications()` runtime defaults to empty `[]`. |
| `SEED_RANKINGS_JOB_01` | `frontend/src/lib/api.ts` | CandidateRankingItem | `TEST_FIXTURE` | Was default fallback | 10-candidate ranking benchmark | **ISOLATE**: `fetchCandidateRankings()` runtime defaults to empty `[]`. |
| `SEED_INSPECTION_APP_001` | `frontend/src/lib/api.ts` | MatchInspectionData | `TEST_FIXTURE` | Was default fallback | Match factor inspection benchmark | **ISOLATE**: `fetchMatchInspection()` returns `null` if record not in DB/storage. |
| Hardcoded Fallback App | `frontend/src/app/candidate/applications/page.tsx` | Application | `HARDCODED_BUSINESS_DATA` | Yes (on empty) | Masked empty state | **REMOVE**: Purge fallback `app-001`; render genuine `EmptyState`. |
| Hardcoded Andrew CVs | `frontend/src/app/candidate/cvs/page.tsx` | CV, Title, Scores | `HARDCODED_BUSINESS_DATA` | Yes | Populated CV library UI | **REMOVE**: Purge hardcoded names, mock 94%/85% scores, mock app counts; render genuine `EmptyState`. |
| Hardcoded Pipeline App | `frontend/src/app/recruiter/jobs/[id]/applications/page.tsx` | Application | `HARDCODED_BUSINESS_DATA` | Yes (on empty) | Masked empty pipeline | **REMOVE**: Purge fallback `app-001`; render genuine pipeline `EmptyState`. |
| Fake Landing KPI Metrics | `frontend/src/app/page.tsx` | Analytics / Metrics | `HARDCODED_BUSINESS_DATA` | Yes | Marketing scale impression | **REPLACE_WITH_API**: Replace fake "320k+", "94.6%", "11 Days", "180+" with transparent architectural statements. |
| Fake Sector Counts | `frontend/src/app/page.tsx` | Analytics / Metrics | `HARDCODED_BUSINESS_DATA` | Yes | Fabricated candidate population | **REMOVE**: Display sector names without fabricated population counts ("1,248 verified"). |
| Hardcoded Testimonial | `frontend/src/app/page.tsx` | Testimonial | `HARDCODED_BUSINESS_DATA` | Yes | Commercial marketing demo | **REMOVE**: Replace with transparent research objective callout. |
| Job API Controller | `backend/.../job/JobController.java` | Job | `RUNTIME_API` | Yes | Spring Boot REST endpoint | **KEEP**: Verified connects to PostgreSQL via `JobService`. |
| Candidate API Controller | `backend/.../candidate/CandidateController.java` | CandidateProfile | `RUNTIME_API` | Yes | Spring Boot REST endpoint | **KEEP**: Verified candidate persistence. |
| CV API Controller | `backend/.../cv/CVController.java` | CV, CVVersion | `RUNTIME_API` | Yes | Spring Boot REST endpoint | **KEEP**: Verified CV persistence with version history. |
| Application Controller | `backend/.../application/ApplicationController.java` | Application | `RUNTIME_API` | Yes | Spring Boot REST endpoint | **KEEP**: Verified application persistence and role isolation. |
| Matching Controller | `backend/.../matching/MatchingController.java` | MatchResult | `RUNTIME_API` | Yes | Spring Boot REST endpoint | **KEEP**: Verified Pgvector and 3-tier scoring algorithm. |
| Flyway Migrations | `backend/.../db/migration/V1..V5.sql` | All Tables | `RUNTIME_DATABASE` | Yes | PostgreSQL schema definitions | **KEEP**: Verified zero initial `INSERT` statements; clean production schema. |
| `MockEmailService` | `backend/.../email/MockEmailService.java` | Email | `MOCK` | Dev/Test only | Logs verification URLs | **KEEP**: Standard development mock service. |
| GitHub Test Fixture | `frontend/e2e/fixtures/github-test-fixture.ts` | GitHubAssessment | `E2E_FIXTURE` | E2E tests only | Injected via `sessionStorage` in tests | **KEEP**: Controlled test fixture isolated strictly to Playwright tests. |

---

## 4. Remediation Directives

1. **DB = Empty → UI = Empty State**:
   - Zero jobs in DB: `/jobs` displays `emptyTitle` ("Chưa có việc làm") and `emptyDescription`.
   - Zero CVs in profile: `/candidate/cvs` displays `emptyTitle` ("Bạn chưa có CV nào") with "Tạo CV" CTA.
   - Zero applications: `/candidate/applications` displays `candidateEmptyTitle` ("Bạn chưa có đơn ứng tuyển nào").
   - Zero candidates for job: `/recruiter/jobs/[id]/ranking` and `/recruiter/jobs/[id]/applications` display `recruiterEmptyTitle` ("Chưa có ứng viên ứng tuyển vào vị trí này").
2. **Filter No-Match Distinction**:
   - When jobs exist in the DB but active filters yield 0 results, the UI MUST display `noMatchTitle` ("Không tìm thấy việc làm phù hợp") with a "Reset All Filters" action.
3. **Absence of Data is Normal Production State**:
   - The UI shall never inject fallback records merely to satisfy aesthetic density.
