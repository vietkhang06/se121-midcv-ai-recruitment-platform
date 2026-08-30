# DEVELOPMENT WORKFLOW SPECIFICATION (REVISED)

Tài liệu này đặc tả Quy trình Phát triển phần mềm (Development Workflow), Quy chuẩn Git Branch, Quy ước Commit (Conventional Commits), và Bộ sưu tập Test API Bruno cập nhật cho cả 2 con đường CV, Quick Apply và Secondary GitHub Assessment.

---

## 1. STRATEGY NHÁNH GIT VÀ QUY CƯỚC COMMIT

* **Nhánh chính:** `main` (Production Ready), `develop` (Integration).
* **Nhánh tính năng:** `feature/<scope>-<feature-name>` (VD: `feature/cv-builder-pdf`, `feature/github-sync-worker`).
* **Conventional Commits:**
  * `feat(cv-builder): add industry template recommendation engine`
  * `feat(application): implement immutable application CV snapshot`
  * `feat(github): add secondary language distribution analysis`
  * `fix(matching): ensure graceful fallback when github API is rate-limited`

---

## 2. QUY TRÌNH KIỂM THỬ API BẰNG BRUNO (UPDATED BRUNO COLLECTION)

Thư mục bộ sưu tập API Bruno tại `docs/bruno-api-collection/`:

```text
docs/bruno-api-collection/
├── bruno.json
├── environments/
│   └── Local-Dev.bru
├── 01-Onboarding-Auth/
│   ├── FirstVisit-Onboarding.bru
│   ├── Register-Candidate.bru
│   ├── Register-HR-With-Company.bru
│   └── Login.bru
├── 02-Jobs-MultiIndustry/
│   ├── Browse-Public-Jobs.bru
│   ├── Create-Job-Draft.bru
│   └── Publish-Job-Verified.bru
├── 03-CV-Two-Paths/
│   ├── PathA-Upload-CV.bru
│   ├── PathB-CVBuilder-Save.bru
│   └── Export-CV-PDF.bru
├── 04-QuickApply-And-Snapshot/
│   └── Quick-Apply-With-Snapshot.bru
├── 05-GitHub-Assessment/
│   ├── Link-GitHub.bru
│   └── Sync-GitHub-Data.bru
└── 06-Matching-Ranking/
    ├── Get-Candidate-Ranking.bru
    ├── Get-Core-Matching-Report.bru
    └── Get-GitHub-Assessment-Report.bru
```
