import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_postman_files_exist_and_are_valid_json():
    collection_path = ROOT_DIR / "docs" / "postman" / "MidCV-LLM-Testing.postman_collection.json"
    env_path = ROOT_DIR / "docs" / "postman" / "MidCV-Local.postman_environment.json"

    assert collection_path.exists(), f"Missing collection file at {collection_path}"
    assert env_path.exists(), f"Missing environment file at {env_path}"

    with open(collection_path, "r", encoding="utf-8") as f:
        col_data = json.load(f)
    assert col_data["info"]["name"] == "MidCV-LLM-Testing"
    assert len(col_data["item"]) == 8

    with open(env_path, "r", encoding="utf-8") as f:
        env_data = json.load(f)
    assert env_data["name"] == "MidCV-Local"
    # Ensure no real api key is committed in environment template
    for val in env_data["values"]:
        if val["key"] == "primary_api_key":
            assert val["value"] == "", "Postman environment template must not contain real API key"


def test_flow_03_extract_cv_to_raw_text(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
    client = TestClient(app)

    fixture_path = ROOT_DIR / "test-fixtures" / "synthetic" / "01_single_column_tech_cv.pdf"
    with open(fixture_path, "rb") as f:
        pdf_bytes = f.read()

    res = client.post(
        "/internal/ai/dev/extract-text",
        files={"file": ("01_single_column_tech_cv.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["rawText"]) > 0
    assert data["document"]["characterCount"] > 0
    assert data["document"]["extractionMethod"] == "PDF_TEXT"
    assert "providerUsed" not in data


def test_flow_04_structure_raw_text_primary(monkeypatch):
    import httpx
    monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)

    # Mock primary LLM chat response for deterministic test
    async def mock_async_post(self, url, **kwargs):
        return httpx.Response(
            200,
            json={
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "personalInfo": {"fullName": "NGUYEN TUAN ANH", "email": "tuananh@example.com"},
                            "skills": [{"name": "Java"}, {"name": "Spring Boot"}],
                            "education": [],
                            "experience": [],
                            "projects": [],
                            "certifications": [],
                            "languages": []
                        })
                    }
                }]
            }
        )
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_async_post)

    client = TestClient(app)

    raw_text = "NGUYEN TUAN ANH\nSenior Java Developer\nEmail: tuananh@example.com\nSkills: Java, Spring Boot"
    res = client.post(
        "/internal/ai/dev/structure-cv",
        json={"rawText": raw_text}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["providerUsed"] == "primary"
    assert data["fallbackUsed"] is False
    assert data["validation"]["jsonValid"] is True
    assert data["validation"]["schemaValid"] is True
    assert data["data"]["personalInfo"]["fullName"] == "NGUYEN TUAN ANH"


def test_flow_05_primary_temporary_failure_simulated_503(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
    client = TestClient(app)

    raw_text = "NGUYEN TUAN ANH\nSenior Java Developer\nEmail: tuananh@example.com\nSkills: Java, Spring Boot"
    res = client.post(
        "/internal/ai/dev/structure-cv",
        headers={"X-Simulate-Primary-Status": "503"},
        json={"rawText": raw_text}
    )
    # Simulated 503 triggers fallback to Ollama
    if res.status_code == 200:
        data = res.json()
        assert data["fallbackUsed"] is True
        assert data["providerUsed"] == "fallback"
        assert "503" in (data.get("fallbackReason") or "")
    else:
        # If Ollama server is not running locally in test environment, it returns 502/503 cleanly
        assert res.status_code in [502, 503]


def test_flow_06_invalid_api_key_simulated_401(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
    client = TestClient(app)

    res = client.post(
        "/internal/ai/dev/structure-cv",
        headers={"X-Simulate-Primary-Status": "401"},
        json={"rawText": "Valid raw text with sufficient length for candidate CV."}
    )
    assert res.status_code == 401
    assert "sk-" not in res.text
    assert "Authentication failure" in res.text


def test_flow_07_invalid_model_simulated_404(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
    client = TestClient(app)

    res = client.post(
        "/internal/ai/dev/structure-cv",
        headers={"X-Simulate-Primary-Status": "404"},
        json={"rawText": "Valid raw text with sufficient length for candidate CV."}
    )
    assert res.status_code == 404
    assert "Model" in res.text


def test_flow_08_invalid_raw_text(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
    client = TestClient(app)

    res = client.post(
        "/internal/ai/dev/structure-cv",
        json={"rawText": "   "}
    )
    assert res.status_code == 400
    assert "Raw text" in res.text
