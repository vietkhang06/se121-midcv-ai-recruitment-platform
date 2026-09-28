import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings, Settings
from app.tools.startup_check import run_startup_checks


def test_health_endpoint_contract():
    client = TestClient(app)
    res = client.get("/internal/ai/health")
    assert res.status_code == 200
    data = res.json()

    # Section 19 health response structure assertions
    assert data["status"] == "UP"
    assert data["documentExtraction"]["status"] == "UP"
    assert "llm" in data
    assert "primary" in data["llm"]
    assert "fallback" in data["llm"]

    primary = data["llm"]["primary"]
    assert primary["provider"] == "openai_compatible"
    assert "configured" in primary
    assert "reachable" in primary
    assert "model" in primary

    fallback = data["llm"]["fallback"]
    assert fallback["provider"] == "ollama"
    assert "enabled" in fallback
    assert "reachable" in fallback
    assert "model" in fallback

    # Verify no secrets or credentials leaked in health check
    res_text = res.text
    assert "sk-" not in res_text
    assert "Bearer" not in res_text
    assert "password" not in res_text.lower()


def test_settings_fail_fast_validation():
    # 1. Missing Base URL
    s1 = Settings(LLM_PRIMARY_BASE_URL="", LLM_PRIMARY_API_KEY="key", LLM_PRIMARY_MODEL="gpt-4o-mini")
    with pytest.raises(ValueError) as exc:
        s1.validate_llm_settings(fail_fast=True)
    assert "Base URL is missing" in str(exc.value)

    # 2. Missing API Key
    s2 = Settings(LLM_PRIMARY_BASE_URL="http://api.com", LLM_PRIMARY_API_KEY="", LLM_PRIMARY_MODEL="gpt-4o-mini")
    with pytest.raises(ValueError) as exc:
        s2.validate_llm_settings(fail_fast=True)
    assert "API Key is missing" in str(exc.value)

    # 3. Missing Model
    s3 = Settings(LLM_PRIMARY_BASE_URL="http://api.com", LLM_PRIMARY_API_KEY="key", LLM_PRIMARY_MODEL="")
    with pytest.raises(ValueError) as exc:
        s3.validate_llm_settings(fail_fast=True)
    assert "Model is missing" in str(exc.value)

    # 4. Timeout <= 0
    s4 = Settings(
        LLM_PRIMARY_BASE_URL="http://api.com",
        LLM_PRIMARY_API_KEY="key",
        LLM_PRIMARY_MODEL="gpt-4o-mini",
        LLM_PRIMARY_TIMEOUT_SECONDS=0
    )
    with pytest.raises(ValueError) as exc:
        s4.validate_llm_settings(fail_fast=True)
    assert "timeout must be greater than 0" in str(exc.value)

    # 5. Retry < 0
    s5 = Settings(
        LLM_PRIMARY_BASE_URL="http://api.com",
        LLM_PRIMARY_API_KEY="key",
        LLM_PRIMARY_MODEL="gpt-4o-mini",
        LLM_PRIMARY_MAX_RETRIES=-1
    )
    with pytest.raises(ValueError) as exc:
        s5.validate_llm_settings(fail_fast=True)
    assert "retries must be >= 0" in str(exc.value)

    # 6. Fallback enabled but missing Ollama URL
    s6 = Settings(
        LLM_PRIMARY_BASE_URL="http://api.com",
        LLM_PRIMARY_API_KEY="key",
        LLM_PRIMARY_MODEL="gpt-4o-mini",
        LLM_FALLBACK_ENABLED=True,
        OLLAMA_BASE_URL=""
    )
    with pytest.raises(ValueError) as exc:
        s6.validate_llm_settings(fail_fast=True)
    assert "Ollama Base URL is missing" in str(exc.value)


def test_startup_checks_run_without_crash_or_secret_leak(capsys):
    exit_code = run_startup_checks()
    assert exit_code == 0
    captured = capsys.readouterr().out
    assert "PRE-FLIGHT STARTUP CHECK" in captured
    assert "PRE-FLIGHT SUMMARY" in captured
    assert "sk-" not in captured
