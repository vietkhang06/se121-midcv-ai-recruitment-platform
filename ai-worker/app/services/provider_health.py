import time
import socket
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlparse
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Cache storage and TTL for provider reachability probes
_cached_provider_health: Optional[Dict[str, Any]] = None
_last_provider_check_timestamp: float = 0.0
DEFAULT_CACHE_TTL_SECONDS: float = 15.0


def is_tcp_reachable(url: str, timeout: float = 0.3) -> bool:
    """
    Fast TCP socket check to prevent long connect timeouts (e.g. IPv6 dual-stack delays on Windows)
    when probing local or remote services.
    """
    if not url:
        return False
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        # Map 'localhost' to IPv4 127.0.0.1 to avoid Windows IPv6 resolution latency
        if host.lower() == "localhost":
            host = "127.0.0.1"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            sock.connect((host, port))
            return True
    except Exception:
        return False


def check_primary_provider(timeout: float = 1.0) -> Dict[str, Any]:
    """
    Probes OpenAI-compatible primary provider reachability and verifies if the
    configured model identifier exists on the endpoint.
    """
    primary_configured = bool(
        settings.LLM_PRIMARY_BASE_URL and settings.LLM_PRIMARY_API_KEY and settings.LLM_PRIMARY_MODEL
    )
    if not primary_configured or not settings.LLM_PRIMARY_ENABLED:
        return {
            "provider": settings.LLM_PRIMARY_PROVIDER,
            "configured": primary_configured,
            "reachable": False,
            "model": settings.LLM_PRIMARY_MODEL,
            "model_resolved": False
        }

    # Fast TCP connectivity pre-check (300ms timeout)
    if not is_tcp_reachable(settings.LLM_PRIMARY_BASE_URL, timeout=0.3):
        return {
            "provider": settings.LLM_PRIMARY_PROVIDER,
            "configured": True,
            "reachable": False,
            "model": settings.LLM_PRIMARY_MODEL,
            "model_resolved": False
        }

    # Endpoint is reachable on TCP, perform lightweight GET /models check
    base_url = settings.LLM_PRIMARY_BASE_URL
    if "://localhost:" in base_url or base_url.startswith("http://localhost"):
        base_url = base_url.replace("localhost", "127.0.0.1", 1)

    models_url = f"{base_url}/models"
    reachable = False
    model_resolved = False

    try:
        headers = {
            "Authorization": f"Bearer {settings.LLM_PRIMARY_API_KEY}",
            "Accept": "application/json"
        }
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(models_url, headers=headers)
            # Only HTTP 200 represents a valid, responding model provider
            if resp.status_code == 200:
                data = resp.json()
                model_ids = []
                if isinstance(data, dict):
                    if "data" in data and isinstance(data["data"], list):
                        model_ids = [m.get("id") for m in data["data"] if isinstance(m, dict)]
                    elif "models" in data and isinstance(data["models"], list):
                        model_ids = [m.get("name") or m.get("id") for m in data["models"] if isinstance(m, dict)]

                # Check whether configured model is resolved
                target_model = settings.LLM_PRIMARY_MODEL
                if not model_ids:
                    # Some proxies return empty data array on 200; consider reachable if 200 OK
                    model_resolved = True
                else:
                    model_resolved = any(
                        m == target_model or m.endswith(f"/{target_model}") or target_model.endswith(f"/{m}")
                        for m in model_ids if isinstance(m, str)
                    )
                reachable = model_resolved
    except Exception as e:
        logger.debug(f"Primary LLM health check probe failed: {e}")
        reachable = False
        model_resolved = False

    return {
        "provider": settings.LLM_PRIMARY_PROVIDER,
        "configured": True,
        "reachable": reachable,
        "model": settings.LLM_PRIMARY_MODEL,
        "model_resolved": model_resolved
    }


def check_ollama_provider(timeout: float = 1.0) -> Dict[str, Any]:
    """
    Probes local Ollama fallback engine reachability and verifies if the
    configured fallback model and embedding model are present in tags.
    """
    if not settings.LLM_FALLBACK_ENABLED:
        return {
            "provider": settings.LLM_FALLBACK_PROVIDER,
            "enabled": False,
            "reachable": False,
            "model": settings.OLLAMA_CHAT_MODEL,
            "model_resolved": False
        }

    # Fast TCP connectivity pre-check (300ms timeout)
    if not is_tcp_reachable(settings.OLLAMA_BASE_URL, timeout=0.3):
        return {
            "provider": settings.LLM_FALLBACK_PROVIDER,
            "enabled": True,
            "reachable": False,
            "model": settings.OLLAMA_CHAT_MODEL,
            "model_resolved": False
        }

    base_url = settings.OLLAMA_BASE_URL
    if "://localhost:" in base_url or base_url.startswith("http://localhost"):
        base_url = base_url.replace("localhost", "127.0.0.1", 1)

    tags_url = f"{base_url}/api/tags"
    reachable = False
    model_resolved = False

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(tags_url)
            if resp.status_code == 200:
                tags = resp.json().get("models", [])
                tag_names = [m.get("name", "") for m in tags if isinstance(m, dict)]
                target = settings.OLLAMA_CHAT_MODEL
                model_resolved = any(
                    t == target or t.startswith(f"{target}:") or (":" in target and t == target.split(":")[0])
                    for t in tag_names
                )
                reachable = model_resolved
    except Exception as e:
        logger.debug(f"Ollama health check probe failed: {e}")
        reachable = False
        model_resolved = False

    return {
        "provider": settings.LLM_FALLBACK_PROVIDER,
        "enabled": True,
        "reachable": reachable,
        "model": settings.OLLAMA_CHAT_MODEL,
        "model_resolved": model_resolved
    }


def get_llm_providers_health(force_refresh: bool = False, cache_ttl: float = DEFAULT_CACHE_TTL_SECONDS) -> Dict[str, Any]:
    """
    Returns the health status of configured LLM providers with TTL caching
    to prevent expensive repeated outbound requests during rapid readiness polling.
    """
    global _cached_provider_health, _last_provider_check_timestamp
    now = time.time()

    if not force_refresh and _cached_provider_health is not None:
        if now - _last_provider_check_timestamp < cache_ttl:
            return _cached_provider_health

    primary_health = check_primary_provider()
    ollama_health = check_ollama_provider()

    result = {
        "primary": primary_health,
        "fallback": ollama_health
    }

    _cached_provider_health = result
    _last_provider_check_timestamp = now
    return result
