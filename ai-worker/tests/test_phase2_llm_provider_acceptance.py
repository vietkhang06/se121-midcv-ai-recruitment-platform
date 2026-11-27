import json
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.services.structured_cv_validator import StructuredCVValidator


class TestPhase2ProviderAcceptance:
    def test_05_missing_raw_text_data_no_hallucination(self):
        """Fields not present in the CV text must be null or empty list, not hallucinated."""
        raw_text = "NGUYEN VAN B. Only email: b@example.com."
        validator = StructuredCVValidator()
        minimal_json = """{
            "personalInfo": {"fullName": "NGUYEN VAN B", "email": "b@example.com"},
            "summary": null,
            "skills": [],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
            "languages": []
        }"""
        valid_json, valid_schema, data, err = validator.validate(minimal_json)
        assert valid_json is True
        assert valid_schema is True
        assert data.personalInfo.fullName == "NGUYEN VAN B"
        assert data.personalInfo.phone is None
        assert data.personalInfo.githubUrl is None
        assert data.skills == []
        assert data.experience == []
        assert data.summary is None

    def test_06_malformed_json_rejected(self):
        """Invalid JSON syntax or missing core fields fails validation cleanly."""
        validator = StructuredCVValidator()

        # 1. Broken syntax
        v1, v2, d1, e1 = validator.validate("{not valid json}")
        assert v1 is False
        assert v2 is False
        assert d1 is None

        # 2. Schema violation (wrong data types: skills as a string instead of list)
        v1, v2, d2, e2 = validator.validate('{"skills": "invalid_string_type"}')
        assert v1 is True
        assert v2 is False
        assert d2 is None
        assert e2 is not None

    def test_07_http_simulate_headers_dev_endpoint(self, monkeypatch):
        """Dev structure endpoint correctly simulates 401 fail-fast and a terminal 503."""
        monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
        client = TestClient(app)

        # 401 simulate header fails fast with 401
        res_401 = client.post(
            "/internal/ai/dev/structure-cv",
            json={"rawText": "Nguyen Van A software engineer with 5 years experience in Python and FastAPI."},
            headers={"X-Simulate-Primary-Status": "401"}
        )
        assert res_401.status_code == 401
        assert "401" in res_401.json()["detail"]

        # 404 simulate header fails fast with 404
        res_404 = client.post(
            "/internal/ai/dev/structure-cv",
            json={"rawText": "Nguyen Van A software engineer with 5 years experience in Python and FastAPI."},
            headers={"X-Simulate-Primary-Status": "404"}
        )
        assert res_404.status_code == 404
        assert "404" in res_404.json()["detail"]
