# Seed local MidCV demo jobs

`seed-midcv-demo.ps1` calls the authenticated MidCV API. It refuses non-local base URLs and requires `/actuator/health` to return `UP`. It does not connect to PostgreSQL directly.

## Seed three published JDs

From the repository root:

```powershell
.\scripts\seed-midcv-demo.ps1
```

The script prompts for an existing HR email and hidden password. Alternatively, set `MIDCV_HR_EMAIL` and `MIDCV_HR_PASSWORD` in the current PowerShell process. A verified HR company is preferred and left unchanged. Existing jobs with the exact `[MIDCV-DEMO-*]` titles are reused; a prior matching draft is published through the API. No existing job fields are overwritten.

If there is no HR account, pass `-CreateHrIfMissing`. Use an unused `-HrEmail` or `MIDCV_HR_EMAIL`; the HR password is prompted securely or read from `MIDCV_HR_PASSWORD`. Before registering, the script verifies an existing Admin login (prompted securely or from `MIDCV_ADMIN_EMAIL` / `MIDCV_ADMIN_PASSWORD`). It uses the registration response's development verification token only when the real API supplies one. It submits and approves only the exact fictional company name `MidCV Local Demo Company [MIDCV-LOCAL-DEMO]` through recruiter/Admin APIs. Its audit note states that this local approval is not legal business verification. Unmarked or real companies are never approved by the script.

If the supplied HR email already exists but is unverified, the seeder does not register it again. It requests a resend through `/api/v1/auth/resend-verification` (respecting the backend's 60-second resend limit), asks you to open and follow the actual email link, then retries login. With `EMAIL_MODE=SMTP`, use the configured mailbox/Mailpit UI. The verification token is never requested, pasted, printed, or written to the report. With `EMAIL_MODE=MOCK`, a new registration may be verified from its registration response; the existing resend API intentionally does not return a token, so an existing unverified account must be completed through the normal verification email flow.

## Optional applications

Applications are not created unless `-Apply` is present. Supply the existing candidate profile ID and an existing candidate-owned CV ID whose latest version is already `CONFIRMED`; candidate login is prompted securely or supplied through `MIDCV_CANDIDATE_EMAIL` / `MIDCV_CANDIDATE_PASSWORD`.

```powershell
.\scripts\seed-midcv-demo.ps1 -Apply -CandidateId '<candidate-profile-uuid>' -CvId '<confirmed-cv-uuid>'
```

The seeder checks candidate ownership and confirmation through the real CV APIs, skips existing applications for the same candidate/job, and never creates a CV or hiring decision. Matching inspection is polled for up to 15 seconds per application by default; change this with `-MatchingWaitSeconds`.

Each run prints the company verification state and job IDs/states. With `-Apply`, it also prints application IDs and observed matching states. A timestamped redacted JSON report is written in the repository root (or to `-ReportPath`) outside `backend/target`; it contains API method/path/status records and IDs/states, never passwords, bearer tokens, or verification tokens.

## Idempotency check

Run the same command twice with the same HR account (and same candidate/CV if applying). On the second run, the three marked jobs are reported as existing and no duplicate job or application is submitted. Existing jobs are never edited. A marked draft left by an interrupted first run may be published, but its content is not replaced.
