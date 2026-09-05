# FUNCTIONALITY GAP REPORT
## AI RECRUITMENT PLATFORM (ĐỒ ÁN 1)

**Report Date:** 2026-09-03  
**Status:** ACTIONABLE  
**Scope:** Post-Implementation Stabilization & Polish  

---

## 1. Overview & Prioritization Strategy

Following the 66-item functional audit in `docs/final/product-functional-audit.md`, this report details all identified functional gaps, their root causes, and specific resolution plans.

Gaps are categorized into three priority tiers:
- **P0 (Critical / Blockers):** Data persistence, real API bridge, CV builder 3-column architecture, Quick Apply 5-step stepper, candidate privacy masking.
- **P1 (High / Core UX):** Custom bespoke SVG asset system, real PDF print export, seniority filter in job catalog, multi-industry profile sync.
- **P2 (Medium / Polish):** Score visual blocks, micro-interactions, cohesive typography, informative empty states.

---

## 2. Priority 0 (P0) Gaps: Blockers & Core Persistence

### GAP-P0-01: Client-Side State Volatility & Missing Two-Way API/Storage Bridge
- **Component:** `frontend/src/lib/api.ts`, `frontend/src/context/AuthContext.tsx`
- **Current Behavior:** Changes made in UI (saving a CV, editing profile, creating a job, applying for a job) only updated local component memory. When the page was reloaded, all newly created data vanished and reverted to hard-coded mock arrays.
- **Expected Behavior:** Any action (Create/Edit Job, Save CV, Apply to Job, Edit Profile) must persist. On browser refresh, newly submitted applications, created jobs, and custom CVs must remain intact.
- **Root Cause:** `api.ts` returned static `Promise.resolve(MOCK_*)` without querying backend endpoints or reading/writing to browser `localStorage` when working in client/demo mode.
- **Fix Plan:**
  1. Upgrade `frontend/src/lib/api.ts` with a hybrid storage engine: Attempts real `fetch()` to Spring Boot REST endpoints (`http://localhost:8080/api/v1/...`).
  2. Maintain a synchronized, deterministic client-side persistence store (`localStorage` cache) initialized with full rich seed data so that offline/demo sessions persist all user edits, submissions, and creations seamlessly across page reloads.

---

### GAP-P0-02: Flagship CV Builder Layout & Live Preview Architecture
- **Component:** `frontend/src/app/candidate/cvs/builder/page.tsx`
- **Current Behavior:** CV Builder used a 2-column layout where the live preview was hidden behind a modal dialog triggered by an "Eye" button.
- **Expected Behavior:** A 3-column desktop layout (`[Sections Navigation | Content Editor | Live A4 Preview]`) providing immediate real-time visual feedback as the candidate types.
- **Root Cause:** Initial implementation prioritized basic form editing without embedding the preview pane side-by-side in desktop viewports.
- **Fix Plan:**
  1. Refactor `builder/page.tsx` into a 3-column layout:
     - **Left (20%):** Section navigation (Summary, Skills, Experience, Education, Industry-specific, Templates).
     - **Center (45%):** Section content editor with formatting controls and suggestions.
     - **Right (35%):** Live document preview styled like a standard A4 page with dynamic updates.
  2. Implement actual browser print/PDF export via `window.print()` with a specialized CSS print stylesheet (`@media print`) that isolates the A4 CV sheet and hides UI toolbars.

---

### GAP-P0-03: Quick Apply Stepper Experience
- **Component:** `frontend/src/components/application/QuickApplyModal.tsx`
- **Current Behavior:** Quick Apply modal was a single monolithic scrolling form with all inputs displayed at once.
- **Expected Behavior:** A 5-step stepper workflow with progress indicators:
  1. *Step 1: Choose CV* (Select from candidate's CV versions).
  2. *Step 2: Confirm Information* (Salary expectation, Notice period, Portfolio).
  3. *Step 3: Answer Job Questions* (Specific questions formulated in JD).
  4. *Step 4: Review Application* (Complete summary card with snapshot disclosure).
  5. *Step 5: Submission & Confirmation* (Success confirmation with application ID and immutable snapshot guarantee).
- **Root Cause:** Fast prototyping combined all fields into a single `<form>` element.
- **Fix Plan:**
  1. Implement stepper state machine (`currentStep: 1 | 2 | 3 | 4 | 5`) with visual step pills and back/next navigation.
  2. Persist submitted application into the persistent store and trigger a toast notification.

---

### GAP-P0-04: Candidate Contact Information Privacy in Match Inspection
- **Component:** `frontend/src/app/recruiter/applications/[id]/page.tsx`
- **Current Behavior:** Candidate's email and phone number were directly displayed in the recruiter inspection screen.
- **Expected Behavior:** Contact details must be masked (e.g., `n***@example.com`, `098***789`) until the recruiter explicitly clicks "Mở khóa Liên hệ / Advance Candidate" to simulate enterprise recruitment compliance.
- **Root Cause:** Lack of contact privacy masking guard in the initial UI template.
- **Fix Plan:**
  1. Add a privacy state toggle (`isContactUnlocked: boolean`).
  2. Render masked email/phone by default with a clear "Mở khóa thông tin ứng viên" button that logs candidate access.

---

## 3. Priority 1 (P1) Gaps: Core UX & Visual Identity

### GAP-P1-01: Bespoke Custom Asset System (Removal of Clichés)
- **Component:** `frontend/src/components/` (Hero, Onboarding, Empty states, AI status)
- **Current Behavior:** Used standard generic Lucide icons and purple/cyan gradients with no distinctive brand assets.
- **Expected Behavior:** Distinctive, custom SVG illustrations for:
  - Hero Section (Intelligent Matching & Vector Representation)
  - Role Selection Onboarding (Candidate vs HR pathways)
  - Company Verification Badge & Trust Shield
  - Empty States (No Jobs Found, No CVs in Library, No Applications Yet, No Candidates Ranked)
  - AI Worker Processing State (Multi-stage analysis)
  - Neutral GitHub Assessment indicator
- **Root Cause:** Reliance on basic off-the-shelf icon kits during Phase 5-6 implementation.
- **Fix Plan:**
  1. Create a dedicated SVG illustration library (`frontend/src/components/illustrations/`).
  2. Integrate into Landing Page, Onboarding, Empty States, and Recruiter Dashboard.

---

### GAP-P1-02: Real PDF Export Functionality
- **Component:** `frontend/src/app/candidate/cvs/page.tsx`, `builder/page.tsx`
- **Current Behavior:** Clicking "Xuất PDF" produced a browser `alert(...)`.
- **Expected Behavior:** Generates an actual downloadable/printable PDF document using browser print media queries.
- **Root Cause:** PDF generation library was not bundled, and print CSS was not configured.
- **Fix Plan:**
  1. Add dedicated print CSS rules in `frontend/src/app/globals.css` targeting `#printable-cv`.
  2. Replace `alert()` with `window.print()` targeting the rendered CV markup.

---

### GAP-P1-03: Seniority Filter in Job Discovery
- **Component:** `frontend/src/components/jobs/JobFilter.tsx`, `app/jobs/page.tsx`
- **Current Behavior:** Seniority was displayed on job cards, but could not be filtered from the header filter bar.
- **Expected Behavior:** Filter dropdown for Seniority: Junior, Mid-Level, Senior, Lead/Principal.
- **Root Cause:** Seniority was omitted from the filter state in `JobFilter.tsx`.
- **Fix Plan:**
  1. Add `selectedSeniority` state and dropdown in `JobFilter.tsx`.
  2. Connect to filtering logic in `JobsPage.tsx`.

---

## 4. Priority 2 (P2) Gaps: Polish & Micro-Interactions

### GAP-P2-01: Score Visualization Polish
- **Component:** `frontend/src/components/recruiter/ScoreBreakdownCard.tsx`, `CandidateRankingTable.tsx`
- **Current Behavior:** Plain numerical percentages without visual score bars.
- **Expected Behavior:** Sleek linear progress bars with color-coded score bands:
  - ≥ 85%: Emerald Green (High Match)
  - 70% – 84%: Indigo Blue (Good Match)
  - < 70%: Amber/Slate (Moderate/Weak Match)
- **Root Cause:** Simplistic table cell rendering.
- **Fix Plan:**
  1. Create a `ScoreBadge` component with animated linear progress fill.

---

### GAP-P2-02: Informative Empty States
- **Component:** Catalog, Application Tracker, and Candidate Ranking pages.
- **Current Behavior:** Plain grey boxes with simple text messages.
- **Expected Behavior:** Engaging empty states with tailored SVG illustrations and actionable guidance.
- **Fix Plan:**
  1. Embed newly crafted SVG illustrations in all 4 primary empty-state views.
