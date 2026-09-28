import os
import io
import base64
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.document_extractor import DocumentExtractor
from app.services.document_extraction_service import DocumentExtractionService
from app.services.text_quality_evaluator import TextQualityEvaluator
from app.services.llm_client import LLMClient
from app.schemas.document import DocumentExtractRequest

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "test-fixtures" / "synthetic"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def no_llm_guard(monkeypatch):
    """Proves strictly that NO LLM is ever called during raw document extraction."""
    def _prohibited_call(*args, **kwargs):
        raise AssertionError("CRITICAL VIOLATION: An LLM was invoked during document extraction!")

    monkeypatch.setattr(LLMClient, "generate_json", _prohibited_call)
    monkeypatch.setattr(LLMClient, "chat", _prohibited_call, raising=False)
    yield


class TestPhase1DocumentExtractionAcceptance:
    """
    Phase 1 Acceptance Suite verifying:
    - PDF text layer extraction (without unnecessary OCR).
    - PDF scan rendering and OCR fallback.
    - Image (PNG/JPG) OCR extraction.
    - DOCX structured text and table extraction.
    - Corrupted file rejection with proper error codes.
    - Quality gate detection (empty, low quality, abnormal repetition).
    - MIME/magic-bytes spoofing detection.
    - Real HTTP API endpoints with full contract response.
    - Strict zero-LLM isolation.
    """

    def test_01_pdf_text_layer_http_contract(self, client, no_llm_guard):
        """Valid text PDF returns TEXT_LAYER without OCR, with valid checksum and quality score."""
        file_path = FIXTURES_DIR / "01_single_column_tech_cv.pdf"
        assert file_path.exists()
        file_bytes = file_path.read_bytes()
        b64 = base64.b64encode(file_bytes).decode("utf-8")

        response = client.post(
            "/internal/ai/extract-document",
            json={
                "file_base64": b64,
                "file_name": "01_single_column_tech_cv.pdf",
                "file_type": "PDF",
                "correlation_id": "test-phase1-pdf-text"
            }
        )
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "SUCCESS"
        assert data["documentType"] == "PDF"
        assert data["extractionMethod"] == "TEXT_LAYER"
        assert data["ocrUsed"] is False
        assert data["used_ocr"] is False
        assert data["characterCount"] > 100
        assert data["qualityScore"] >= 0.80
        assert data["checksum"] is not None
        assert len(data["checksum"]) == 64  # Valid SHA-256
        assert data["correlationId"] == "test-phase1-pdf-text"
        assert "NGUYEN TUAN ANH" in data["rawText"]
        assert "Spring Boot" in data["rawText"]

    def test_02_pdf_scan_triggers_ocr(self, client, no_llm_guard):
        """Scanned PDF triggers OCR fallback and produces PDF_OCR extractionMethod."""
        file_path = FIXTURES_DIR / "03_scanned_cv.pdf"
        assert file_path.exists()
        file_bytes = file_path.read_bytes()
        b64 = base64.b64encode(file_bytes).decode("utf-8")

        response = client.post(
            "/internal/ai/extract-document",
            json={
                "file_base64": b64,
                "file_name": "03_scanned_cv.pdf",
                "file_type": "PDF",
                "correlation_id": "test-phase1-pdf-scan"
            }
        )
        assert response.status_code == 200
        data = response.json()

        assert data["documentType"] == "PDF"
        assert data["ocrUsed"] is True
        assert data["extractionMethod"] == "PDF_OCR"
        assert data["checksum"] is not None

    def test_03_png_image_extraction(self, client, no_llm_guard):
        """Image CV is processed via image OCR with metadata."""
        file_path = FIXTURES_DIR / "04_cv_image.png"
        assert file_path.exists()
        file_bytes = file_path.read_bytes()
        b64 = base64.b64encode(file_bytes).decode("utf-8")

        response = client.post(
            "/internal/ai/extract-document",
            json={
                "file_base64": b64,
                "file_name": "04_cv_image.png",
                "file_type": "IMAGE",
                "correlation_id": "test-phase1-image"
            }
        )
        assert response.status_code == 200
        data = response.json()

        assert data["documentType"] == "IMAGE"
        assert data["ocrUsed"] is True
        assert data["extractionMethod"] == "IMAGE_OCR"
        assert data["checksum"] is not None

    def test_04_docx_table_and_paragraphs(self, client, no_llm_guard):
        """DOCX with structured tables and paragraphs preserves document order without OCR."""
        file_path = FIXTURES_DIR / "05_structured_table_cv.docx"
        assert file_path.exists()
        file_bytes = file_path.read_bytes()
        b64 = base64.b64encode(file_bytes).decode("utf-8")

        response = client.post(
            "/internal/ai/extract-document",
            json={
                "file_base64": b64,
                "file_name": "05_structured_table_cv.docx",
                "file_type": "DOCX",
                "correlation_id": "test-phase1-docx"
            }
        )
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "SUCCESS"
        assert data["documentType"] == "DOCX"
        assert data["extractionMethod"] == "DOCX_PARSER"
        assert data["ocrUsed"] is False
        assert "PHAM DUC THANG" in data["rawText"]
        assert "Saigon Tech Labs" in data["rawText"]
        assert "React" in data["rawText"]
        assert data["qualityScore"] >= 0.80

    def test_05_corrupted_file_returns_clean_error(self, client, no_llm_guard):
        """Corrupted PDF file returns FAILED status with proper error code without 500 crash."""
        file_path = FIXTURES_DIR / "07_corrupted_file.pdf"
        assert file_path.exists()
        file_bytes = file_path.read_bytes()
        b64 = base64.b64encode(file_bytes).decode("utf-8")

        response = client.post(
            "/internal/ai/extract-document",
            json={
                "file_base64": b64,
                "file_name": "07_corrupted_file.pdf",
                "file_type": "PDF",
                "correlation_id": "test-phase1-corrupt"
            }
        )
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "FAILED"
        assert data["error_code"] in ["PDF_EXTRACTION_FAILED", "PDF_NO_PAGES", "FILE_READ_FAILED"]
        assert data["rawText"] == ""

    def test_06_empty_file_fails_with_file_empty(self, client, no_llm_guard):
        """Empty 0-byte file returns FILE_EMPTY."""
        b64_empty = ""
        response = client.post(
            "/internal/ai/extract-document",
            json={
                "file_base64": b64_empty,
                "file_name": "empty.pdf",
                "file_type": "PDF"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "FAILED"
        assert data["error_code"] == "FILE_EMPTY"

    def test_07_mime_spoofing_detected(self, client, no_llm_guard):
        """Plain text file disguised with .pdf extension is detected as UNSUPPORTED_FILE_TYPE or rejected."""
        fake_pdf = b"Plain text trying to disguise itself as a PDF document."
        b64_fake = base64.b64encode(fake_pdf).decode("utf-8")

        response = client.post(
            "/internal/ai/extract-document",
            json={
                "file_base64": b64_fake,
                "file_name": "fake.pdf",
                "file_type": "PDF"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "FAILED"
        assert data["error_code"] in ["UNSUPPORTED_FILE_TYPE", "PDF_EXTRACTION_FAILED"]

    def test_08_quality_evaluator_catches_anomalies(self):
        """Quality gate catches empty text, short text, corrupt characters, and abnormal repetition."""
        evaluator = TextQualityEvaluator()

        # 1. Empty text
        r_empty = evaluator.evaluate("")
        assert r_empty["isAcceptable"] is False
        assert r_empty["qualityScore"] == 0.0

        # 2. Insufficient text
        r_short = evaluator.evaluate("Hello world")
        assert r_short["isAcceptable"] is False
        assert r_short["qualityScore"] < 0.8

        # 3. High corrupt character ratio
        corrupt_text = "Good text " + ("\ufffd" * 30) + " trailing content"
        r_corrupt = evaluator.evaluate(corrupt_text)
        assert r_corrupt["isAcceptable"] is False
        assert r_corrupt["corruptCharRatio"] > 0.25

        # 4. Abnormal repetition
        repeated_text = "Java " * 50
        r_repeat = evaluator.evaluate(repeated_text)
        assert "Abnormal text repetition detected" in r_repeat["reasons"]
        assert r_repeat["isAcceptable"] is False

    def test_09_multipart_dev_extract_endpoint(self, client, monkeypatch, no_llm_guard):
        """Multipart upload to /dev/extract-text extracts accurately and returns clean metadata."""
        monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
        file_path = FIXTURES_DIR / "01_single_column_tech_cv.pdf"
        file_bytes = file_path.read_bytes()

        response = client.post(
            "/internal/ai/dev/extract-text",
            files={"file": ("01_single_column_tech_cv.pdf", file_bytes, "application/pdf")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["document"]["fileType"] == "PDF"
        assert data["document"]["extractionMethod"] == "PDF_TEXT"
        assert "NGUYEN TUAN ANH" in data["rawText"]
