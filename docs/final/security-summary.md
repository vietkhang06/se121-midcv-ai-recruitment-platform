# Security Summary (`docs/final/security-summary.md`)

## 1. Multi-Tenant Authorization & Recruiter Isolation
Recruiters belong to specific verified companies. Any cross-tenant access attempt (e.g. Recruiter A requesting applicant data for a job posted by Company B) is intercepted at the service layer, returning **HTTP 403 Forbidden** (`UnauthorizedAccessException`).

## 2. File Upload & Storage Security
- **MIME & Extension Validation**: Only `.pdf`, `.docx`, `.doc` formats allowed. Maximum file size capped at 10 MB.
- **Path Traversal Protection**: Storage filenames are sanitized using UUID identifiers; path traversal characters (`..`, `/`) are stripped.
- **CV Privacy Protection**: Candidate CV files are stored in non-public directories (`./uploads/cvs/private`) and cannot be downloaded without valid candidate JWT authorization.

## 3. Log Privacy & Secret Audit
- System logs sanitize sensitive candidate data, passwords, Bearer tokens, and API keys.
- Workspace secret scan verified zero committed API keys or tokens in Git history.
