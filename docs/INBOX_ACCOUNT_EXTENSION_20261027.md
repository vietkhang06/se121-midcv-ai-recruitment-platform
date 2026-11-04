# Inbox & account workspace — implementation contract

This extension preserves the existing CV extraction, original-file immutability, human confirmation, deterministic matching, OAuth identity and recruiter decision rules. V28 is additive. The only new runtime dependency is Spring Boot Mail; no frontend dependencies or lockfiles change.

## Authorization and data

All `/api/v1/inbox` endpoints require the existing application Bearer JWT. Candidate-only saved jobs, cover letters and profile views are owned by the authenticated user. HR can open a conversation only for an application belonging to their current company. Every conversation read/write rechecks participant identity and current recruiter-company relationship. Unknown/unauthorized IDs return 404. Suspended/deactivated users cannot use Inbox; sends also require an active recipient and company. Only the blocker can unblock. Administrators do not receive an implicit right to read private conversations.

Writes are transactional, using JdbcTemplate with the existing transaction manager. Notifications from application submission/status changes share the application transaction. The SMTP outbox is visible to the dispatcher only after commit. Message retry uniqueness is `(conversation_id,sender_id,client_id)`. A retry returns the original message. Sends are serialized per conversation and sender; the per-sender limit is 30 messages per minute. User rows use `FOR NO KEY UPDATE` to avoid cross-recipient foreign-key lock conflicts. Pagination and body limits bound request size; this is not a distributed abuse-prevention gateway.

## Endpoints

All responses use the existing ApiResponse envelope. New account/settings/list DTO fields use the snake_case names listed below. Identifiers are UUIDs, timestamps UTC ISO strings, pages zero-based with 30 rows. Message pages contain 50 records in chronological order and a `nextBefore` UUID cursor using timestamp plus ID ordering.

| Method | Path below `/api/v1/inbox` | Data / behavior |
|---|---|---|
| GET | `/account` | id, email, full_name, email_verified, role, account_plan, email_available |
| GET / PUT | `/preferences` | full replacement: application_alerts, message_alerts, profile_alerts, job_alerts, email_alerts, job_keyword, job_location |
| GET | `/unread` | notifications/messages counts for the authenticated owner |
| GET | `/notifications?page=0` | persisted notifications, newest first |
| POST | `/notifications/{id}/read`, `/notifications/read-all` | owner-only read markers |
| GET | `/contacts?page=0` | HR's company applications, no global directory |
| POST | `/conversations` | `{applicationId}`; idempotent open by HR/application |
| GET | `/conversations?page=0`, `/conversations/{id}` | member-only summaries including deep-linked threads |
| GET | `/conversations/{id}/messages?before=<UUID>` | `{items,nextBefore}` |
| POST | `/conversations/{id}/messages` | `{clientId,body}`; nonempty plain text, max 4,000 characters |
| POST | `/conversations/{id}/read` | `{through:messageUUID}`; marks only peer messages through that cursor |
| POST | `/conversations/{id}/action` | `{action:"accept"|"block"|"unblock"}` |
| GET | `/jobs?saved=false&page=0` | saved jobs or published active-company jobs matching saved literal keyword/location |
| GET / PUT | `/jobs/{id}/saved` | saved boolean / `{saved:boolean}`; owner/job uniqueness |
| GET / POST | `/letters` | list/create `{title,body}`; title 160/body 12,000 characters |
| PUT / DELETE | `/letters/{id}` | owner-only update/delete |
| GET | `/profile-views?page=0` | actual authorized application-detail views, latest per recruiter/application |
| PUT | `/password` | `{currentPassword,newPassword}`; verify current BCrypt hash and invalidate earlier signed JWTs |
| GET / POST | `/upgrade-request` | read/create one durable request; notify active admins; no payment or automatic plan change |

## Notification sources

- Successful application submission: candidate and current company recruiters.
- Recruiter status change: candidate, only when status differs.
- Authorized application-detail view: latest timestamp; first view for each recruiter/application generates a notification.
- Recruiter invitation and incoming message: peer notifications, without putting private message content into email.
- Newly published job: only active, opted-in candidates whose saved keyword/location literally match, case-insensitively. Unique partial index limits one alert per user/job, including publication retries.
- Account upgrade: durable request and admin notification linking to existing user-plan management.

Category flags govern generation of notifications, not storage of messages or unread message counts. Application/message/profile flags default on. New-job/email flags default off. No historical events or counts are synthesized.

## UI and transport

New pages inherit Retro palette and locally hosted Vietnamese-safe IBM Plex Mono; VI/EN and light/dark remain available. Menus use native disclosures, actual identity/verification/plan, bounded scrolling, outside/Escape dismissal. Mobile chat switches between list and conversation pane. React renders message text without HTML injection.

Authenticated polling while visible: messages 3s, threads 5s, badge/notifications 15s. This is not WebSocket, browser push, typing or online presence. Read receipts are submitted through the latest fetched cursor when the document is focused and the log is at the bottom. Unsent drafts survive thread switching within the workspace; only sent messages are durable.

Cover letters are independently saved text with TXT export; they are not automatically attached to applications or rendered as PDF. Job suggestions are criteria filters, not fabricated AI rankings. Profile views begin when this extension is deployed and are not backfilled. Password change is not OAuth-only password recovery. Token invalidation uses a signed millisecond issuance claim; old tokens fall back to signed `iat`.

## SMTP and test scope

Notification SMTP is separate from the original registration-email implementation. Environment variables and application steps are in the delivered READ_FIRST.md. The outbox retries up to 5 times, at most 10 per batch. Sending is at-least-once across the remote-acceptance/local-commit failure window, not exactly-once.

`InboxIntegrationTest` is gated to local database `midcv_inbox_test`. `scripts/Test-MidcvInbox.ps1` creates a separate pgvector PostgreSQL 16 container to run it. See the package report for actual executed engine/environment and remaining native Windows/provider limits. No tests should target the application database.
