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
    # An offline environment must legitimately report DEGRADED, not fake UP.
    assert data["status"] in ("UP", "DEGRADED")
    llm_ok = data["llm"]["primary"]["reachable"]
    expected = "UP" if data["ocr"]["status"] == "READY" and llm_ok else "DEGRADED"
    assert data["status"] == expected
    assert data["documentExtraction"]["status"] == "UP"
    assert "llm" in data
    assert "primary" in data["llm"]
    assert set(data["llm"]) == {"primary"}

    primary = data["llm"]["primary"]
    assert primary["provider"] == "openai_compatible"
    assert "configured" in primary
    assert "reachable" in primary
    assert "model" in primary

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

def test_startup_checks_report_missing_provider(monkeypatch, capsys):
    monkeypatch.setattr("app.tools.startup_check.get_llm_providers_health",
                        lambda **kwargs: {"primary": {"reachable": False}})
    assert run_startup_checks() == 1
    captured = capsys.readouterr().out
    assert "LLM provider reachable with configured model: False" in captured
    assert "sk-" not in captured
