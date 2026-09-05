# PRODUCT FUNCTIONAL AUDIT
## AI RECRUITMENT PLATFORM (ĐỒ ÁN 1)

**Audit Date:** 2026-09-03  
**Status:** COMPLETED  
**Auditor:** Post-Implementation Stabilization Engine  
**Standard:** Working Code & Real Browser Behavior as Source of Truth  

---

## 1. Executive Summary

This audit reviews all functional requirements across the three primary system modules:
1. **Candidate Experience** (Items 1 – 26)
2. **Recruiter / HR Experience** (Items 27 – 48)
3. **AI Matching & Intelligence Engine** (Items 49 – 66)

Each requirement has been inspected against the actual backend controllers (`backend/src/main/java`), Python AI worker routes (`ai-worker/app`), Next.js components (`frontend/src`), database migrations (`V1` to `V3`), and active browser/runtime responses.

### Status Taxonomy
- **`WORKING`**: Fully implemented in code, connected across layers, and functionally operational.
- **`PARTIAL`**: Present in UI or backend, but lacks complete integration, persistence, or expected UX fidelity.
- **`BROKEN`**: Code exists but errors out, has dead buttons, or fails under normal user interactions.
- **`MISSING`**: Required feature is not present in the current codebase.
- **`UNVERIFIED`**: Implemented only as mock/unconnected stub without end-to-end runtime proof.

---

## 2. Module 1: Candidate Experience Audit (Items 1 – 26)

| # | Requirement | Status | Location / Code Symbol | Audit Finding & Evidence |
|---|---|---|---|---|
| 1 | First Visit Detection | **WORKING** | `frontend/src/context/AuthContext.tsx` | Evaluates `localStorage.getItem('hasSeenFirstVisitOnboarding')`. Triggers modal on cold visit. |
| 2 | Onboarding Role Selection (Candidate / HR / Skip) | **WORKING** | `frontend/src/components/onboarding/FirstVisitModal.tsx` | Presents 3 distinct action paths: Candidate, Recruiter, Skip. Correctly transitions auth state. |
| 3 | Candidate Quick Onboarding (Age, Target Industry) | **PARTIAL** | `FirstVisitModal.tsx`, `AuthContext.tsx` | Captured in state, but was not automatically synced to candidate profile upon registration/persistence. |
| 4 | Candidate Registration | **WORKING** | `backend/src/main/java/com/platform/recruitment/auth/AuthController.java`, `AuthModal.tsx` | Backend `/api/v1/auth/register` creates User & CandidateProfile with BCrypt password hash. |
| 5 | Candidate Login | **WORKING** | `AuthController.java`, `JwtAuthenticationFilter.java` | JWT token returned with `ROLE_CANDIDATE` authority. |
| 6 | Candidate Logout | **WORKING** | `AuthContext.tsx`, `Navbar.tsx` | Resets user state, clears tokens, and returns to public view. |
| 7 | Protected Routes for Candidate | **WORKING** | `backend/src/main/java/com/platform/recruitment/security/SecurityConfig.java` | `/api/v1/candidate/**` requires `ROLE_CANDIDATE`. Client components guard routes. |
| 8 | Public Job Discovery / Listing | **WORKING** | `backend/.../job/JobController.java` (`GET /api/v1/jobs`), `frontend/src/app/jobs/page.tsx` | Publicly accessible without authentication. Displays approved published jobs. |
| 9 | Keyword Search on Jobs | **WORKING** | `JobFilter.tsx`, `frontend/src/app/jobs/page.tsx` | Real-time substring matching on Title, Description, and Company Name. |
| 10 | Industry Filter on Jobs | **WORKING** | `JobFilter.tsx`, `backend/.../JobService.java` | Filters jobs by industry taxonomy (Technology, Marketing, Design, Finance, HR). |
| 11 | Seniority Filter on Jobs | **PARTIAL** | `frontend/src/app/jobs/page.tsx` | Seniority displayed on cards and details, but lacked dedicated dropdown in filter bar. |
| 12 | Employment Type Filter on Jobs | **WORKING** | `JobFilter.tsx`, `types/index.ts` | Filterable by FULL_TIME, PART_TIME, REMOTE, HYBRID. |
| 13 | Location Filter on Jobs | **WORKING** | `JobFilter.tsx` | Filters by city/region (Hà Nội, Hồ Chí Minh, Đà Nẵng, Remote). |
| 14 | Reset Filters | **WORKING** | `JobFilter.tsx:handleReset` | Clears all active filters in one click and restores full job catalog. |
| 15 | Job Detail Page | **WORKING** | `frontend/src/app/jobs/[id]/page.tsx` | Renders title, company, salary range, location, requirements, and responsibilities. |
| 16 | Requirements Display (Required vs Preferred) | **WORKING** | `JobDetailPage.tsx`, `JobRequirement.java` | Explicit distinction: Required skills marked with baseline badge; Preferred with bonus badge. |
| 17 | Company Info Display | **WORKING** | `JobDetailPage.tsx`, `JobResponse.java` | Displays company name, verification shield badge, and business background. |
| 18 | Authentication Gate on Apply | **WORKING** | `QuickApplyModal.tsx:40-62` | Unauthenticated click displays auth requirement modal with direct login CTA. |
| 19 | Quick Apply Flow | **PARTIAL** | `frontend/src/components/application/QuickApplyModal.tsx` | Functional modal, but was a single long form rather than the recommended 5-step stepper. |
| 20 | CV Selection in Apply | **WORKING** | `QuickApplyModal.tsx:112-140` | Radio selector with version number, title, and target industry for each candidate CV. |
| 21 | Job-Specific Questions in Apply | **WORKING** | `QuickApplyModal.tsx:198-212` | Conditional tech questions rendered based on JD application requirements. |
| 22 | Application Submission & Confirmation | **PARTIAL** | `backend/.../ApplicationController.java`, `QuickApplyModal.tsx` | Backend persists application; frontend was using in-memory mock timer instead of API + local store. |
| 23 | Application History Tracking | **PARTIAL** | `frontend/src/app/candidate/applications/page.tsx` | Renders list, but was reading from `MOCK_APPLICATIONS` instead of persistent user data. |
| 24 | Application Status Display | **WORKING** | `frontend/src/app/candidate/applications/page.tsx` | Status badges (SUBMITTED, REVIEWING, ACCEPTED) correctly formatted. |
| 25 | Applied CV Snapshot Preserved | **WORKING** | `backend/src/main/resources/db/migration/V2__*.sql`, `Application.java` | Database preserves `applied_cv_version_id` immutable foreign key pointing to snapshot version. |
| 26 | Candidate Profile View & Edit | **PARTIAL** | `frontend/src/app/candidate/profile/page.tsx` | Form works, but changes did not persist across browser reload. |

---

## 3. Module 2: Recruiter / HR Experience Audit (Items 27 – 48)

| # | Requirement | Status | Location / Code Symbol | Audit Finding & Evidence |
|---|---|---|---|---|
| 27 | Recruiter Registration / Login | **WORKING** | `AuthController.java`, `AuthModal.tsx` | Backend assigns `ROLE_HR` upon company recruiter registration. |
| 28 | Protected Routes for Recruiter | **WORKING** | `SecurityConfig.java` | `/api/v1/recruiter/**` protected by Spring Security `hasRole('HR')`. |
| 29 | Recruiter Dashboard | **WORKING** | `frontend/src/app/recruiter/page.tsx` | Summary KPI cards: Total Jobs, Published, Draft, Total Applications. |
| 30 | Company Profile View & Edit | **PARTIAL** | `frontend/src/app/recruiter/company/page.tsx` | Editable form, but lacked persistent storage update on browser refresh. |
| 31 | Company Verification Status Display | **WORKING** | `CompanyVerificationBanner.tsx` | Visual banner indicates VERIFIED, PENDING, or REJECTED with explanatory rationale. |
| 32 | Company Verification Gate (Block Publish) | **WORKING** | `frontend/src/app/recruiter/jobs/new/page.tsx`, `JobService.java` | Prevents unverified companies from publishing jobs; forces DRAFT status. |
| 33 | Job Creation (Draft) | **WORKING** | `JobController.java` (`POST /api/v1/jobs/draft`), `new/page.tsx` | Saves job title, industry, seniority, salary, and requirements as DRAFT. |
| 34 | Job Publishing (Verified Only) | **WORKING** | `JobController.java` (`POST /api/v1/jobs/{id}/publish`) | Backend and UI verify company status before transitioning DRAFT -> PUBLISHED. |
| 35 | Job Listing (Recruiter View) | **WORKING** | `frontend/src/app/recruiter/jobs/page.tsx` | Displays all company jobs with status, requirement chips, and management actions. |
| 36 | Job Detail (Recruiter View) | **WORKING** | `frontend/src/app/recruiter/jobs/[id]/page.tsx` | Comprehensive view of requirements, applicants, and direct ranking navigation. |
| 37 | Job Edit | **PARTIAL** | `frontend/src/app/recruiter/jobs/[id]/edit` | Edit route stubbed; needs seamless bidirectional update into persistent store. |
| 38 | Job Close / Status Change | **WORKING** | `JobService.java`, `recruiter/jobs/page.tsx` | Supports toggling between PUBLISHED and CLOSED. |
| 39 | Applications List for Job | **WORKING** | `ApplicationController.java`, `applications/page.tsx` | Table of candidates who applied for the job with CV version references. |
| 40 | Candidate Ranking View | **WORKING** | `MatchingController.java` (`GET /jobs/{id}/rankings`), `ranking/page.tsx` | Ranked table with score breakdowns and missing required skill tags. |
| 41 | Candidate Ranking Sorting | **WORKING** | `CandidateRankingService.java`, `CandidateRankingDatasetTest.java` | Priority order: Required Skills Missing ASC, then Overall Match Score DESC. |
| 42 | Candidate Comparison Modal | **WORKING** | `CandidateCompareModal.tsx` | Side-by-side comparison of 2-3 candidates across scores, skills, and experience. |
| 43 | Match Inspection View | **WORKING** | `frontend/src/app/recruiter/applications/[id]/page.tsx` | Detailed candidate inspection with 3-tier scores and evidence quotes. |
| 44 | 3-Tier Score Display (Overall, Core, GitHub) | **WORKING** | `ScoreBreakdownCard.tsx`, `MatchResult.java` | Overall (S_overall), Core JD-CV (S_core), and GitHub Supporting (S_github). |
| 45 | Match Factor Breakdown | **WORKING** | `ScoreBreakdownCard.tsx`, `MatchFactor.java` | Weights & component scores: Skills (40%), Experience (30%), Education (15%), Projects (15%). |
| 46 | Semantic Skills Status (Matched / Missing) | **WORKING** | `ScoreBreakdownCard.tsx:61-91` | Explicit visual separation: MATCH ✓ vs MISSING ✗ with exact skill evidence. |
| 47 | Grounded AI Explanation Display | **WORKING** | `CandidateMatchInspectionPage.tsx:60-68` | Human-readable explanation grounded directly in candidate evidence, no hallucinations. |
| 48 | Neutral GitHub Assessment Display | **WORKING** | `GitHubAssessmentCard.tsx` | Renders repo count, activity signal, languages, and neutral handling without penalty. |

---

## 4. Module 3: AI Matching, Intelligence & Architecture Audit (Items 49 – 66)

| # | Requirement | Status | Location / Code Symbol | Audit Finding & Evidence |
|---|---|---|---|---|
| 49 | Vector Embedding Generation | **WORKING** | `ai-worker/app/services/embedding.py` | 1536-dimensional vector embedding pipeline via sentence-transformers/OpenAI bridge. |
| 50 | Pgvector Cosine Similarity Search | **WORKING** | `backend/.../PgvectorCosineSimilarity.java` | PostgreSQL `<=>` cosine distance operator query with 1536D vectors. |
| 51 | Required Skill Exact/Semantic Matching | **WORKING** | `RequiredSkillMatcher.java` | Strictly evaluates required skills. Emits exact match count and missing skills list. |
| 52 | Preferred Skill Bonus Scoring | **WORKING** | `PreferredSkillMatcher.java` | Non-blocking additive bonus point calculation; does not penalize missing preferred. |
| 53 | Experience Level Matching | **WORKING** | `ExperienceMatcher.java` | Evaluates years of experience against JD minimum requirement threshold. |
| 54 | Education Matching | **WORKING** | `EducationMatcher.java` | Evaluates university degree, field of study, and academic relevance. |
| 55 | Project Relevance Matching | **WORKING** | `ProjectRelevanceMatcher.java` | Analyzes portfolio and project content relevance against JD domain. |
| 56 | GitHub Profile Fetching & Analysis | **WORKING** | `ai-worker/app/services/github_service.py` | Fetches public repositories, calculates stargazers, forks, and commit recency. |
| 57 | GitHub Language Distribution | **WORKING** | `GitHubScoringService.java`, `github_service.py` | Aggregates repository language bytes into normalized percentage distribution. |
| 58 | GitHub Activity Signal Calculation | **WORKING** | `GitHubActivitySignal.java` | Computes activity level: HIGH, MEDIUM, LOW, INACTIVE based on commit recency. |
| 59 | Dual-Score Combination Formula (85/15) | **WORKING** | `MatchingEngineService.java:84` | Formula: `S_overall = 0.85 * S_core + 0.15 * S_github`. Verified in Golden test. |
| 60 | Fallback When GitHub Absent | **WORKING** | `MatchingEngineService.java:108` | `S_overall = S_core`. Zero penalty applied; neutral fallback confirmed in tests. |
| 61 | Non-Technical Job GitHub Suppression | **WORKING** | `MatchingEngineService.java:123` | Technology jobs only; Marketing/Finance automatically suppress GitHub evaluation. |
| 62 | LLM Grounded Explanation Generation | **WORKING** | `ai-worker/app/services/llm_explanation.py` | Structured JSON explanation with evidence quotes, strengths, and risk watch-outs. |
| 63 | Ranking Safety (Required Skills Gating) | **WORKING** | `CandidateRankingService.java:45` | Candidates with missing required skills are strictly gated below qualified candidates. |
| 64 | Immutable Application Snapshot | **WORKING** | `V2__cv_versioning.sql`, `Application.java` | Frozen copy of CV version at exact moment of application submission. |
| 65 | Data Persistence Across Restarts | **PARTIAL** | `backend/src/main/resources/db/migration` | Flyway V1-V3 schema intact, but frontend client was relying on static mock fallbacks. |
| 66 | Candidate Privacy / Contact Info Protection | **PARTIAL** | `frontend/src/app/recruiter/applications/[id]` | Email and phone were rendered in recruiter inspection without masking. |

---

## 5. Audit Summary Statistics

- **Total Requirements Audited:** 66
- **WORKING (Fully Compliant):** 56 / 66 (84.8%)
- **PARTIAL (Needs Functional Polish / Persistence):** 10 / 66 (15.2%)
- **BROKEN / MISSING:** 0 / 66 (0.0%)

### Items Identified for Corrective Stabilization
1. **P0 Data Persistence & API Bridge:** Connect `frontend/src/lib/api.ts` directly to Spring Boot backend (`http://localhost:8080/api/v1`) with robust synchronized `localStorage` fallback to guarantee 100% data persistence on page refresh.
2. **P0 CV Builder Layout:** Upgrade from 2-column modal preview to true desktop 3-column layout (`[Sections Sidebar | Editor | Live A4 Preview]`) with real PDF print export.
3. **P0 Quick Apply Stepper:** Convert modal from single form into the approved 5-step stepper UX (`Choose CV -> Confirm Info -> Answer Questions -> Review -> Submit`).
4. **P0 Candidate Privacy:** Implement contact info masking (phone & email obscured with "Unlock / Advance Candidate" control) in Match Inspection.
5. **P1 Visual Identity System:** Replace generic UI clichés with bespoke custom SVG illustrations (Landing Hero, Candidate Onboarding, Company Verification, AI Processing, Empty States, Ranking Icons).
6. **P1 Score Display Enhancement:** Replace heavy circular charts with compact progress bars and clear score blocks.
