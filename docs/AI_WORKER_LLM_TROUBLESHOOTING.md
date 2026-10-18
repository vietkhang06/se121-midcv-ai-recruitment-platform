# AI Worker LLM Pipeline Troubleshooting & Operational Guide

> **MidCV / AI Recruitment Platform** — Comprehensive operational, diagnostic, and resolution guide for CV-structuring and LLM provider orchestration.

---

## 1. Request and Provider Execution Flow

The CV-structuring LLM pipeline executes in a strictly bounded, non-hallucinating sequence:

```text
Backend (Spring Boot)
   │
   │  POST /internal/ai/structure-cv
   │  { rawText, documentVersionId, correlationId }
   ▼
AI Worker Endpoint (FastAPI)
   │
   │  Propagates or generates `correlation_id` (UUID v4)
   ▼
CVStructuringService
   │
   │  1. Validates text bounds: 15 <= len(raw_text) <= 150,000 chars
   │  2. Assembles prompt: SYSTEM_PROMPT + canonical JSON schema
   ▼
FallbackLLMClient (Orchestrator)
   │
   ├──▶ [Step 1: Primary Provider Attempt]
   │       Calls OpenAICompatibleClient (POST {base_url}/chat/completions)
   │       Granular timeout: connect=10s, read=timeout_s, write=15s, pool=10s
   │       Wall-clock deadline guard: asyncio.wait_for(..., timeout_s + 5.0)
   │
   ├──▶ IF Primary Succeeds:
   │       Return LLMResponse immediately. (Ollama is strictly NEVER invoked)
   │
   ├──▶ IF Primary Fails:
   │       Classify upstream error via `classify_openai_compatible_error()`
   │       ├── Model/Resource Not Found (404, or 503 wrapping upstream 404):
   │       │     -> LLMModelNotFoundError (is_transient=False)
   │       │     -> Ineligible for fallback! Fail fast, raise immediately.
   │       ├── Auth/Forbidden/Bad Request (401, 403, 400):
   │       │     -> Ineligible for fallback! Fail fast, raise immediately.
   │       └── Transient Server/Network/Timeout/RateLimit (5xx, 429, timeout, connect err):
   │             -> Eligible for fallback (is_transient=True)
   │
   ├──▶ [Step 2: Fallback Provider Attempt (Conditional)]
   │       Only engaged if primary error is transient AND fallback_enabled=true:
   │       Calls OllamaClient (POST {base_url}/api/chat)
   │       Optimized: "think": False (disables runaway thinking tokens), num_predict=2048
   │       Granular timeout + wall-clock deadline guard
   │
   └──▶ IF Fallback also Fails:
           Raises composite LLMServerError preserving correlation_id and sanitized errors.
   ▼
StructuredCVValidator
   │
   ├── Validates JSON syntax and schema compliance
   ├── Bounded repair: At most 1 single repair prompt if JSON syntax or types mismatch
   └── Strictly preserves data integrity: Nulls for missing fields, zero hallucination
```

---

## 2. LLM Error Hierarchy & Safe Classification

All LLM errors inherit from `LLMError` (`app/services/llm/types.py`) and sanitize credentials before storing or emitting messages.

| Exception Class | HTTP / Upstream Code | `is_transient` | Fallback Eligible? | Root Cause Description |
|---|---|---|---|---|
| `LLMModelNotFoundError` | 404, or 503 wrapping `NOT_FOUND` | `False` | **NO (Fails fast)** | Model ID does not exist in provider catalog or upstream returned 404. |
| `LLMAuthenticationError` | 401 | `False` | **NO (Fails fast)** | Invalid, expired, or missing API key. |
| `LLMAuthorizationError` | 403 | `False` | **NO (Fails fast)** | Insufficient permissions / project quota block. |
| `LLMBadRequestError` | 400 | `False` | **NO (Fails fast)** | Malformed payload or unsupported parameter. |
| `LLMTimeoutError` | 408 / client deadline | `True` | **YES** | Read timeout, connect timeout, or wall-clock deadline exceeded. |
| `LLMRateLimitError` | 429 | `True` | **YES** | Concurrency or TPM rate limits hit. |
| `LLMServerError` | 500, 502, 503 (general) | `True` | **YES** | Transient server outage, gateway crash, or bad gateway. |
| `LLMNetworkError` | ConnectError / DNS failure | `True` | **YES** | Connection refused (`WinError 10061`), host unreachable. |
| `LLMInvalidResponseError` | 200 / 502 (invalid body) | `True` | **YES** | Empty body, missing choices, or non-JSON response. |

### Classification of HTTP 503 wrapping upstream 404

Upstream gateways (such as 9Router, Cloudflare AI Gateway, or reverse proxies) commonly return HTTP 503 when their upstream provider returns a 404:

```json
{
  "error": {
    "message": "[antigravity/gemini-3.6-flash-medium] [404]: Requested entity was not found.",
    "status": "NOT_FOUND"
  }
}
```

The function `classify_openai_compatible_error` (`app/services/llm/openai_compatible_client.py`) defensively inspects the structured JSON body:
1. Checks if `status == "NOT_FOUND"` or `code in ("404", "model_not_found")`.
2. Inspects message for explicit `"[404]"` or `"not found"` pattern.
3. If detected: maps directly to `LLMModelNotFoundError` with `is_transient=False`.
4. Result: `FallbackLLMClient` immediately aborts without wasting 180 seconds on Ollama fallback!

---

## 3. Provider Health Checks vs. Model Discovery vs. Live Inference

It is critical to distinguish the three verification tiers:

1. **TCP / Health Endpoint Reachability** (e.g. `GET /models`, `GET /api/tags`):
   - Proves network connectivity and socket open state.
   - **Does NOT prove** that the model can generate text or that credits/quotas are valid.
2. **Model Catalog Discovery** (e.g. comparing configured ID against `/models` data array):
   - Confirms that the gateway or local daemon knows about the configured model ID.
   - **Does NOT prove** that the model supports the requested prompt format or JSON schema.
3. **Live Inference (Smoke Test)**:
   - Issues a minimal synthetic request (`{"status": "ok"}`) with bounded token limit and verifies structured output.
   - The only authoritative test that the LLM pipeline is functional.

---

## 4. Configuration Reference

All settings are configured via `ai-worker/.env` (or project root `.env`).

| Variable Name | Default Value | Description |
|---|---|---|
| `AI_PROVIDER` | `auto` | Orchestration mode: `auto` (primary + fallback), `openai_compatible`, `ollama`. |
| `LLM_PRIMARY_ENABLED` | `true` | Enable or disable the primary OpenAI-compatible provider. |
| `LLM_PRIMARY_BASE_URL` | `http://localhost:20128/v1` | Base URL of the OpenAI-compatible gateway (e.g. 9Router or OpenAI). |
| `LLM_PRIMARY_API_KEY` | *(secret)* | Bearer API token for the primary gateway. |
| `LLM_PRIMARY_MODEL` | `ag/gemini-3.6-flash-high` | Model ID to pass to primary `/chat/completions`. |
| `LLM_PRIMARY_TIMEOUT_SECONDS` | `180` | Read timeout for primary requests. |
| `LLM_PRIMARY_MAX_RETRIES` | `1` | Max transient retry attempts for primary client. |
| `LLM_FALLBACK_ENABLED` | `true` | Enable or disable Ollama fallback. |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Endpoint of the local Ollama daemon. |
| `OLLAMA_CHAT_MODEL` | `dna5rm/granite4.2:3b-8k` | Local Ollama model tag. |
| `OLLAMA_TIMEOUT_SECONDS` | `180` | Read timeout for Ollama fallback. |
| `OLLAMA_MAX_RETRIES` | `0` | Max retries for Ollama (default 0 to avoid delays). |
| `OLLAMA_NUM_PREDICT` | `2048` | Maximum output tokens generated by Ollama. |
| `OLLAMA_THINK` | `false` | Explicitly disable thinking mode (`"think": False`) to prevent 180s timeouts on reasoning models. |

---

## 5. Safe Diagnostic Workflow

MidCV provides a non-invasive diagnostic utility: `app.tools.diagnose_llm`.

### 5.1 Passive Diagnostic Mode (Default - Zero Inference, Zero Credits)

```powershell
# From ai-worker directory
python -m app.tools.diagnose_llm
```

**Checks performed:**
- Validates environment variable state (`SET` vs `UNSET` without leaking keys).
- Pings primary gateway `/models` with a 5-second connection budget.
- Checks if the configured primary model ID is present in the gateway catalog.
- Pings Ollama `/api/tags` and checks if the configured local model is installed.
- Prints clear, actionable guidance.
- Exits with `0` (pass) or `1` (fail).

### 5.2 Bounded Smoke Test Mode (1 Single Probe Request)

```powershell
# From ai-worker directory
python -m app.tools.diagnose_llm --smoke-test
```

**Smoke test behavior:**
- Performs passive checks first.
- If primary is reachable: issues **at most 1 single probe request** asking for `{"status": "ok"}` with 15s timeout.
- If Ollama is reachable and model is installed: issues **at most 1 single probe request** with `num_predict=128`, `think=False`, and 30s timeout.
- Prints latency and sanitized response.

---

## 6. Diagnosing Common Failures

### Case A: Primary Gateway Connection Refused (`WinError 10061`)

**Diagnostic output:**
```text
Gateway Reachability : UNREACHABLE / CONNECTION REFUSED (latency=...ms)
Error Detail         : [WinError 10061] No connection could be made because the target machine actively refused it
Actionable Guidance  : Ensure primary gateway at http://localhost:20128/v1 is running.
```
**Resolution:**
1. Check if the local gateway (e.g., 9Router or proxy) is running.
2. If running on a different port or host, update `LLM_PRIMARY_BASE_URL` in `ai-worker/.env`.

---

### Case B: Upstream 404 NOT_FOUND Wrapped in HTTP 503

**Diagnostic output:**
```text
[fallback_orchestrator] event='primary_attempt_failed' error_category='model_not_found' fallback_eligible=False
[fallback_orchestrator] event='fallback_ineligible_abort'. Re-raising without invoking fallback.
```
**Resolution:**
1. The model specified in `LLM_PRIMARY_MODEL` does not exist on the upstream provider.
2. Check available models via `python -m app.tools.diagnose_llm`.
3. Update `LLM_PRIMARY_MODEL` in `ai-worker/.env` (e.g. from `antigravity/gemini-3.6-flash-medium` to `ag/gemini-3.6-flash-high` or the exact alias exposed by your gateway).

---

### Case C: Ollama Fallback Timeout (180.0s)

**Root cause:**
Reasoning models (like IBM Granite 4.2, Qwen, or DeepSeek-R1) run in thinking mode by default, outputting extensive `<thinking>` tokens. When paired with `OLLAMA_NUM_PREDICT=4096` and a large CV prompt, generation times exceed 180 seconds.

**Fix implemented:**
1. Payload passes `"think": False` directly to Ollama `/api/chat`.
2. `OLLAMA_NUM_PREDICT` defaults to `2048`.
3. With thinking disabled, response time drops from 180s+ (timeout) to **~2-5 seconds**!

**Verification command:**
```powershell
python -m app.tools.diagnose_llm --smoke-test
# Expected output:
# Ollama Smoke Test : SUCCESS (latency=~4800ms)
```

---

## 7. Tracing Requests via Correlation ID

Every request through the MidCV LLM stack carries a `correlation_id`.

### Example Log Trace:
```text
[fallback_orchestrator] event='primary_attempt_started' correlation_id='c5431998-560d-4d88-91f6-7856cf29296e'
[openai_compatible] status=503 body_length=152 model='ag/gemini-3.6-flash-high' correlation_id='c5431998-560d-4d88-91f6-7856cf29296e'
[fallback_orchestrator] event='primary_attempt_failed' correlation_id='c5431998-560d-4d88-91f6-7856cf29296e' error_category='model_not_found' fallback_eligible=False
[fallback_orchestrator] event='fallback_ineligible_abort' correlation_id='c5431998-560d-4d88-91f6-7856cf29296e' error_category='model_not_found'
```

### Searching Logs:
Search your application logs for the correlation ID:
```powershell
Select-String -Path "ai-worker.log" -Pattern "c5431998-560d-4d88-91f6-7856cf29296e"
```

---

## 8. Running Automated Tests

To verify LLM provider orchestration, error classification, and timeouts:

```powershell
cd ai-worker
pytest tests/test_openai_compatible_client.py tests/test_fallback_orchestration.py tests/test_phase2_llm_provider_chain_acceptance.py tests/test_provider_health.py -v
```

All 56 tests execute in ~14 seconds using mock boundaries without consuming live provider credits.
