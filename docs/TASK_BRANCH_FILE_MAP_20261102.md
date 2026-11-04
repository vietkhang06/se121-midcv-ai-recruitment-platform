# File ownership map for the two-week branches

This is a review/staging aid for the proposed task branches. It is not a Git commit manifest because the uploaded source archive has no `.git` history.

| Task branch | Primary files |
|---|---|
| `feat/W3-AI-01-ocr-vietnamese-correction` | `ai-worker/app/services/ocr_text_correction.py`; `ai-worker/app/services/cv_structuring_service.py`; `ai-worker/app/services/cv_parser.py`; `ai-worker/app/config.py`; `ai-worker/app/api/endpoints.py`; `ai-worker/tests/test_ocr_text_correction.py`; `ai-worker/tests/test_cv_parser_ocr_correction_integration.py`; `ai-worker/tests/test_cv_structuring_ocr_correction.py`; `backend/src/main/java/com/platform/recruitment/ai/AiWorkerClient.java`; `backend/src/main/java/com/platform/recruitment/worker/PipelineWorker.java`; `backend/src/main/java/com/platform/recruitment/cv/CVReviewResponse.java`; `frontend/src/types/index.ts`; `frontend/src/components/cv/CVExtractionReviewModal.tsx` |
| `fix/W3-BE-01-cv-upload-reliability` | `backend/src/main/java/com/platform/recruitment/document/Documents.java`; `backend/src/main/java/com/platform/recruitment/cv/CVService.java`; `backend/src/test/java/com/platform/recruitment/FileStorageRobustnessTest.java`; `backend/src/test/java/com/platform/recruitment/cv/CvUploadFilenameValidationTest.java` |
| `fix/W3-BE-02-sse-processing-resilience` | `backend/src/main/java/com/platform/recruitment/cv/CVController.java`; `backend/src/main/java/com/platform/recruitment/cv/CvProcessingSseService.java`; `backend/src/test/java/com/platform/recruitment/CVProcessingSseTest.java`; `backend/src/test/java/com/platform/recruitment/cv/CvSseAuthorizationHeaderTest.java` |
| `fix/W3-BE-03-jpa-transaction-boundaries` | `backend/src/main/java/com/platform/recruitment/company/service/CompanyVerificationService.java`; `backend/src/test/java/com/platform/recruitment/TaskHttpAcceptanceTest.java`; `backend/src/main/resources/application.yml` |
| `feat/W3-AI-02-cv-jd-pipeline-integrity` | `backend/src/test/java/com/platform/recruitment/cv/ConfirmedCvInputTest.java`; related existing invariant suites: `AuditRemediationRegressionTest`, `ApplicationSnapshotImmutableTest`, `MatchingFactorAndPolicyTest`, `GoldenMatchingCasesTest` |
| `test/W4-QA-01-cv-pipeline-e2e` | `frontend/e2e/fullstack-cv-pipeline-live.spec.ts`; `frontend/e2e/fullstack-live-acceptance.spec.ts` |
| `chore/W4-DO-01-production-readiness` | `.env.production.example`; `docker-compose.production.yml`; `Caddyfile`; `backend/Dockerfile`; `backend/src/main/resources/application-prod.yml`; `ai-worker/Dockerfile`; `ai-worker/.dockerignore`; `frontend/Dockerfile`; `frontend/.dockerignore`; `scripts/Deploy-MidcvProduction.ps1`; `scripts/midcv_backup.py`; `scripts/Test-MidcvRestartPersistence.ps1`; `scripts/tests/test_midcv_backup.py`; `.gitignore` |
| `docs/W4-PM-01-release-acceptance` | `docs/EXECUTION_PLAN_20261102.md`; `docs/TASK_EXECUTION_EVIDENCE_20261102.md`; `docs/TASK_BRANCH_FILE_MAP_20261102.md`; `docs/releases/RELEASE_ACCEPTANCE_E04_20261101.md` |

## Shared-file staging warning

`CVService.java` participates in upload reliability and OCR review projection; `PipelineWorker.java` participates in passing the OCR-used flag and persisting the raw extraction payload. If you need strictly one task per commit, use `git add -p` and review each hunk. If the team prefers simpler traceability over granular commits, merge the related W3 changes and use one integration commit with the relevant combined scope.

## Carry-forward from the 01/11 patch

The cumulative overlay also retains earlier work from the previous task batch (including Admin/company verification, RBAC/CORS/security matrix, AI config persistence, prior acceptance docs and production assets). These are included so this overlay can be applied to the original source ZIP even if the earlier patch was not applied. If the team has already applied that patch, review the diff and avoid duplicate commits.
