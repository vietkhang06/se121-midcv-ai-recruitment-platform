# UI/UX, Design System & Animation Modernization: SE347 -> SE121 Source-to-Target Mapping

## 1. Executive Summary & Context

This document establishes the authoritative mapping and modernization blueprint for the **MidCV (SE121)** frontend, leveraging design patterns, layout composition, interaction cues, and animation techniques from the **SE347 MatchaJob** reference project (`C:\Users\Khang\OneDrive\Desktop\SE347\1\se347_smart_recruitment_platform\frontend\src`).

### Strict Boundary Rules & Invariants
1. **Preserve SE121 Brand Palette (Non-negotiable)**:
   - Primary: `#2563EB` (Blue 600), Hover: `#1D4ED8`, Light: `#EFF6FF`, Soft: `#D7F9FA`.
   - Brand Green: `#00B14F` (Emerald), Soft: `#E8F8EE`.
   - Accent Yellow: `#FACC15`, Soft: `#FEF3C7`.
   - Neutrals: Surface `#FFFFFF`, Secondary `#F8FBFF`, Background `#F8FAFC`, Border `#E2E8F0`, Heading `#0F2A52`, Text `#1E3A5F`.
   - Dark Theme: Background `#0B1329`, Surface `#111C38`, Border `#1E293B`, Foreground `#D6E4E1`.
   - **Under no circumstances is SE347's Matcha green `#2d8653` imported into SE121 as the primary token.**
2. **Native Architecture**: Keep Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript 5. Do not import Bootstrap, AOS npm packages, or Vite.
3. **Zero Mock Fabrication**: Preserve 100% of real API contracts (`/api/v1/...`), auth guards, CV quota checks (3 Standard / 5 Pro), human confirmation gate, deterministic match scores, and GitHub evidence retrieval.
4. **Preserve Pre-existing Work**: Do not overwrite or revert any existing developer modifications on `feat/cv-upload-quota`.

---

## 2. Comprehensive Source-to-Target Component & Pattern Mapping

| SE347 Source File | Pattern / Interaction Worth Reusing | SE121 Target Route / Component | Preserved SE121 Real Functionality | Real API / Data Dependency | Planned Adaptation | Verification & Test | Risk / Limitation Mitigation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend/src/styles/tokens.css`<br>`frontend/src/App.css` | Surface tokens, card elevation, highlight badge groups, timeline step connectors, status chip variants | `frontend/src/app/globals.css` | Existing CSS custom properties, dark mode tokens, accessibility contrast | None (CSS design tokens) | Add `.midcv-badge`, `.job-highlight-group`, `.job-highlight-badge`, `.badge-salary`, `.timeline-step`, `.kanban-card` mapped to `#2563EB` and `#00B14F` | `npm run build`<br>Playwright motion tests | Prevent CSS variable name collisions; verify reduced-motion queries |
| `frontend/src/components/common/Header.jsx` | Clear role-delineated active navigation, sticky blur bar, compact status badges | `frontend/src/components/layout/Navbar.tsx`<br>`frontend/src/components/recruiter/RecruiterNavbar.tsx`<br>`frontend/src/components/admin/AdminNavbar.tsx` | Strict role separation (Candidate / Recruiter / Admin), Language switcher, Theme toggle, Logout dialog | `useAuth()`, `useLanguage()`, `usePathname()` | Modernize header containers with clean active-pill styling, subtle badge counts, unified responsive mobile drawers | `nav-responsive.spec.ts`<br>`strict-role-separation.spec.ts` | Preserve route boundaries; ensure no admin/recruiter leaks to candidate |
| `frontend/src/components/jobs/JobCard.jsx` | Job highlight badges (salary, type, location), company logo square, bookmark heart, match percentage badge | `frontend/src/components/jobs/JobCard.tsx` | Insufficient data tooltip, real match score display, quick apply modal trigger, bookmark state, company verification shield | `translateIndustry`, `formatSalary`, `useAuth()`, `useLanguage()` | Adapt highlight chip row, company avatar with brand background, streamlined action buttons, keeping real 0-100% match bar | `npm run build`<br>E2E jobs listing | Avoid hardcoded mock data; retain `matchStatus` branch logic |
| `frontend/src/pages/candidate/ApplicationsPage.jsx` | Horizontal 4-step progress timeline, status badges, application summary card | `frontend/src/app/candidate/applications/page.tsx` | Real status flow (`SUBMITTED`, `SHORTLISTED`, `INTERVIEWING`, `HIRED`, `REJECTED`), Match Inspection drawer, CV upload | `fetchCandidateApplications`, `fetchMatchInspection` | Adapt the visual 4-step progress line into the application cards with interactive step indicators matching MidCV states | `CandidateCvConfirmationIntegrationTest`<br>E2E data integrity test | Ensure rejected and withdrawn states are gracefully handled on the timeline |
| `frontend/src/pages/candidate/ProfilePage.jsx` | Hero profile header, avatar circle with initials, completion progress bar, contact detail cards | `frontend/src/app/candidate/profile/page.tsx` | Real profile update API, resume link, taxonomy skills, experience and education sync | `fetchCandidateProfile`, `saveCandidateProfile` | Modernize profile overview with hero header card, completion indicator, clean form sections and contact cards | `npm run build` | Maintain field validation; do not use localStorage mock store |
| `frontend/src/pages/employer/views/PipelineView.jsx`<br>`tokens.css` (.kanban-col) | Clean Kanban column layout, candidate cards with skills and match chips, directional stage transition | `frontend/src/app/recruiter/pipeline/page.tsx` | Real backend status updates (`updateApplicationStatus`), audit logging, job filter | `fetchRecruiterJobs`, `fetchJobApplications`, `updateApplicationStatus` | Upgrade Kanban board styling with modern columns, candidate avatar chips, skill tags, and seamless stage move controls | `CandidateRankingAndRecruiterDecisionIntegrationTest` | Do not fake drag-and-drop without real drop handlers; maintain real API calls |
| `frontend/src/pages/employer/views/OverviewView.jsx`<br>`PlatformGrowthChart.jsx` | Metric summary cards with percentage changes, recent candidates table, quick action buttons | `frontend/src/app/recruiter/page.tsx`<br>`frontend/src/components/recruiter/MetricCard.tsx` | Real recruiter jobs list, application counts, verification banner, company quota | `fetchRecruiterJobs`, `fetchJobApplications` | Modernize dashboard layout with enhanced metric cards, quick action tiles, and styled applicant list | `hr-portal.spec.ts` | Only show metrics computed from real API data; no fabricated growth stats |
| `frontend/src/components/charts/RecruitmentFunnelChart.jsx` | Visual recruitment funnel stages with horizontal bars and conversion counts | `frontend/src/app/recruiter/analytics/page.tsx` | Real funnel numbers (Submitted -> Shortlisted -> Interviewing -> Hired -> Rejected) | `fetchRecruiterJobs`, `fetchJobApplications` | Replace basic div bars with modern SVG/CSS gradient funnel visualization honoring dark and light modes | `npm run build` | Avoid Chart.js heavy runtime; keep lightweight responsive SVG/CSS |
| `frontend/src/pages/admin/views/AdminOverviewView.jsx` | Priority alert SLA cards, system health monitors, quick navigation links | `frontend/src/app/admin/page.tsx` | Real admin dashboard stats, live AI worker health check test, audit log counts | `fetchAdminDashboardStats`, `testAiSettings` | Add modern SLA/action cards, elevated health status badges, and refined activity list in admin theme | `admin-moderation-workflow.spec.ts` | Retain admin authentication guards and live API ping test |
| `frontend/src/components/cv/CVCard.tsx` (SE121 current) | Clean card with version tags, creation path, and multi-action toolbar | `frontend/src/components/cv/CVCard.tsx` | CV preview, edit in builder, duplicate, PDF export, delete, default badge | Real candidate CV object from Backend | Fix hardcoded dark classes so card seamlessly adapts to both Light and Dark themes with brand blue borders | `cv-upload-error-mapping.spec.ts` | Preserve all action handlers and version number displays |

---

## 3. Implementation Phasing & Safety Checklist

- **Slice 1**: Design tokens and application shell (`globals.css`, `Navbar.tsx`, `Footer.tsx`, `RecruiterNavbar.tsx`, `AdminNavbar.tsx`).
- **Slice 2**: Candidate & CV experience (`CVCard.tsx`, `applications/page.tsx`, `profile/page.tsx`).
- **Slice 3**: Recruiter screens (`recruiter/page.tsx`, `recruiter/pipeline/page.tsx`, `recruiter/analytics/page.tsx`).
- **Slice 4**: Admin screens (`admin/page.tsx`).
- **Slice 5**: Public & Auth pages (`JobCard.tsx`, `jobs/page.tsx`).
- **Slice 6**: Verification (`npm run build`, lint check, diff safety audit).
