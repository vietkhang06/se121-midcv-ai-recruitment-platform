# MidCV — Work Package WP-02 Checkpoint Report: Global Language System

> **Work Package**: WP-02 — Global Language System (Vietnamese / English)  
> **Status**: **100% COMPLETED AND VERIFIED**  
> **Date**: September 7, 2026  
> **Traceability Standard**: Requirement ID → Source Code → Test Suite → Execution Output → Verdict  

---

## 1. Executive Summary

Work Package WP-02 establishes a unified, centralized, bilingual localization architecture (Vietnamese / English) across MidCV:
1. **Single Source of Truth**: All user-facing strings are consolidated into dictionary objects in `frontend/src/locales/vi.ts` and `frontend/src/locales/en.ts`, accessed via `LanguageContext.tsx` (`useLanguage()` hook with fallback safety).
2. **Persistence**: Locale preferences persist across full browser refreshes and tab navigations via `localStorage.getItem('midcv_lang')`.
3. **Interactive Switching**: Both Candidate Navbar (`Navbar.tsx`) and Recruiter Portal Navbar (`RecruiterNavbar.tsx`) feature one-click locale toggle buttons (`VI` / `EN`).
4. **Modal & Form Localization**: Modals (`QuickApplyModal.tsx`, `CVUploadModal.tsx`, `LogoutConfirmModal.tsx`, `AuthModal.tsx`) utilize dynamic dictionary keys rather than hardcoded copy.
5. **Logout Confirmation (Accidental Logout Protection)**: Implemented `LogoutConfirmModal.tsx` preventing accidental session terminations, with bilingual prompts in accordance with `LANG-05` and `AUTH-LOGOUT-01`.

---

## 2. Requirements & Verification Matrix

| Requirement ID | Specification | Code Implementation | Verification Test | Verdict |
|:---|:---|:---|:---|:---:|
| **LANG-01** | Global Vietnamese consistency across routes | `LanguageContext.tsx`, `vi.ts` | `e2e/language-sync.spec.ts:19` | **PASSED** |
| **LANG-02** | Global English consistency across routes | `LanguageContext.tsx`, `en.ts` | `e2e/language-sync.spec.ts:42` | **PASSED** |
| **LANG-03** | Language persistence across reload & UI toggle | `LanguageContext.tsx`, local storage | `e2e/language-sync.spec.ts:65` | **PASSED** |
| **LANG-04** | Modal language consistency | `QuickApplyModal.tsx`, `CVUploadModal.tsx` | `e2e/language-sync.spec.ts:88` | **PASSED** |
| **LANG-05** | Logout confirmation dialog language | `LogoutConfirmModal.tsx`, `Navbar.tsx` | `e2e/language-sync.spec.ts:104` | **PASSED** |
| **LANG-06** | CV extraction UI language | `CVUploadModal.tsx`, `vi.ts`, `en.ts` | `e2e/language-sync.spec.ts:132` | **PASSED** |
| **AUTH-LOGOUT-01**| Accidental logout prevention modal | `LogoutConfirmModal.tsx`, `Navbar.tsx` | `e2e/auth-verification.spec.ts:225` | **PASSED** |

---

## 3. Key Code Modifications

### 3.1. Dictionaries: `frontend/src/locales/vi.ts` & `frontend/src/locales/en.ts`
- Consolidated 10 functional modules:
  - `nav`: Core candidate navigation, roles, theme & lang toggles.
  - `recruiterNav`: Recruiter dashboard, job postings, company profile, verification tags.
  - `auth`: Credentials, validation errors, password strength, remember me, roles.
  - `logoutModal`: Confirm sign-out title, body text, cancel and confirm actions.
  - `verifyEmail`: Token verification states, errors, resend cooldown.
  - `jobs`: Catalog headers, filter criteria, threshold levels, zero-result guidance.
  - `candidatePages`: CV library, CV builder studio, candidate profile, target roles.
  - `cvUpload`: AI parsing pipeline statuses (`UPLOADING`, `QUEUED`, `PROCESSING`, `COMPLETED`, `REVIEW`, `FAILED`), synonym normalization notices, skill review.
  - `quickApply`: 3-step application workflow, review grid, submission notices.
  - `match`: 3-tier scoring, grounded evidence explanation, missing skills, GitHub signals, zero-penalty fallback disclaimer.
  - `common`: Universal actions (`save`, `cancel`, `edit`, `delete`, `close`, `retry`, `back`).

### 3.2. Top Navigation Bars
- `frontend/src/components/layout/Navbar.tsx`:
  - Added bilingual `Features` (`t('nav.features')`) and `For Employers` (`t('nav.forEmployers')`).
  - Replaced hardcoded `aria-label="Đăng xuất"` with dynamic `aria-label={t('nav.signOut')}`.
  - Integrated `LogoutConfirmModal` before session termination.
- `frontend/src/components/recruiter/RecruiterNavbar.tsx`:
  - Integrated `useLanguage()` and `useTheme()`.
  - Added language toggle button (`VI` / `EN`) and theme toggle button (`Light` / `Dark`) to HR Portal header.
  - Localized portal links: Dashboard, Company Profile, Job Postings, Create Job, Back to Candidate Portal.

### 3.3. Modals & Candidate Components
- `frontend/src/components/auth/LogoutConfirmModal.tsx`:
  - Created bilingual dialog with Escape key listener, backdrop blur, accessible keyboard navigation, and theme coordination.
- `frontend/src/components/cv/CVUploadModal.tsx`:
  - Localized all pipeline step indicators, upload dropzone hints, review fields, and failure retry buttons.
  - Added Escape key handler and deterministic `#close-cv-upload-modal-btn`.
- `frontend/src/components/application/QuickApplyModal.tsx`:
  - Localized step headers, action buttons, submission feedback while retaining accessible test locators.
- `frontend/src/app/candidate/cvs/page.tsx`:
  - Localized title, upload button, create button, card action links with deterministic `#upload-cv-btn`.

---

## 4. Test Execution Evidence

### 4.1. TypeScript Compilation & Production Build
```
> frontend@0.1.0 build
> next build

▲ Next.js 16.3.3 (Turbopack)
✓ Running next.config.ts took 51ms
  Creating an optimized production build ...
✓ Compiled successfully in 1622ms
  Running TypeScript ...
  Finished TypeScript in 5.2s ...
✓ Generating static pages using 15 workers (17/17) in 745ms
Exit code: 0
```

### 4.2. Work Package WP-02 Playwright Test Suite
Command: `npx playwright test e2e/language-sync.spec.ts`
```
Running 6 tests using 1 worker

  ok 1 [chromium-desktop] › e2e\language-sync.spec.ts:19:7 › WP-02: Global Language Synchronization Suite (LANG-01 - LANG-06) › LANG-01: Vietnamese language consistency across major routes (2.2s)
  ok 2 [chromium-desktop] › e2e\language-sync.spec.ts:42:7 › WP-02: Global Language Synchronization Suite (LANG-01 - LANG-06) › LANG-02: English language consistency across major routes (2.2s)
  ok 3 [chromium-desktop] › e2e\language-sync.spec.ts:65:7 › WP-02: Global Language Synchronization Suite (LANG-01 - LANG-06) › LANG-03: Language persistence across page reload (1.7s)
  ok 4 [chromium-desktop] › e2e\language-sync.spec.ts:88:7 › WP-02: Global Language Synchronization Suite (LANG-01 - LANG-06) › LANG-04: Modal language consistency in both locales (829ms)
  ok 5 [chromium-desktop] › e2e\language-sync.spec.ts:104:7 › WP-02: Global Language Synchronization Suite (LANG-01 - LANG-06) › LANG-05: Logout confirmation dialog language (1.6s)
  ok 6 [chromium-desktop] › e2e\language-sync.spec.ts:132:7 › WP-02: Global Language Synchronization Suite (LANG-01 - LANG-06) › LANG-06: CV extraction UI language (CVUploadModal) (1.5s)

  6 passed (16.7s)
```

### 4.3. Comprehensive E2E Regression Suite
Command: `npm run test:e2e`
```
Running 54 tests using 1 worker
...
  54 passed (2.0m)
```
- Total test cases executed: **54**
- Total test cases passed: **54** (100% pass rate)
- Regressions detected: **0**
