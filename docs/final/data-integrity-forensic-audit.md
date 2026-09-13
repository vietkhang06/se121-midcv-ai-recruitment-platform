# MidCV Data Integrity Forensic Audit

## 1. Observed Symptoms
1. **Pervasive Hardcoded / Seed Records in Runtime**: Static seed records (e.g., `SEED_JOBS`, `SEED_CVS`, `SEED_RANKINGS_JOB_01`, `SEED_COMPANY`, `SEED_RECRUITER`, and `SEED_INSPECTION_APP_001`) remain defined in client code and are actively served as initial or benchmark states.
2. **Failure of PostgreSQL Persistence**: Records created in the browser (new candidate registrations, recruiter job creations, CV uploads, and job applications) are not persisted to PostgreSQL. Directly querying the PostgreSQL database (`airecruit_db`) reveals 0 jobs, 0 CVs, 0 applications, 0 match results, and 0 user-registered accounts from browser sessions.
3. **Client-Storage Isolation**: Data created in one browser survives strictly within that browser's `localStorage` / React state.
4. **Failure of Cross-Browser & Multi-Machine State Sharing**: When a second browser, incognito session, or external machine accesses the application, user accounts, jobs, and CVs created in the first browser are completely absent.
5. **Masked Verification in Automated Tests**: Previous automated E2E tests passed by asserting against browser `sessionStorage`/`localStorage` test fixtures (`e2e_seed_benchmark = true`), masking the complete disconnection between frontend client state and backend PostgreSQL storage.

---

## 2. Current Runtime Architecture

### Diagram: Current Runtime Flow
```
[Browser A (Client State Authority)]
   │
   ├── UI Components (Registration, Login, Job Creator, CV Builder, Quick Apply)
   │     │
   │     ▼
   ├── lib/api.ts (Client Storage Engine)
   │     ├── [Read/Write] LocalStorage / SessionStorage
   │     │     ├── airecruit_persistent_jobs
   │     │     ├── airecruit_persistent_cvs_<userId>
   │     │     ├── airecruit_persistent_applications_<userId>
   │     │     ├── airecruit_persistent_rankings
   │     │     ├── airecruit_persistent_profile_<userId>
   │     │     ├── company_<userId>
   │     │     ├── airecruit_registered_users
   │     │     └── airecruit_verification_tokens
   │     │
   │     ├── (CORS Blocked 403 / Never Invoked)
   │     │     ├── POST /api/v1/auth/register/*   ───(403 Invalid CORS)──x [Swallowed -> LocalStorage]
   │     │     ├── POST /api/v1/auth/login        ───(403 Invalid CORS)──x [Swallowed -> LocalStorage]
   │     │     ├── POST /api/v1/jobs/draft        ───(Never Called)──────x
   │     │     ├── POST /api/v1/candidate/cvs     ───(Never Called)──────x
   │     │     ├── POST /api/v1/candidate/apps    ───(Never Called)──────x
   │     │     └── POST /api/v1/matching/*        ───(Never Called)──────x
   │     │
   │     └── [Only Simple GETs Invoked]
   │           └── GET /api/v1/jobs  ────────────► [Spring Boot Backend :8080]
   │                                                      │
   │                                                      ▼
   │                                              [PostgreSQL airecruit_db]
   │                                              (Returns [] because DB is empty)
   ▼
[Browser B / Incognito Session]
   │
   └── Queries Backend or LocalStorage:
         ├── LocalStorage: Empty (isolated from Browser A)
         └── Backend GET /api/v1/jobs: Returns [] (0 jobs in DB)
         └── Login: Rejects credentials (user not in DB or Browser B LocalStorage)
```

In the current runtime, the **authoritative source of truth is the browser's `localStorage`**, while the Spring Boot backend and PostgreSQL database are either bypassed entirely or blocked by security policies.

---

## 3. Registration Trace

### Execution Path
- **File**: `frontend/src/app/register/page.tsx`
- **Component**: `RegisterPage`
- **Function**: `handleSubmit` (lines 98–144)
- **Library Method**: `registerCandidateAccount` / `registerRecruiterAccount` in `frontend/src/lib/api.ts` (lines 1040–1162)
- **API Endpoint**: `POST http://localhost:8080/api/v1/auth/register/candidate` or `POST http://localhost:8080/api/v1/auth/register/recruiter`
- **Backend Controller**: `backend/src/main/java/com/platform/recruitment/auth/AuthController.java` (`registerCandidate` lines 23–27 / `registerRecruiter` lines 29–33)
- **Backend Service**: `backend/src/main/java/com/platform/recruitment/auth/AuthService.java` (`registerCandidate` lines 50–108 / `registerRecruiter` lines 110–150)
- **Backend Repositories**:
  - `UserRepository`
  - `CandidateProfileRepository`
  - `CandidateTargetIndustryRepository`
  - `CompanyRepository`
  - `RecruiterProfileRepository`
  - `EmailVerificationTokenRepository`
- **Entities**: `User`, `CandidateProfile`, `CandidateTargetIndustry`, `Company`, `RecruiterProfile`, `EmailVerificationToken`
- **Database Tables**: `users`, `candidate_profiles`, `candidate_target_industries`, `companies`, `recruiter_profiles`, `email_verification_tokens`

### Forensic Determination: Does PostgreSQL INSERT Actually Occur?
**NO.**
**Evidence**:
1. When the browser at `http://localhost:3000` initiates `fetch('http://localhost:8080/api/v1/auth/register/candidate', ...)`, the browser automatically transmits a cross-origin preflight `OPTIONS` request.
2. In `backend/src/main/java/com/platform/recruitment/config/SecurityConfig.java` line 41:
   ```java
   .cors(AbstractHttpConfigurer::disable)
   ```
   Spring Security has explicitly disabled CORS handling. Preflight `OPTIONS` requests receive:
   `HTTP/1.1 403 Forbidden` (`Invalid CORS request`).
3. In `frontend/src/lib/api.ts` lines 1059–1064:
   ```typescript
   } catch (err: any) {
     if (err.message && !err.message.includes('fetch')) {
       throw err;
     }
     // Fallback client storage implementation
   }
   ```
   The network/CORS error is swallowed, and the function proceeds to append the user into `localStorage.getItem('airecruit_registered_users')` (lines 1071–1083).
4. Direct inspection of PostgreSQL table `users`:
   Total rows = 2 (seeded only by a Python test script `verify_email_flow.py` on 2026-09-05; 0 records from browser registration).

---

## 4. Login Trace

### Execution Path
- **Login UI**: `frontend/src/app/login/page.tsx` (`handleSubmit` lines 41–60)
- **Auth Context**: `frontend/src/context/AuthContext.tsx` (`login` lines 107–120)
- **Library Method**: `loginAccount` in `frontend/src/lib/api.ts` (lines 1252–1315)
- **Target API**: `POST http://localhost:8080/api/v1/auth/login`
- **Backend Controller**: `AuthController.java` (lines 47–51)
- **Backend Service**: `AuthService.java` (`login` lines 201–219)
- **Backend Repository**: `UserRepository.findByEmail`
- **Database Table**: `users`

### Forensic Determination: Does Login Query PostgreSQL?
**NO.**
**Evidence**:
1. When initiated from the browser, the cross-origin preflight is rejected with `HTTP 403 Invalid CORS request`.
2. In `frontend/src/lib/api.ts` lines 1284–1287:
   ```typescript
   if (err.message && !err.message.includes('fetch')) {
     throw err;
   }
   // Fallback client storage
   const users = getRegisteredUsers();
   const found = users.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
   ```
3. Instead of PostgreSQL, login validates against `getRegisteredUsers()` which reads from `localStorage.getItem('airecruit_registered_users')`.
4. If the email matches the client storage (or the hardcoded seed users `nguyenvanjava@example.com` / `unverified@example.com`), it generates a fake JWT:
   ```typescript
   const fakeJwt = `jwt-token-${found.id}-${Date.now()}`;
   return { user, accessToken: fakeJwt };
   ```
5. `AuthContext.tsx` stores this fake JWT and user object in `localStorage.setItem('auth_user', ...)` and `localStorage.setItem('auth_token', ...)`. PostgreSQL is never reached.

---

## 5. CV Persistence Trace

### Execution Path
- **Upload CV UI**: `frontend/src/components/cv/CVUploadModal.tsx`
  - Lifecycle: `handleStartProcessing` (lines 73–93) uses simulated `setTimeout` delays (700ms, 700ms, 1200ms, 600ms) without contacting any backend or AI Worker.
  - Extracted Data: Hardcoded mock skills `['Java', 'Spring Boot', 'PostgreSQL', 'Docker']` and static summary text (lines 39–41).
  - Save Handler: `handleSaveParsedCV` (lines 95–125) synthesizes a client CV object with ID `cv-uploaded-${Date.now()}`.
- **CV Builder UI**: `frontend/src/app/candidate/cvs/builder/page.tsx` (`handleSaveCV` line 139).
- **Library Method**: `saveCandidateCV` in `frontend/src/lib/api.ts` (lines 640–656).
- **API Endpoint**: **NONE.** `saveCandidateCV` contains zero `fetch()` calls.
- **Backend Status**:
  - Backend controller `CVController.java` exists (`POST /api/v1/candidate/cvs`), but is **never invoked** by frontend code.
  - Backend `CVService.java` only inserts into `cvs` table; it does not insert into `cv_versions` or `cv_sections` (that logic was isolated in `ProcessingLifecycleService.java`).
- **Database Tables**: `cvs` (0 rows), `cv_versions` (0 rows), `cv_sections` (0 rows).

### Forensic Determination: Is CV / CVVersion / CV Sections Persisted?
- CV Persisted to DB: **NO** (0 rows in `cvs`).
- CVVersion Persisted to DB: **NO** (0 rows in `cv_versions`).
- CV Sections Persisted to DB: **NO** (0 rows in `cv_sections`).
- Version changes persisted to DB: **NO**.
- Is localStorage involved: **YES**. `saveCandidateCV` writes directly to `localStorage.setItem('airecruit_persistent_cvs_' + userId, ...)`.

---

## 6. Job Persistence Trace

### Execution Path
- **Create Job UI**: `frontend/src/app/recruiter/jobs/new/page.tsx` (`handleSaveJob` lines 39–77).
- **Save Library Method**: `saveJob` in `frontend/src/lib/api.ts` (lines 805–817):
  ```typescript
  export async function saveJob(job: Job): Promise<Job> {
    const current = await fetchJobs();
    const existingIdx = current.findIndex(j => j.id === job.id);
    let updated: Job[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = job;
    } else {
      updated = [job, ...current];
    }
    setStorage(STORAGE_KEYS.JOBS, updated);
    return job;
  }
  ```
- **Backend Endpoints Available**: `POST /api/v1/jobs/draft`, `POST /api/v1/jobs/{id}/publish` in `JobController.java`.
- **Backend Endpoints Called by UI**: **NONE.** `saveJob` never calls `fetch()`.

### List Jobs Trace
- **Listing UI**: `frontend/src/app/recruiter/jobs/page.tsx` (calls `fetchRecruiterJobs()` -> `fetchJobs()`).
- **Public Jobs UI**: `frontend/src/app/jobs/page.tsx` (calls `fetchJobs()`).
- **`fetchJobs()` in `lib/api.ts` (lines 552–572)**:
  ```typescript
  try {
    const res = await fetch('http://localhost:8080/api/v1/jobs');
    if (res.ok) {
      const json = await res.json();
      if (json?.data && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch { }
  return getStorage<Job[]>(STORAGE_KEYS.JOBS, []);
  ```

### Forensic Determination: Are Displayed Jobs Actually From DB?
- If Spring Boot is running: `fetch('http://localhost:8080/api/v1/jobs')` returns `HTTP 200` with `data: []` because PostgreSQL `jobs` table has 0 rows. This causes any job created in `localStorage` by `handleSaveJob` to be ignored/overwritten by the empty backend response `[]`.
- If Spring Boot is offline: It falls back to `localStorage.getItem('airecruit_persistent_jobs')`.
- If `e2e_seed_benchmark` is set: It returns `SEED_JOBS` (4 hardcoded jobs).
- In all cases: **Zero jobs are persisted to PostgreSQL.**

---

## 7. Application Persistence Trace

### Execution Path
- **Apply UI**: `frontend/src/components/job/QuickApplyModal.tsx`
- **Library Method**: `submitApplication` in `frontend/src/lib/api.ts` (lines 682–727):
  ```typescript
  export async function submitApplication(app: Application): Promise<Application> {
    const user = getAuthUser();
    const storageKey = isDemo ? `${STORAGE_KEYS.APPLICATIONS}_demo` : `${STORAGE_KEYS.APPLICATIONS}_${user?.id || 'anon'}`;
    const current = getStorage<Application[]>(storageKey, isDemo ? SEED_APPLICATIONS : []);
    const updated = [app, ...current];
    setStorage(storageKey, updated);
    ...
  }
  ```
- **Backend Endpoints Available**: `POST /api/v1/candidate/applications` in `ApplicationController.java`.
- **Backend Endpoints Called**: **NONE.**

### Forensic Determination: Is Application Truly Persisted?
**NO.**
Application data is written strictly to `localStorage` under `airecruit_persistent_applications_<userId>`. PostgreSQL table `applications` contains 0 rows.

---

## 8. Match Result Persistence Trace

### Classification:
**D. Hardcoded/mock client synthesis.**

### Exact Evidence:
1. **Backend Matching Engine**: `MatchingEngineService.java` and `MatchingController.java` exist in Spring Boot. They provide `POST /api/v1/matching/jobs/{jobId}/candidates/{candidateId}` to calculate scores and save to `match_results` and `match_factors`.
2. **Frontend Disconnection**: Frontend `lib/api.ts` has **no calls** to `MatchingController`.
3. **Synthetic Injection in `submitApplication` (`lib/api.ts` lines 691–724)**:
   ```typescript
   const newRankItem: CandidateRankingItem = {
     rank: rankings.length + 1,
     applicationId: app.id,
     candidateId: user?.id || 'cand-01',
     candidateName: user?.fullName || 'Ứng viên mới',
     headline: `${user?.targetIndustry || 'Technology'} Specialist (Vừa nộp đơn)`,
     overallMatchScore: 91.2,
     coreJdCvScore: 91.5,
     githubSupportingScore: 89.5,
     requiredSkillsMatched: 4,
     requiredSkillsTotal: 4,
     requiredSkillsMissingNames: [],
     relevantExperienceYears: 3.5,
     appliedDate: app.appliedDate,
     status: 'SUBMITTED',
     gitHubConnected: !!app.githubUrl
   };
   setStorage(STORAGE_KEYS.RANKINGS, updatedRankings);
   ```
4. **Synthetic Inspection in `fetchMatchInspection` (`lib/api.ts` lines 838–928)**:
   Synthesizes hardcoded breakdown factors (e.g., `Skill Match Score (40% Core)`: 95.0, `Semantic Vector Match (15% Core)`: 87.04) dynamically from the `localStorage` object.
5. **Database Direct Verification**:
   - `match_results` count: **0**
   - `match_factors` count: **0**

---

## 9. Hardcoded Data Inventory

| Record Identifier | Location | Classification | Reachable in Production Runtime? | Details |
|---|---|---|---|---|
| `SEED_COMPANY` | `frontend/src/lib/api.ts:18–28` | Runtime / Benchmark Seed | YES | "FPT Software Corporation", verified status, contact details. Used when benchmark mode or unauth recruiter. |
| `SEED_RECRUITER` | `frontend/src/lib/api.ts:30–37` | Runtime / Benchmark Seed | YES | "Trần Thị Tuyển Dụng", recruiter profile for FPT Software. |
| `SEED_JOBS` | `frontend/src/lib/api.ts:39–171` | Runtime / Benchmark Seed | YES | 4 complete job postings (Java Backend, Marketing Manager, Data Scientist, CTO). Returned when benchmark active. |
| `SEED_CANDIDATE` | `frontend/src/lib/api.ts:173–188`| Runtime / Benchmark Seed | YES | "Nguyễn Văn Java", profile with 5 years experience, skills, and bio. |
| `SEED_CVS` | `frontend/src/lib/api.ts:190–240` | Runtime / Benchmark Seed | YES | 2 CV objects with full section breakdown. |
| `SEED_APPLICATIONS` | `frontend/src/lib/api.ts:242–258` | Runtime / Benchmark Seed | YES | `app-001` linked to `job-tech-01` and `cv-java-01`. |
| `SEED_RANKINGS_JOB_01` | `frontend/src/lib/api.ts:260–431` | Runtime / Benchmark Seed | YES | 5 ranked candidates with detailed scores, GitHub data, and breakdown. |
| `SEED_INSPECTION_APP_001` | `frontend/src/lib/api.ts:433–490` | Runtime / Benchmark Seed | YES | Complete inspection data for `app-001`. |
| Hardcoded Registered Users | `frontend/src/lib/api.ts:994–1016`| Runtime Business Data | YES | `usr-cand-01` (`nguyenvanjava@example.com`) and `usr-cand-unverified` (`unverified@example.com`). Default return of `getRegisteredUsers()`. |
| MOCK_* aliases | `frontend/src/lib/api.ts:1318–1326`| Runtime Business Data | YES | Backwards-compatibility re-exports of all SEED arrays. |
| Default Company in Job Creator | `frontend/src/app/recruiter/jobs/new/page.tsx:19` | Runtime Business Data | YES | `const [company, setCompany] = useState<Company>(MOCK_COMPANY);` |
| Hardcoded Extracted CV Skills | `frontend/src/components/cv/CVUploadModal.tsx:39–41` | Runtime Business Data | YES | `['Java', 'Spring Boot', 'PostgreSQL', 'Docker']` injected on every CV upload. |

---

## 10. Seed Inventory

1. **`SEED_COMPANY`**: FPT Software Corporation (Technology, 500-1000 employees).
2. **`SEED_RECRUITER`**: Trần Thị Tuyển Dụng (`hr@fpt-software.com`).
3. **`SEED_JOBS`** (4 items):
   - `job-tech-01`: Senior Java Backend Engineer (Spring Boot & Vector AI).
   - `job-mkt-02`: Digital Performance Marketing Manager (Meta Ads & GA4).
   - `job-ai-03`: Senior Data Scientist & Machine Learning Engineer (PyTorch & NLP).
   - `job-exec-04`: Chief Technology Officer (CTO) - FinTech Enterprise.
4. **`SEED_CANDIDATE`**: Nguyễn Văn Java (`nguyenvanjava@example.com`).
5. **`SEED_CVS`** (2 items):
   - `cv-java-01`: CV Senior Java Developer & AI Engineer.
   - `cv-java-02`: CV Microservices Backend Specialist.
6. **`SEED_APPLICATIONS`**: `app-001` (Candidate: `cand-01`, Job: `job-tech-01`, Status: `SUBMITTED`).
7. **`SEED_RANKINGS_JOB_01`** (5 items):
   - Rank 1: Nguyễn Văn Java (Overall 94.2, Core 95.0, GitHub 89.5).
   - Rank 2: Lê Hoàng Docker (Overall 88.5, Core 88.5, GitHub N/A).
   - Rank 3: Phạm Thuỳ Data (Overall 86.4, Core 85.0, GitHub 94.0).
   - Rank 4: Trần Minh Frontend (Overall 72.8, Core 71.0, GitHub 83.0).
   - Rank 5: Hoàng Văn Golang (Overall 68.0, Core 68.0, GitHub N/A).
8. **`SEED_INSPECTION_APP_001`**: Complete evaluation tree for `app-001`.

---

## 11. Mock Inventory

1. **`frontend/src/components/cv/CVUploadModal.tsx`**:
   - `handleStartProcessing` simulates parsing pipeline with 4 nested `setTimeout` calls.
   - Initial state sets hardcoded skills `['Java', 'Spring Boot', 'PostgreSQL', 'Docker']` and static experience bullets.
2. **`frontend/src/lib/api.ts` (`submitApplication`)**:
   - Generates simulated candidate ranking scores on the fly (`overallMatchScore: 91.2`).
3. **`frontend/src/lib/api.ts` (`fetchMatchInspection`)**:
   - Fabricates match breakdown explanations, factor percentages, and mock GitHub evaluations.
4. **`backend/src/main/java/com/platform/recruitment/email/MockEmailService.java`**:
   - Backed by `ConcurrentHashMap<String, String> devTokenStore`.
   - Enabled by `@ConditionalOnProperty(name = "app.email-mode", havingValue = "MOCK", matchIfMissing = true)`. Stores verification tokens in memory for dev logging/testing.

---

## 12. localStorage / sessionStorage Inventory

| Storage Mechanism | Key | Classification | Read Location | Write Location | Data Structure |
|---|---|---|---|---|---|
| `localStorage` | `auth_user` | AUTH SESSION | `AuthContext.tsx:57`, `api.ts:508` | `AuthContext.tsx:111` | `User` JSON object |
| `localStorage` | `auth_token` | AUTH SESSION | `AuthContext.tsx:58`, `api.ts:517` | `AuthContext.tsx:112` | JWT string |
| `localStorage` | `airecruit_registered_users` | **BUSINESS DATA** | `api.ts:994` | `api.ts:1082, 1143, 1205` | Array of `StoredRegisteredUser` |
| `localStorage` | `airecruit_verification_tokens` | **BUSINESS DATA** | `api.ts:1019` | `api.ts:1093, 1154, 1199, 1243` | Array of `StoredToken` |
| `localStorage` | `airecruit_persistent_jobs` | **BUSINESS DATA** | `api.ts:571` | `api.ts:815` | Array of `Job` |
| `localStorage` | `airecruit_persistent_cvs_<id>` | **BUSINESS DATA** | `api.ts:637` | `api.ts:654, 665` | Array of `CV` |
| `localStorage` | `airecruit_persistent_applications_<id>` | **BUSINESS DATA** | `api.ts:679` | `api.ts:689` | Array of `Application` |
| `localStorage` | `airecruit_persistent_profile_<id>` | **BUSINESS DATA** | `api.ts:614` | `api.ts:622` | `CandidateProfile` JSON |
| `localStorage` | `company_<id>` | **BUSINESS DATA** | `api.ts:770` | `api.ts:797` | `Company` JSON |
| `localStorage` | `airecruit_persistent_rankings` | **BUSINESS DATA** | `api.ts:692, 858` | `api.ts:723` | Array of `CandidateRankingItem` |
| `localStorage` | `hasSeenFirstVisitOnboarding` | UI PREFERENCE | `AuthContext.tsx:51` | `AuthContext.tsx:83` | `'true'` |
| `localStorage` | `midcv_lang` | UI PREFERENCE | `LanguageContext.tsx:24` | `LanguageContext.tsx:32` | `'vi'` \| `'en'` |
| `localStorage` | `midcv_theme` | UI PREFERENCE | `ThemeContext.tsx:21` | `ThemeContext.tsx:43` | `'dark'` \| `'light'` |
| `sessionStorage` | `e2e_seed_benchmark` | TEST DATA | `api.ts:544` | E2E spec files | `'true'` |
| `sessionStorage` | `e2e_test_fixture_match_inspection` | TEST DATA | `api.ts:841` | E2E test fixtures | `MatchInspectionData` JSON |

---

## 13. Backend In-Memory Inventory

- **Static Collections / In-Memory Repositories**: None in `src/main` (JPA repositories are standard Spring Data interfaces).
- **`ConcurrentHashMap`**:
  - `MockEmailService.java` (line 15): `private final Map<String, String> devTokenStore = new ConcurrentHashMap<>();`. Reachable when email mode is MOCK.
- **`CommandLineRunner` / `ApplicationRunner` / `@PostConstruct` Seed Loaders**: None present. The backend relies solely on Flyway migrations.

---

## 14. PostgreSQL Direct Verification

Database: `airecruit_db` on PostgreSQL 16 (Pgvector enabled).

| Table Name | Live Record Count | Source / Origin of Records | Runtime User Records Created via UI? |
|---|---|---|---|
| `users` | **2** | Python test script (`scratch/verify_email_flow.py`) executed on 2026-09-05 | **0** |
| `candidate_profiles` | **2** | Created by `verify_email_flow.py` for test candidates | **0** |
| `recruiter_profiles` | **0** | Empty | **0** |
| `companies` | **0** | Empty | **0** |
| `jobs` | **0** | Empty | **0** |
| `job_requirements` | **0** | Empty | **0** |
| `cvs` | **0** | Empty | **0** |
| `cv_versions` | **0** | Empty | **0** |
| `cv_sections` | **0** | Empty | **0** |
| `applications` | **0** | Empty | **0** |
| `application_answers` | **0** | Empty | **0** |
| `match_results` | **0** | Empty | **0** |
| `match_factors` | **0** | Empty | **0** |
| `github_profiles` | **0** | Empty | **0** |
| `github_assessments` | **0** | Empty | **0** |
| `email_verification_tokens` | **2** | Created by `verify_email_flow.py` | **0** |

**Direct Verification Result**: PostgreSQL is completely devoid of any user-created runtime business data generated through the browser.

---

## 15. Cross-Browser Verification

### Step A: Browser A Registers Account
- Input: `audittest_cand_01@example.com`
- Network Event: `OPTIONS http://localhost:8080/api/v1/auth/register/candidate`
- Response: `HTTP 403 Forbidden` (`Invalid CORS request`)
- Browser Behavior: `catch` block catches network error, writes user into Browser A's `localStorage` (`airecruit_registered_users`), and displays verification screen.

### Step B: Direct PostgreSQL Query
- Query: `SELECT count(*) FROM users WHERE email = 'audittest_cand_01@example.com';`
- Result: **0 rows**.

### Step C: Browser B Attempts Login
- Browser B opens `http://localhost:3000/login`.
- Input: `audittest_cand_01@example.com` and password.
- Network Event: `OPTIONS http://localhost:8080/api/v1/auth/login` fails with CORS 403.
- Browser Behavior: `catch` block checks Browser B's `localStorage`.
- Result: User does not exist in Browser B's `localStorage`. Error returned: `"Email hoặc mật khẩu không chính xác."`
- **Result: FAIL.** Cross-browser authentication fails completely.

### Step D: Recruiter Creates Job in Browser A
- Input: New Job "Senior DevOps Engineer"
- Behavior: `saveJob` in `lib/api.ts` does not call backend. Saves only to Browser A `localStorage`.
- PostgreSQL check: `SELECT count(*) FROM jobs;` -> **0 rows**.
- Browser B opens `/jobs`: Calls `GET http://localhost:8080/api/v1/jobs`, receives `[]` from DB. Browser B sees 0 jobs.
- **Result: FAIL.** Cross-browser data sharing fails completely.

---

## 16. Current Source of Truth

| Entity | Declared / Intended Source of Truth | Actual Current Runtime Source of Truth |
|---|---|---|
| User & Auth | PostgreSQL `users` | Browser A `localStorage` (`airecruit_registered_users`) |
| Auth Session | Backend JWT Validation | Browser `localStorage` (`auth_user`, `auth_token`) |
| Candidate Profile | PostgreSQL `candidate_profiles` | Browser `localStorage` (`airecruit_persistent_profile_<id>`) |
| Company Profile | PostgreSQL `companies` | Browser `localStorage` (`company_<id>`) or static `SEED_COMPANY` |
| Jobs | PostgreSQL `jobs` | Browser `localStorage` (`airecruit_persistent_jobs`) |
| CVs & Versions | PostgreSQL `cvs`, `cv_versions` | Browser `localStorage` (`airecruit_persistent_cvs_<id>`) |
| Applications | PostgreSQL `applications` | Browser `localStorage` (`airecruit_persistent_applications_<id>`) |
| Match Results & Rankings | PostgreSQL `match_results` | Browser `localStorage` (`airecruit_persistent_rankings`) & static synthesis |

---

## 17. Root Cause

The isolation of runtime business data in Browser A stems from four interrelated defects:

1. **Missing Backend Integration in Mutation Methods (`frontend/src/lib/api.ts`)**:
   - `saveJob()`, `saveCandidateCV()`, `submitApplication()`, `saveCandidateProfile()`, and `saveCompanyProfile()` contain **zero HTTP requests to the backend**. They were implemented as pure client-side `localStorage` mutators.
2. **Spring Security CORS Blockade (`backend/src/main/java/.../SecurityConfig.java:41`)**:
   - `SecurityConfig` specifies `.cors(AbstractHttpConfigurer::disable)`.
   - Every preflight `OPTIONS` request from Next.js (`http://localhost:3000`) is rejected with `HTTP 403 Invalid CORS request`.
3. **Silent Fetch Error Swallowing (`frontend/src/lib/api.ts:1060–1064, 1284–1287`)**:
   - Registration and Login methods wrap API calls in `try ... catch`. When the CORS 403 failure occurs, the catch block swallows the error and silently falls back to writing fake accounts and tokens to `localStorage`.
4. **Mock Benchmark Bypasses (`frontend/src/lib/api.ts:542–546`)**:
   - Automated tests injected `sessionStorage.setItem('e2e_seed_benchmark', 'true')`, which caused `api.ts` to short-circuit all queries and return static seed objects (`SEED_JOBS`, `SEED_CVS`, etc.), preventing CI from detecting the complete lack of database persistence.

---

## 18. Required Target Architecture

```
[Browser A]                           [Browser B]
    │                                      │
    ▼                                      ▼
[Next.js Client Components (Stateless Presentation)]
    │                                      │
    │  (Authenticated HTTP / Bearer JWT)   │
    ▼                                      ▼
[Next.js API Gateway / Rewrites OR Direct Cross-Origin API with Permitted CORS]
    │
    ▼
[Spring Boot REST Controllers]
    ├── AuthController (/api/v1/auth/**)
    ├── JobController (/api/v1/jobs/**)
    ├── CVController (/api/v1/candidate/cvs/**)
    ├── ApplicationController (/api/v1/candidate/applications, /api/v1/recruiter/**)
    └── MatchingController (/api/v1/matching/**)
    │
    ▼
[Spring Boot Services (Transactional Business Logic)]
    ├── AuthService
    ├── JobService
    ├── CVService & ProcessingLifecycleService
    ├── ApplicationService
    └── MatchingEngineService
    │
    ▼
[Spring Data JPA Repositories]
    │
    ▼
[PostgreSQL (airecruit_db) — SOLE AUTHORITATIVE SOURCE OF TRUTH]
    ├── users
    ├── candidate_profiles / recruiter_profiles / companies
    ├── jobs / job_requirements
    ├── cvs / cv_versions / cv_sections
    ├── applications / application_cv_snapshots
    └── match_results / match_factors
```

Under this architecture:
- `localStorage` retains ONLY UI preferences (`midcv_lang`, `midcv_theme`) and the active JWT bearer token (`auth_token`).
- All business records (Users, Jobs, CVs, Applications, Match Results) originate from and persist to PostgreSQL.
- Both Browser A and Browser B observe identical, real-time database state.

---

## 19. Exact Required Changes

*(Audited technical changes necessary for future remediation. No code modified during this audit).*

1. **Backend CORS Configuration (`SecurityConfig.java`)**:
   - Replace `.cors(AbstractHttpConfigurer::disable)` with a properly registered `CorsConfigurationSource` allowing `http://localhost:3000` with methods `GET, POST, PUT, DELETE, OPTIONS, PATCH` and headers `Authorization, Content-Type, Accept`.
2. **Frontend Authentication Bridge (`frontend/src/lib/api.ts`)**:
   - Eliminate `localStorage` fallback for user registration and login. If the backend fails or returns an error, the UI must display the error rather than writing fake accounts into `localStorage`.
   - Remove hardcoded `getRegisteredUsers()`.
3. **Frontend Job API Wiring (`frontend/src/lib/api.ts`)**:
   - Update `saveJob(job: Job)` to issue `POST http://localhost:8080/api/v1/jobs/draft` (or publish endpoint) with Bearer token.
   - Wire recruiter job management to backend endpoints.
4. **Frontend CV & CV Version Wiring (`frontend/src/lib/api.ts` & `CVUploadModal.tsx`)**:
   - Replace `setTimeout` mock in `CVUploadModal.tsx` with a multipart form upload calling `POST /api/v1/candidate/cvs` followed by triggering processing `POST /api/v1/processing/cvs/{cvId}`.
   - Update `saveCandidateCV` and `fetchCandidateCVs` to call `/api/v1/candidate/cvs`.
5. **Frontend Application Submission Wiring (`frontend/src/lib/api.ts`)**:
   - Update `submitApplication` to send `POST http://localhost:8080/api/v1/candidate/applications` with `{ jobId, cvId }`.
   - Update `fetchCandidateApplications` to query `GET /api/v1/candidate/applications`.
6. **Frontend Match Ranking Wiring (`frontend/src/lib/api.ts`)**:
   - Update `fetchCandidateRankings(jobId)` to call `GET http://localhost:8080/api/v1/matching/jobs/{jobId}/rankings`.
   - Update `fetchMatchInspection` to retrieve actual `match_results` and `match_factors` from backend.
7. **Eliminate Benchmark Seed Bypasses from Runtime Code**:
   - Remove `isTestBenchmarkMode()` short-circuits from `lib/api.ts`.
   - Remove `MOCK_COMPANY` default in `frontend/src/app/recruiter/jobs/new/page.tsx:19`.

---

## 20. Risks

1. **Breaking Legacy E2E Tests**: Existing Playwright tests currently rely on `e2e_seed_benchmark = true` and `SEED_JOBS` / `SEED_RANKINGS_JOB_01` fixtures. Connecting real database APIs will require tests to execute against seeded database states or authenticated API fixtures.
2. **Authentication Token Passing**: All mutation endpoints on Spring Boot require `@AuthenticationPrincipal User currentUser`. Frontend API calls in `lib/api.ts` must consistently attach `Authorization: Bearer <token>`.
3. **Backend Entity Hierarchy for CVs**: Currently, `CVService.createCV` saves to `cvs` but does not populate `cv_versions` or `cv_sections` (that is handled by `ProcessingLifecycleService`). Both must be coordinated during CV creation.
4. **Docker / Backend Availability Requirement**: If PostgreSQL or Spring Boot is stopped, the frontend will display legitimate connection errors rather than falling back to fake local storage.

---

## 21. Final Status

**FAIL**

*Summary: The application currently fails data integrity and persistence standards. Authoritative storage is situated in browser client state (`localStorage`), while PostgreSQL contains zero runtime business records created via the application UI.*
