# MidCV — User Guide Implementation Report
**Comprehensive Candidate & Recruiter Operational Manual at `/help`**

**Document Version**: 1.0.0  
**Route**: `/help`  
**Components**: `frontend/src/app/help/page.tsx`, `frontend/src/context/LanguageContext.tsx`  

---

## 1. Overview

The MidCV platform now features a dedicated, production-grade **User Guide** accessible directly from the main navigation header at `/help`. The guide is fully bilingual (Vietnamese and English), responsive, supports Light and Dark modes, and provides exhaustive operational guidelines for both primary user personas: **Candidates** and **Recruiters**.

---

## 2. Information Architecture

```
/help (User Guide Page)
├── Role Toggle Tabs
│    ├── Candidate Guide (UserCheck icon)
│    └── Recruiter Guide (Building2 icon)
├── Sticky Sidebar Table of Contents (TOC) with smooth jump-to anchors
└── Editorial Content Sections (Serif headings, code snippets, policy callouts)
```

---

## 3. Covered Operational Domains

### 3.1 Candidate Guide
1. **Registration & Email Verification**:
   - Mandatory verification workflow preventing fake unverified logins (HTTP 403 blocks).
   - Password Strength Meter requirement checklist (8+ chars, uppercase, lowercase, numbers, symbols).
2. **Multiple Target Industries**:
   - Selecting multi-industry career paths in registration and profile.
   - Normalized relational persistence and multi-industry job recommendations.
3. **CV Upload, Builder & Versioning**:
   - PDF/DOCX parsing via AI Worker.
   - Interactive CV Builder with AI suggestion assistance.
   - Immutable snapshot versioning at application submission.
4. **Technical Skills Index & Synonym Normalization**:
   - Searchable autocomplete dictionary with prefix matching (`jav`, `spr`, `doc`).
   - Automatic synonym mapping (JS → JavaScript, Postgres → PostgreSQL, K8s → Kubernetes).
5. **Job Search & Real Refine Matches**:
   - Functional filtering by keyword, location, industry, seniority, employment mode, and minimum salary.
   - Quick target industry recommendations and instant filter reset.
6. **5-Step Quick Apply & My Match Reports**:
   - Auditable match breakdown inspection.
   - Snapshot preservation and transparent factor explanation.
7. **Insufficient Data Behavior (`INSUFFICIENT_DATA`)**:
   - Transparent handling of newly registered profiles with empty CVs.
   - Displays "Match unavailable" / "Chưa thể tính mức độ phù hợp" with informative guidance tooltip instead of deceptive scores (e.g. 96%).
8. **Language Switcher & Dark/Light Mode**:
   - Instant VI/EN toggling with client storage persistence.
   - Deep Forest Green dark mode and Ivory canvas light mode.

### 3.2 Recruiter Guide
1. **Company Verification**:
   - Business license verification and verified company badges.
   - Scope-restricted candidate data access.
2. **JD Builder & AI JD Assistance**:
   - Separating REQUIRED from PREFERRED requirements.
   - Setting minimum experience years and AI skill recommendations.
   - Draft and Published publication lifecycle.
3. **Candidate Pipeline & NDCG@K Ranking**:
   - Algorithmic candidate ranking tables.
   - Multi-stage sourcing funnel (New, Screening, Shortlisted, Interview, Offer).
4. **Match Evidence & Factor Inspection**:
   - Grounded evidence snippets extracted directly from candidate CVs.
   - Clear breakdown of Core JD-CV score versus missing skills.
5. **GitHub Supporting Signals (Zero Penalty Policy)**:
   - Supplementary-only weighting (85% Core + 15% GitHub when available).
   - Automatic 100% Core fallback with zero score penalty for missing or private GitHub profiles.
   - Automatic suppression for non-technical positions (Marketing, HR, Finance).
6. **Privacy & Telemetry Analytics**:
   - Server-side role-based authorization.
   - Sourcing funnel conversion rates and Time-to-Hire telemetry.

---

## 4. Verification & Testing

- **Route Verification**: Prerendered as a static route during Next.js production build (`npm run build`).
- **Bilingual Consistency**: Centralized in `locales/en.ts` and `locales/vi.ts`.
- **Responsive Layout**: Validated on mobile (375px), tablet (768px), and desktop (1280px+).
