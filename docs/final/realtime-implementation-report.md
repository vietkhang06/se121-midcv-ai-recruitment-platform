# MatchProof — Realtime Architecture & Implementation Report
**Asynchronous Event Streaming, Worker Telemetry & Fallback Polling**

**Document Version**: 1.0.0  
**Authoritative Standards**: Spring Boot SSE / WebSocket architecture, Next.js React hydration, AI Worker Async Lifecycle  

---

## 1. Executive Summary

This report documents the design, evaluation, and implementation of realtime streaming and reactive status synchronization within MatchProof. Realtime capabilities are strategically focused on long-running AI inference flows (CV extraction, vector indexing, and candidate pipeline notifications) rather than arbitrarily applied to static catalog views.

---

## 2. Event Streaming Architecture

```
[Candidate / Recruiter Client]
       │
       ├─ (1) Upload PDF/DOCX (POST /api/v1/cv/upload)
       │         │
       │         ▼
[Spring Boot Backend] ── (2) Enqueue Async Task ──► [Python AI Worker]
       │                                                    │
       │                                             (3) Chunk & Parse
       │                                             (4) Extract Entities
       │                                             (5) Vector Embed (1536D)
       │                                                    │
       ├◄─ (6) SSE Telemetry Event Stream ──────────────────┘
       │     (data: { stage: 'PROCESSING', progress: 65% })
       │
       ▼
[Next.js Client UI]
- Animated Progress Ring
- Realtime Lifecycle Badges (QUEUED -> PROCESSING -> REVIEW)
- Fallback Exponential Polling (500ms, 1s, 2s, 4s)
```

---

## 3. Supported Realtime Flows

| Flow Domain | Event Channel | Transport | Payload Telemetry |
| :--- | :--- | :--- | :--- |
| **CV Document Parsing** | `/api/v1/cv/events/{taskId}` | Server-Sent Events (SSE) | Stage (`UPLOADING`, `QUEUED`, `PROCESSING`, `COMPLETED`), extracted entity count |
| **AI Matching Engine** | `/api/v1/matching/status/{id}` | Reactive Event Stream | Vector cosine similarity progress, criteria fulfillment status |
| **Recruiter Pipeline Updates** | `/api/v1/recruiter/telemetry` | SSE / WebSocket | New applicant notification, status transition (`SUBMITTED` → `SHORTLISTED`) |
| **Candidate Match Report** | `/api/v1/candidate/reports` | Event Channel | Notification when recruiter shortlists application or requests interview |

---

## 4. Resilience & Fallback Polling Strategy

To ensure zero downtime in environments where persistent HTTP/2 SSE connections are dropped or restricted by corporate firewalls/proxies:
1. **Heartbeat Pings**: SSE streams emit a `keep-alive` comment every 15 seconds.
2. **Exponential Backoff Fallback**: If the SSE stream disconnects, the client seamlessly falls back to periodic status polling at intervals:
   $$T_{\text{poll}} = \min(500 \text{ms} \cdot 2^{n}, 4000 \text{ms})$$
3. **Idempotent State Ingestion**: Every status update includes a monotonically increasing revision sequence ID to prevent race conditions or out-of-order state mutations.

---

## 5. UI Implementation Highlights

In `frontend/src/components/cv/CVUploadModal.tsx`:
- Candidates see immediate visual progress through dedicated stages:
  - `IDLE` (Drag & drop file upload)
  - `UPLOADING` (File transmission)
  - `QUEUED` (Distributed worker queue)
  - `PROCESSING` (Entity & technical skill extraction)
  - `COMPLETED` / `REVIEW` (Candidate inspection & skill editing with `SkillAutocomplete`)
  - `FAILED` (Deterministic error handling with one-click retry)
