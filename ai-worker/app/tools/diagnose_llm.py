import sys
import os
import time
import uuid
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse
import httpx

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.services.llm.openai_compatible_client import OpenAICompatibleClient, classify_openai_compatible_error
from app.services.llm.ollama_client import OllamaClient
from app.services.llm.types import (
    LLMError,
    LLMModelNotFoundError,
    LLMAuthenticationError,
    LLMAuthorizationError,
    LLMTimeoutError,
    LLMNetworkError,
    sanitize_sensitive_string,
)

logger = logging.getLogger("diagnose_llm")


def sanitize_url(url: str) -> str:
    """Returns scheme://host:port/path without query params or userinfo."""
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        netloc = parsed.hostname or ""
        if parsed.port:
            netloc += f":{parsed.port}"
        return f"{parsed.scheme}://{netloc}{parsed.path}".rstrip("/")
    except Exception:
        return sanitize_sensitive_string(url)


def run_diagnostics(smoke_test: bool = False, correlation_id: Optional[str] = None) -> int:
    cid = correlation_id or str(uuid.uuid4())
    print("=" * 70)
    print("          MIDCV AI WORKER LLM DIAGNOSTIC REPORT          ")
    print("=" * 70)
    print(f"Correlation ID : {cid}")
    print(f"Timestamp      : {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print(f"Mode           : {'Smoke Test (Bounded Inference)' if smoke_test else 'Passive Diagnostic (No Inference)'}")
    print("-" * 70)

    # -------------------------------------------------------------
    # 1. Configuration Inspection (Safe - NO SECRETS)
    # -------------------------------------------------------------
    print("\n[1/3] CONFIGURATION STATE")
    print(f"  AI_PROVIDER                : {settings.AI_PROVIDER}")
    print(f"  LLM_PRIMARY_ENABLED        : {settings.LLM_PRIMARY_ENABLED}")
    print(f"  LLM_PRIMARY_PROVIDER       : {settings.LLM_PRIMARY_PROVIDER}")
    print(f"  LLM_PRIMARY_BASE_URL       : {sanitize_url(settings.LLM_PRIMARY_BASE_URL)}")
    print(f"  LLM_PRIMARY_API_KEY        : {'SET' if bool(settings.LLM_PRIMARY_API_KEY) else 'UNSET'}")
    print(f"  LLM_PRIMARY_MODEL          : {settings.LLM_PRIMARY_MODEL}")
    print(f"  LLM_PRIMARY_TIMEOUT_S      : {settings.LLM_PRIMARY_TIMEOUT_SECONDS}s")
    print(f"  LLM_PRIMARY_MAX_RETRIES    : {settings.LLM_PRIMARY_MAX_RETRIES}")
    print(f"  LLM_FALLBACK_ENABLED       : {settings.LLM_FALLBACK_ENABLED}")
    print(f"  LLM_FALLBACK_PROVIDER      : {settings.LLM_FALLBACK_PROVIDER}")
    print(f"  OLLAMA_BASE_URL            : {sanitize_url(settings.OLLAMA_BASE_URL)}")
    print(f"  OLLAMA_CHAT_MODEL          : {settings.OLLAMA_CHAT_MODEL}")
    print(f"  OLLAMA_TIMEOUT_S           : {settings.OLLAMA_TIMEOUT_SECONDS}s")
    print(f"  OLLAMA_NUM_PREDICT         : {settings.OLLAMA_NUM_PREDICT}")
    print(f"  OLLAMA_THINK               : {settings.OLLAMA_THINK}")

    exit_code = 0
    primary_reachable = False
    primary_models_available: List[str] = []
    primary_model_found = False

    ollama_reachable = False
    ollama_models_installed: List[str] = []
    ollama_model_installed = False

    # -------------------------------------------------------------
    # 2. Primary Provider Gateway Check
    # -------------------------------------------------------------
    print("\n[2/3] PRIMARY GATEWAY CONNECTIVITY & MODEL DISCOVERY")
    if not settings.LLM_PRIMARY_ENABLED:
        print("  Primary provider is DISABLED by configuration.")
    else:
        models_url = f"{settings.LLM_PRIMARY_BASE_URL}/models"
        headers = {
            "Authorization": f"Bearer {settings.LLM_PRIMARY_API_KEY}",
            "Content-Type": "application/json"
        }
        t0 = time.time()
        try:
            with httpx.Client(timeout=httpx.Timeout(5.0, connect=3.0)) as client:
                resp = client.get(models_url, headers=headers)
                latency_ms = int((time.time() - t0) * 1000)

                if resp.status_code == 200:
                    primary_reachable = True
                    print(f"  Gateway Reachability       : REACHABLE (status=200, latency={latency_ms}ms)")
                    try:
                        data = resp.json()
                        models_list = data.get("data", [])
                        primary_models_available = [m.get("id", "") for m in models_list if isinstance(m, dict)]
                        configured = settings.LLM_PRIMARY_MODEL
                        primary_model_found = configured in primary_models_available

                        print(f"  Configured Model           : {configured}")
                        print(f"  Configured Model Status    : {'FOUND' if primary_model_found else 'NOT_FOUND in gateway catalog'}")
                        if not primary_model_found:
                            print(f"  Available Gateway Models   : {', '.join(primary_models_available[:10]) or 'None'}")
                            print("  Actionable Guidance        : Update LLM_PRIMARY_MODEL in .env to match an available gateway model ID.")
                            exit_code = 1
                    except Exception as json_err:
                        print(f"  Models JSON parse error    : {json_err}")
                elif resp.status_code in (401, 403):
                    print(f"  Gateway Reachability       : AUTHENTICATION_FAILURE (status={resp.status_code}, latency={latency_ms}ms)")
                    print("  Actionable Guidance        : Check LLM_PRIMARY_API_KEY configuration.")
                    exit_code = 1
                elif resp.status_code == 404:
                    # Gateway does not support /models, but may still support /chat/completions
                    primary_reachable = True
                    print(f"  Gateway Reachability       : REACHABLE (status=404 on /models, gateway may not implement model list)")
                elif resp.status_code == 503:
                    # Classify wrapped upstream error
                    err_cls = classify_openai_compatible_error(resp.status_code, resp.text, "primary_gateway")
                    print(f"  Gateway Status 503         : {type(err_cls).__name__} (is_transient={err_cls.is_transient})")
                    print(f"  Detail                     : {sanitize_sensitive_string(resp.text[:300])}")
                    exit_code = 1
                else:
                    print(f"  Gateway Status             : HTTP {resp.status_code} (latency={latency_ms}ms)")
                    exit_code = 1
        except (httpx.ConnectError, httpx.NetworkError) as net_err:
            latency_ms = int((time.time() - t0) * 1000)
            print(f"  Gateway Reachability       : UNREACHABLE / CONNECTION REFUSED (latency={latency_ms}ms)")
            print(f"  Error Detail               : {sanitize_sensitive_string(str(net_err))}")
            print(f"  Actionable Guidance        : Ensure primary gateway at {sanitize_url(settings.LLM_PRIMARY_BASE_URL)} is running.")
            exit_code = 1
        except httpx.TimeoutException as to_err:
            latency_ms = int((time.time() - t0) * 1000)
            print(f"  Gateway Reachability       : TIMEOUT after 5.0s (latency={latency_ms}ms)")
            exit_code = 1

    # -------------------------------------------------------------
    # 3. Ollama Fallback Connectivity Check
    # -------------------------------------------------------------
    print("\n[3/3] OLLAMA FALLBACK CONNECTIVITY & MODEL VERIFICATION")
    if not settings.LLM_FALLBACK_ENABLED:
        print("  Fallback provider is DISABLED by configuration.")
    else:
        tags_url = f"{settings.OLLAMA_BASE_URL}/api/tags"
        t0 = time.time()
        try:
            with httpx.Client(timeout=httpx.Timeout(5.0, connect=3.0)) as client:
                resp = client.get(tags_url)
                latency_ms = int((time.time() - t0) * 1000)

                if resp.status_code == 200:
                    ollama_reachable = True
                    print(f"  Ollama Reachability        : REACHABLE (status=200, latency={latency_ms}ms)")
                    data = resp.json()
                    models_list = data.get("models", [])
                    ollama_models_installed = [m.get("name", "") for m in models_list if isinstance(m, dict)]

                    target_model = settings.OLLAMA_CHAT_MODEL
                    # Match exact or normalized tag (e.g. "model" vs "model:latest")
                    ollama_model_installed = any(
                        m == target_model or m.startswith(target_model + ":") or target_model.startswith(m + ":")
                        for m in ollama_models_installed
                    )

                    print(f"  Configured Ollama Model    : {target_model}")
                    print(f"  Installed Status           : {'INSTALLED' if ollama_model_installed else 'NOT_INSTALLED'}")
                    print(f"  Installed Models Count     : {len(ollama_models_installed)}")
                    if not ollama_model_installed:
                        print(f"  Available Ollama Models    : {', '.join(ollama_models_installed[:5]) or 'None'}")
                        print(f"  Actionable Guidance        : Install model via: ollama pull {target_model}")
                        exit_code = 1
                    else:
                        print(f"  Thinking Mode              : {'ENABLED' if settings.OLLAMA_THINK else 'DISABLED (Optimized for JSON speed)'}")
                else:
                    print(f"  Ollama Status              : HTTP {resp.status_code} (latency={latency_ms}ms)")
                    exit_code = 1
        except (httpx.ConnectError, httpx.NetworkError) as net_err:
            latency_ms = int((time.time() - t0) * 1000)
            print(f"  Ollama Reachability        : UNREACHABLE / CONNECTION REFUSED (latency={latency_ms}ms)")
            print(f"  Error Detail               : {sanitize_sensitive_string(str(net_err))}")
            print(f"  Actionable Guidance        : Start Ollama service (e.g., ollama serve).")
            exit_code = 1
        except httpx.TimeoutException:
            print(f"  Ollama Reachability        : TIMEOUT after 5.0s")
            exit_code = 1

    # -------------------------------------------------------------
    # 4. Optional Bounded Smoke Test Mode
    # -------------------------------------------------------------
    if smoke_test:
        print("\n" + "=" * 70)
        print("          BOUNDED SMOKE TEST INFERENCE (1 REQUEST EACH)          ")
        print("=" * 70)

        # Smoke Test Primary
        if primary_reachable and settings.LLM_PRIMARY_ENABLED:
            print("\n[Smoke Test] Primary Provider Request:")
            client = OpenAICompatibleClient(
                base_url=settings.LLM_PRIMARY_BASE_URL,
                api_key=settings.LLM_PRIMARY_API_KEY,
                model=settings.LLM_PRIMARY_MODEL,
                timeout_seconds=15.0,
                max_retries=0
            )
            prompt = [
                {"role": "system", "content": "You are a health probe. Reply ONLY with valid JSON: {\"status\": \"ok\"}"},
                {"role": "user", "content": "Ping"}
            ]
            t0 = time.time()
            try:
                res = client.chat_sync(prompt, correlation_id=f"{cid}-smoke-primary")
                latency_ms = int((time.time() - t0) * 1000)
                print(f"  Primary Smoke Test         : SUCCESS (latency={latency_ms}ms)")
                print(f"  Response Content           : {res.content[:100]}")
            except Exception as e:
                latency_ms = int((time.time() - t0) * 1000)
                print(f"  Primary Smoke Test         : FAILED (latency={latency_ms}ms)")
                print(f"  Failure Category           : {type(e).__name__}")
                print(f"  Failure Message            : {sanitize_sensitive_string(str(e))}")
                exit_code = 1
        else:
            print("\n[Smoke Test] Primary Provider: SKIPPED (gateway unreachable or unconfigured)")

        # Smoke Test Fallback (Ollama)
        if ollama_reachable and ollama_model_installed and settings.LLM_FALLBACK_ENABLED:
            print("\n[Smoke Test] Ollama Fallback Provider Request:")
            ollama = OllamaClient(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_CHAT_MODEL,
                timeout_seconds=30.0,
                max_retries=0,
                num_predict=128,
                think=settings.OLLAMA_THINK
            )
            prompt = [
                {"role": "system", "content": "You are a health probe. Reply ONLY with valid JSON: {\"status\": \"ok\"}"},
                {"role": "user", "content": "Ping"}
            ]
            t0 = time.time()
            try:
                res = ollama.chat_sync(prompt, correlation_id=f"{cid}-smoke-ollama")
                latency_ms = int((time.time() - t0) * 1000)
                print(f"  Ollama Smoke Test          : SUCCESS (latency={latency_ms}ms)")
                print(f"  Response Content           : {res.content[:100]}")
            except Exception as e:
                latency_ms = int((time.time() - t0) * 1000)
                print(f"  Ollama Smoke Test          : FAILED (latency={latency_ms}ms)")
                print(f"  Failure Category           : {type(e).__name__}")
                print(f"  Failure Message            : {sanitize_sensitive_string(str(e))}")
                exit_code = 1
        else:
            print("\n[Smoke Test] Ollama Fallback: SKIPPED (Ollama unreachable or model not installed)")

    print("\n" + "=" * 70)
    print(f"OVERALL DIAGNOSTIC RESULT: {'PASS (0)' if exit_code == 0 else 'FAIL (' + str(exit_code) + ')'}")
    print("=" * 70)
    return exit_code


if __name__ == "__main__":
    smoke_mode = "--smoke-test" in sys.argv
    sys.exit(run_diagnostics(smoke_test=smoke_mode))
