from scripts.ci.sanitize_log import sanitize


def test_redacts_credentials_and_personal_identifiers() -> None:
    raw = (
        "Authorization: Bearer secret.jwt.value\n"
        "api_key=sk-live-secret password: hunter2\n"
        "candidate@example.com +84 912 345 678\n"
    )

    result = sanitize(raw)

    assert "secret.jwt.value" not in result
    assert "sk-live-secret" not in result
    assert "hunter2" not in result
    assert "candidate@example.com" not in result
    assert "+84 912 345 678" not in result
    assert result.count("[REDACTED]") == 3
    assert "[REDACTED_EMAIL]" in result
    assert "[REDACTED_PHONE]" in result


def test_preserves_non_sensitive_diagnostics() -> None:
    raw = "correlation_id=abc-123 stage=OCR status=FAILED http_status=503\n"

    assert sanitize(raw) == raw
