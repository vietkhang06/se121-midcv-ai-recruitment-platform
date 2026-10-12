import pytest
import time
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.provider_health import (
    is_tcp_reachable,
    check_primary_provider,
    check_ollama_provider,
    get_llm_providers_health,
)


def test_is_tcp_reachable_invalid_or_closed_port():
    # Loopback port 1 is almost certainly closed
    assert is_tcp_reachable("http://127.0.0.1:1", timeout=0.1) is False
    assert is_tcp_reachable("", timeout=0.1) is False


def test_provider_health_ttl_caching():
    # Force refresh first
    res1 = get_llm_providers_health(force_refresh=True)
    t0 = time.time()

    # Immediate second call should be cached and return identical reference
    res2 = get_llm_providers_health(force_refresh=False)
    assert res1 is res2

    # Verify that during rapid polling, cached results are returned instantly
    start = time.perf_counter()
    for _ in range(50):
        get_llm_providers_health(force_refresh=False)
    elapsed = time.perf_counter() - start
    assert elapsed < 0.05, f"Cached provider checks should be sub-millisecond, took {elapsed}s"


def test_check_primary_provider_model_resolution():
    with patch("app.services.provider_health.is_tcp_reachable", return_value=True):
        # Case 1: Provider returns 200 with model in list
        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": [{"id": settings.LLM_PRIMARY_MODEL}]}

        with patch("httpx.Client.get", return_value=mock_resp):
            info = check_primary_provider(timeout=1.0)
            assert info["reachable"] is True
            assert info["model_resolved"] is True

        # Case 2: Provider returns 200 but model is NOT in list
        mock_resp_missing = Mock()
        mock_resp_missing.status_code = 200
        mock_resp_missing.json.return_value = {"data": [{"id": "some-unrelated-model"}]}

        with patch("httpx.Client.get", return_value=mock_resp_missing):
            info2 = check_primary_provider(timeout=1.0)
            assert info2["reachable"] is False
            assert info2["model_resolved"] is False

        # Case 3: Provider returns 404 (must NOT be treated as healthy)
        mock_resp_404 = Mock()
        mock_resp_404.status_code = 404

        with patch("httpx.Client.get", return_value=mock_resp_404):
            info3 = check_primary_provider(timeout=1.0)
            assert info3["reachable"] is False
            assert info3["model_resolved"] is False


def test_check_ollama_provider_model_resolution():
    with patch("app.services.provider_health.is_tcp_reachable", return_value=True):
        # Case 1: Model present in tags
        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"models": [{"name": settings.OLLAMA_CHAT_MODEL}]}

        with patch("httpx.Client.get", return_value=mock_resp):
            info = check_ollama_provider(timeout=1.0)
            assert info["reachable"] is True
            assert info["model_resolved"] is True

        # Case 2: Model not present in tags
        mock_resp_missing = Mock()
        mock_resp_missing.status_code = 200
        mock_resp_missing.json.return_value = {"models": [{"name": "llama3:latest"}]}

        with patch("httpx.Client.get", return_value=mock_resp_missing):
            info2 = check_ollama_provider(timeout=1.0)
            assert info2["reachable"] is False
            assert info2["model_resolved"] is False


def test_health_check_endpoint_contract_and_speed():
    client = TestClient(app)
    start = time.perf_counter()
    resp = client.get("/internal/ai/health")
    duration = time.perf_counter() - start

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["UP", "DEGRADED"]
    assert "llm" in data
    assert "primary" in data["llm"]
    assert "fallback" in data["llm"]
    assert "model_resolved" in data["llm"]["primary"]
    assert "model_resolved" in data["llm"]["fallback"]

    # Verify second consecutive call returns quickly from cache
    start2 = time.perf_counter()
    resp2 = client.get("/internal/ai/health")
    duration2 = time.perf_counter() - start2
    assert resp2.status_code == 200
    assert duration2 < 0.05, f"Subsequent health check should be served from cache in <50ms, took {duration2}s"


def test_nonexistent_endpoint_returns_404():
    client = TestClient(app)
    resp = client.get("/internal/ai/nonexistent-route-health-check")
    assert resp.status_code == 404
