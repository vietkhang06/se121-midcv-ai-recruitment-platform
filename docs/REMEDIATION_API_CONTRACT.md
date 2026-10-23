# Corrected API contracts — approved remediation

This document describes source behavior, not observed live HTTP responses. Candidate workflow uses `MatchingEngineService` (existing algorithm version); HR document screening uses `Scoring.VERSION`. No new scoring formula is introduced and these purposes are not silently interchanged.

## Candidate preview

`POST /api/v1/candidate/match/{jobId}?cvId={ownedCvId}` remains candidate-only. Ownership is checked before matching. With no cvId, the existing default-CV choice applies. The latest selected CVVersion must be CONFIRMED and contain professional structured data; a draft/processing/failed/missing version is rejected. The job must be PUBLISHED.

Response data is `MatchScoreResponse`: id, jobId, candidateId, applicationId, overallScore, coreScore, githubScore, status, algorithmVersion, createdAt. In preview, id/applicationId/createdAt may be null because no application or match result is persisted. Do not use preview as an application submission or expect an inspection endpoint for its nonexistent match ID. The DTO avoids serializing the JPA application/user graph.

## Application submission and recalculation

`POST /api/v1/candidate/applications` still receives jobId/cvId. It selects the latest version of that CV and requires it to be CONFIRMED. `appliedCvVersion` is frozen on the application. The snapshot holds that version's structured JSON and raw text. User edits fork a new draft; they do not change historical matching inputs. Old rows with no applied confirmed version are rejected for recalculation, not silently assigned a current CV.

ApplicationResponse now adds nullable `appliedCvVersionId` and `appliedCvVersionNumber`. Frontend displays the actual number or explicitly unavailable information for old records. Other response fields remain compatible.

Submission and matching remain synchronous and transactional. A matching exception propagates; it must not be ignored. Database rollback still requires PostgreSQL integration acceptance. No asynchronous outbox is added in this change.

## Ranking policy

`PUT /api/v1/jobs/{id}/matching-policy` retains the DTO shape; service/DTO validation now enforces the15% cap and the overall sum even while GitHub is disabled. Matching uses the saved Core/GitHub weights when the GitHub factor is applicable; unavailable/private/non-IT input retains overall=core. A GitHub weight above the documented15% cap cannot be used by the matching engine.

`POST /api/v1/jobs/{id}/matching/recalculate` keeps backend `ApiResponse<Integer>` (data is a nonnegative integer). The frontend helper converts it to `{recalculatedCount: data}` and rejects malformed responses; zero is valid. A literal object in backend data is not accepted as if it were a number.

## Legacy processing and access

Legacy POST processing CV/JD routes now pass the authenticated actor into the service. CV processing permits only its candidate owner and rejects reprocessing a confirmed/active CV. JD processing permits HR in the owning company or admin under the existing admin rule. The older service overloads resolve the authenticated security context and fail closed when none exists.

Document access is owner, admin, or HR linked by actual company/profile relations to the applied CV version or screening document version. The existence of any public/open job grants no access to an unrelated JD. Queue authorization follows the same company relation for MATCH/SCREEN_MATCH.

## Screening and versions

The existing HR-owned document screening workflow remains distinct from candidate confirmation/application. No candidate account or application is fabricated. The special CV extraction branch creates a vector for screening before it is ready to match; candidate extraction remains NEEDS_REVIEW and is not embedded prematurely.

`document_versions.normalized` retains extraction CVData. A pure adapter supplies canonical skill names, education levels and non-overlapping completed-date experience to existing Scoring, without overwriting extraction data. Missing/current/ambiguous dates remain unknown; no years are guessed. HR screenings are signalled READY_FOR_MATCH; candidate drafts NEEDS_REVIEW.

New screening selects a JD whose raw text equals the current job description (or job title when blank); otherwise a new document version is created. Old screenings keep their old JD references. Legacy application MATCH queue jobs delegate to MatchingEngineService and appliedCvVersion; the worker no longer reads nonexistent applications.cv_version_id/jd_version_id.

## Grounding policy

Only extraction output is checked: unsupported skills are removed with warnings; unsupported GPA/scale/display is null, never inferred. Java does not count as supported solely because JavaScript appears. Supported explicit3.6/4.0 or7.8/10 is preserved, including decimal commas. This conservative check is not a proof of factual correctness for every employer, date, description or paraphrase; human review remains required. User-added review edits are not deleted by this extraction validator.
