# WP-05 Checkpoint Report — Immutable CV Version Creation & Save

**Work Package**: WP-05  
**Requirement Covered**: `CVVER-01`  
**Standard**: Immutable Audit Snapshot Archival & Auto-Incrementing Versioning  
**Status**: **COMPLETED & 100% VERIFIED**  
**Date**: September 7, 2026  

---

## 1. Executive Summary & Objective

Work Package WP-05 implements the **Immutable CV Version Creation & Save** (`CVVER-01`) system.

In MidCV's academic framework (*"Nền tảng tuyển dụng thông minh hỗ trợ đối sánh ngữ nghĩa JD – CV và xác thực năng lực qua GitHub"*), candidate applications are legally and algorithmically tied to specific audit snapshots. When a candidate updates their CV, modifying or overwriting the original record would invalidate existing applications, distort historical match scores, and corrupt recruiter candidate ranking telemetry.

Under WP-05:
- Any modification to an existing CV in the CV Studio auto-increments the version (`v1.0 -> v2.0 -> v3.0`) without destroying or mutating prior versions.
- Each revision produces an immutable `CVVersion` snapshot (`id`, `versionNumber`, `title`, `summaryText`, `sections`, `createdAt`).
- The CV Library renders the current active version badge and an interactive **Version History** modal allowing the candidate to audit all previous versions and open any past snapshot in the Studio.

---

## 2. Technical Implementation Details

### 2.1 CV Builder Studio Version Lifecycle (`frontend/src/app/candidate/cvs/builder/page.tsx`)
- **Version Awareness**:
  - Detects edit mode via `?edit=<id>` and specific snapshot requests via `?v=<versionNumber>`.
  - Maintains `existingCv`, `currentVersionNumber`, and `successMessage` states.
  - Header displays current version chip (`#cv-version-badge`) and shows next publish target (e.g. `Next save: v2.0`).
- **Auto-Increment & Immutable Snapshot Archival**:
  - On save, calculates `nextVersion = (existingCv.currentVersionNumber || previousVersions.length || 1) + 1`.
  - Creates an immutable `CVVersion` snapshot capturing the current state of sections (Experience, Skills, Projects) and summary text.
  - Prepends the snapshot to the parent CV's `versions` array while preserving all previous snapshots.
  - Displays user feedback banner (`#save-success-banner`) with the new version badge and an explicit *"Bản lưu bất biến (Immutable Snapshot)"* label.

### 2.2 CV Library & Version History Modal (`frontend/src/app/candidate/cvs/page.tsx`)
- **Active Version Badge**:
  - Each CV card in the candidate library renders its active version badge: `v{cv.currentVersionNumber || 1}.0`.
- **Interactive Version History Trigger**:
  - Displays a button with `GitBranch` icon indicating total version count (e.g., `2 phiên bản (Lịch sử)`).
- **Accessible Version History Modal (`#version-history-modal`)**:
  - Lists all historical snapshots in reverse-chronological order.
  - Shows version badge, creation timestamp, summary text, and section count.
  - Highlights the current active version with a distinct badge (`Phiên bản hiện tại`).
  - Provides a one-click CTA: `Mở bản này trong Studio` linking to `/candidate/cvs/builder?edit=${cv.id}&v=${ver.versionNumber}`.

### 2.3 Storage Persistence (`frontend/src/lib/api.ts`)
- Updates `saveCandidateCV` to deterministically store multi-version records under candidate-isolated localStorage keys.
- Ensures reload persistence across browser sessions.

---

## 3. Verification & Test Evidence

### 3.1 Dedicated Test Suite: `frontend/e2e/cv-versioning.spec.ts`
Six dedicated end-to-end tests were implemented and verified with Playwright:
1. `CVVER-01-01`: CV Library displays active version badge (`v1.0`) and version history button. (`PASSED`)
2. `CVVER-01-02`: Version History modal opens and displays immutable snapshot details. (`PASSED`)
3. `CVVER-01-03`: CV Builder auto-increments version to `v2.0` on save without overwriting `v1.0`. (`PASSED`)
4. `CVVER-01-04`: Returning to CV Library reflects active `v2.0` and 2 versions in history. (`PASSED`)
5. `CVVER-01-05`: Page reload maintains immutable version history and active version. (`PASSED`)
6. `CVVER-01-06`: Loading historical snapshot from modal opens studio with snapshot version. (`PASSED`)

```
Running 6 tests using 1 worker

  ok 1 [chromium-desktop] › e2e\cv-versioning.spec.ts:23:7 › WP-05: Immutable CV Version Creation & Save (CVVER-01) › CVVER-01-01: CV Library displays active version badge (v1.0) and version history button (1.1s)
  ok 2 [chromium-desktop] › e2e\cv-versioning.spec.ts:39:7 › WP-05: Immutable CV Version Creation & Save (CVVER-01) › CVVER-01-02: Version History modal opens and displays immutable snapshot details (1.1s)
  ok 3 [chromium-desktop] › e2e\cv-versioning.spec.ts:62:7 › WP-05: Immutable CV Version Creation & Save (CVVER-01) › CVVER-01-03: CV Builder auto-increments version to v2.0 on save without overwriting v1.0 (1.1s)
  ok 4 [chromium-desktop] › e2e\cv-versioning.spec.ts:89:7 › WP-05: Immutable CV Version Creation & Save (CVVER-01) › CVVER-01-04: Returning to CV Library reflects active v2.0 and 2 versions in history (1.5s)
  ok 5 [chromium-desktop] › e2e\cv-versioning.spec.ts:116:7 › WP-05: Immutable CV Version Creation & Save (CVVER-01) › CVVER-01-05: Page reload maintains immutable version history and active version (1.8s)
  ok 6 [chromium-desktop] › e2e\cv-versioning.spec.ts:137:7 › WP-05: Immutable CV Version Creation & Save (CVVER-01) › CVVER-01-06: Loading historical snapshot from modal opens studio with snapshot version (1.8s)

  6 passed (10.4s)
```

---

## 4. Traceability Matrix Status

| ID | Requirement | Implementation | Test | Evidence | Status |
|:---|:---|:---|:---|:---|:---:|
| `CVVER-01` | Immutable CV version creation & save | `builder/page.tsx`, `candidate/cvs/page.tsx`, `api.ts` | `cv-versioning.spec.ts` | 6/6 versioning tests passed, reload verified | **PASSED** |

---

## 5. Next Work Package

With WP-05 fully verified and completed, the active focus shifts to:
- **WP-06**: **CANDIDATE DASHBOARD TELEMETRY & MULTI-INDUSTRY GOALS**
- **WP-07**: **AUTHENTICATION UX & EXTENDED "REMEMBER ME" SESSION** (`AUTH-RM-01`)
