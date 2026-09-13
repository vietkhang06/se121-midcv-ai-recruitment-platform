# MidCV — Controlled Implementation Traceability Matrix

> **Traceability Standard**: Requirement ID → Code Files → Implementation → Test Case → Result → Evidence → Status  
> **Status Values**: `NOT_STARTED` | `IN_PROGRESS` | `BLOCKED` | `PASSED` | `FAILED` | `DEFERRED`  
> **Last Updated**: September 7, 2026 (WP-03 Navigation / Top Bar UX Checkpoint)

---

| ID | Requirement | Files | Implementation | Test | Result | Evidence | Status |
|:---|:---|:---|:---|:---|:---:|:---|:---:|
| **WP-00** | Controlled Baseline Audit & Test Matrix | `docs/final/controlled-baseline-audit.md` | Recorded baseline git status, build, test results | Smoke, unit, E2E suite | PASSED | 30/30 AI, 78/78 Backend, 43/43 E2E | **PASSED** |
| **THEME-01** | Global Light mode consistency across all major routes | `globals.css`, `ThemeContext.tsx`, layout anti-flash script | Standardize tokens & enforce light theme on all routes | Route navigation test | PASSED | 5/5 Playwright theme-sync, 43/43 E2E | **PASSED** |
| **THEME-02** | Global Dark mode consistency across all major routes | `globals.css`, `ThemeContext.tsx`, all 17 routes | Standardize tokens & enforce dark theme on all routes | Route navigation test | PASSED | 5/5 Playwright theme-sync, 43/43 E2E | **PASSED** |
| **THEME-03** | Theme persistence across page reloads | `ThemeContext.tsx`, `layout.tsx` inline script | Local storage theme restoration without flash | Reload test | PASSED | 5/5 Playwright theme-sync, 43/43 E2E | **PASSED** |
| **THEME-04** | Modal theme consistency in both modes | `AuthModal.tsx`, `QuickApplyModal.tsx` | Match modal surfaces with active theme tokens | Modal open test | PASSED | 5/5 Playwright theme-sync, 43/43 E2E | **PASSED** |
| **THEME-05** | Zero route theme reversion | All 17 page & layout components | Remove conflicting hardcoded background styles & ensure coordinated surface tokens | Route audit test | PASSED | 5/5 Playwright theme-sync, 43/43 E2E | **PASSED** |
| **LANG-01** | Vietnamese language consistency across all routes | `LanguageContext.tsx`, `vi.ts` | Complete translation dictionary for all routes | VI route audit | PASSED | 6/6 language-sync, 54/54 full E2E | **PASSED** |
| **LANG-02** | English language consistency across all routes | `LanguageContext.tsx`, `en.ts` | Complete translation dictionary for all routes | EN route audit | PASSED | 6/6 language-sync, 54/54 full E2E | **PASSED** |
| **LANG-03** | Language persistence across reload | `LanguageContext.tsx`, local storage | Restore selected locale on reload & toggle via UI | Reload test | PASSED | 6/6 language-sync, 54/54 full E2E | **PASSED** |
| **LANG-04** | Modal language consistency | `QuickApplyModal.tsx`, `CVUploadModal.tsx`, `AuthModal.tsx` | Centralize translation strings in modals | Modal open test | PASSED | 6/6 language-sync, 54/54 full E2E | **PASSED** |
| **LANG-05** | Logout confirmation dialog language | `LogoutConfirmModal.tsx`, `Navbar.tsx` | Bilingual logout prompt with localized confirm/cancel | Dialog test | PASSED | 6/6 language-sync, 54/54 full E2E | **PASSED** |
| **LANG-06** | CV extraction UI language | `CVUploadModal.tsx`, `vi.ts`, `en.ts` | Bilingual pipeline status & form labels | Extraction UI test | PASSED | 6/6 language-sync, 54/54 full E2E | **PASSED** |
| **NAV-01** | Responsive candidate & recruiter navigation | `Navbar.tsx`, `RecruiterNavbar.tsx`, `recruiter/layout.tsx` | Prioritized tabs, responsive collapse, zero duplicate navbar, active states | Viewport audit (1280px, 1024px, 768px, 375px) | PASSED | 6/6 nav-responsive, 60/60 full E2E | **PASSED** |
| **CV-01** | High-fidelity CV extraction schema | `cv_parser.py`, `cv.py`, `llm_client.py` | Granular structured JSON extraction (Identity, Skills, Exp, Edu, Proj, Lang) | `test_cv_non_fabrication.py` | PASSED | 5/5 non-fabrication, 35/35 AI worker | **PASSED** |
| **CV-02** | Non-fabrication guarantee | `cv_parser.py`, `llm_client.py` | Strict anti-hallucination prompt + verbatim substring guarantee + zero phantom entities | Sparse CV test, Evidence substring test | PASSED | 5/5 non-fabrication, 35/35 AI worker | **PASSED** |
| **CVVER-01** | Immutable CV version creation & save | `builder/page.tsx`, `candidate/cvs/page.tsx`, `api.ts` | Auto-increment versioning upon save, immutable snapshot archival, version history modal | `cv-versioning.spec.ts` | PASSED | 6/6 versioning, 66/66 full E2E | **PASSED** |
| **AUTH-LOGOUT-01**| Accidental logout prevention modal | `LogoutConfirmModal.tsx`, `Navbar.tsx` | Confirm dialog before clearing session | Click logout test | PASSED | 6/6 language-sync, 54/54 full E2E | **PASSED** |
| **AUTH-RM-01** | Secure "Remember Me" authentication | `AuthModal.tsx`, `login/page.tsx`, `AuthContext.tsx` | Persistent localStorage vs session-scoped sessionStorage, zero plaintext password | Session restart test | NOT_STARTED | Pending WP-07 | **NOT_STARTED** |
| **MATCH-01** | Research-centered candidate match UX | `jobs/[id]/page.tsx`, `applications/page.tsx` | Display Core (88%) + GitHub supporting signal breakdown | UI verification | NOT_STARTED | Pending WP-08 | **NOT_STARTED** |
| **MATCH-02** | Insufficient data graceful notice | Candidate match views | Render INSUFFICIENT_DATA badge + guidance, zero fake 0% score | Zero-CV candidate test | NOT_STARTED | Pending WP-08 | **NOT_STARTED** |
| **GITHUB-01** | GitHub supporting evidence breakdown | `GitHubEvidenceCard.tsx` | Languages observed, relevant repos, public activity signal | IT job detail test | NOT_STARTED | Pending WP-09 | **NOT_STARTED** |
| **GITHUB-02** | Zero-penalty fallback handling | `GitHubScoringService.java` | S_overall = S_core for missing/private/API failure | Reality matching test | PASSED | RealityMatchingManipulationTest | **PASSED** |
| **XAI-01** | Recruiter Explainable AI decision support | `ranking/page.tsx`, `applications/[id]/page.tsx` | Matched vs Missing required skills, relevant experience quote | Match report audit | NOT_STARTED | Pending WP-10 | **NOT_STARTED** |
| **EVAL-01** | Quantitative AI model evaluation (P/R/F1, NDCG@K) | `eval_runner.py`, `dataset.json` | Measured empirical extraction & ranking metrics | `eval_runner.py` run | PASSED | Precision 71.88%, Recall 100%, F1 83.64%, NDCG@3 1.0 | **PASSED** |
