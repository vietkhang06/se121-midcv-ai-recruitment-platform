import os
import sys
import base64
import pytest
from pathlib import Path

# Add app to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.services.tesseract_runtime import tesseract_runtime
from app.services.document_extractor import DocumentExtractor
from app.schemas.document import DocumentExtractRequest

document_extractor = DocumentExtractor()
FIXTURES_DIR = ROOT_DIR.parent / "test-fixtures" / "ocr"


def _read_b64(file_path: Path) -> str:
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


@pytest.fixture(scope="module")
def require_tesseract_ready():
    """Ensure real Tesseract runtime is available and has both eng & vie before testing."""
    health = tesseract_runtime.get_health()
    if health.get("status") != "READY":
        pytest.skip(f"Tesseract OCR is not READY on this machine ({health.get('status')}): {health}")
    installed = health.get("installed_languages", [])
    if not ("eng" in installed and "vie" in installed):
        pytest.skip(f"Tesseract OCR missing required languages (eng, vie). Installed: {installed}")
    return health


def test_tesseract_real_binary_and_languages(require_tesseract_ready):
    """Test 1: Verify real Tesseract binary is executable, version >= 5, and eng+vie are installed."""
    health = require_tesseract_ready
    assert health["status"] == "READY"
    assert health["executable"] is not None and os.path.exists(health["executable"])
    assert health["version"] is not None and health["version"].startswith("5.")
    assert "eng" in health["installed_languages"]
    assert "vie" in health["installed_languages"]


def test_ocr_cv_english_png(require_tesseract_ready):
    """Test 2: Extract cv_english.png using real OCR."""
    fixture_path = FIXTURES_DIR / "cv_english.png"
    assert fixture_path.exists(), f"Missing fixture {fixture_path}"

    req = DocumentExtractRequest(
        file_base64=_read_b64(fixture_path),
        file_name="cv_english.png",
        file_type="PNG"
    )
    res = document_extractor.extract_document(req)

    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.used_ocr is True
    assert res.extractionMethod == "IMAGE_OCR"
    assert res.text is not None

    text_lower = res.text.lower()
    assert "software engineer" in text_lower
    assert "spring boot" in text_lower
    assert "education" in text_lower


def test_ocr_cv_vietnamese_png(require_tesseract_ready):
    """Test 3: Extract cv_vietnamese.png using real OCR with Vietnamese diacritics."""
    fixture_path = FIXTURES_DIR / "cv_vietnamese.png"
    assert fixture_path.exists(), f"Missing fixture {fixture_path}"

    req = DocumentExtractRequest(
        file_base64=_read_b64(fixture_path),
        file_name="cv_vietnamese.png",
        file_type="PNG"
    )
    res = document_extractor.extract_document(req)

    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.used_ocr is True
    assert res.extractionMethod == "IMAGE_OCR"
    assert res.text is not None

    # Check for Vietnamese phrases
    text = res.text
    assert ("nguyễn văn a" in text.lower() or "nguyen van a" in text.lower() or "văn a" in text.lower())
    assert ("kỹ sư" in text.lower() or "phần mềm" in text.lower() or "software" in text.lower())
    assert ("spring boot" in text.lower() or "học vấn" in text.lower() or "đại học" in text.lower())


def test_ocr_cv_bilingual_jpg(require_tesseract_ready):
    """Test 4: Extract cv_bilingual.jpg containing both English and Vietnamese."""
    fixture_path = FIXTURES_DIR / "cv_bilingual.jpg"
    assert fixture_path.exists(), f"Missing fixture {fixture_path}"

    req = DocumentExtractRequest(
        file_base64=_read_b64(fixture_path),
        file_name="cv_bilingual.jpg",
        file_type="JPG"
    )
    res = document_extractor.extract_document(req)

    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.used_ocr is True
    assert res.extractionMethod == "IMAGE_OCR"
    assert res.text is not None

    text_lower = res.text.lower()
    assert "software engineer" in text_lower
    assert "spring boot" in text_lower
    assert ("đại học" in text_lower or "bách khoa" in text_lower or "bach khoa" in text_lower)


def test_cv_scanned_pdf(require_tesseract_ready):
    """Test 5: Extract pure scanned PDF (method should be PDF_OCR)."""
    fixture_path = FIXTURES_DIR / "cv_scanned.pdf"
    assert fixture_path.exists(), f"Missing fixture {fixture_path}"

    req = DocumentExtractRequest(
        file_base64=_read_b64(fixture_path),
        file_name="cv_scanned.pdf",
        file_type="PDF"
    )
    res = document_extractor.extract_document(req)

    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.used_ocr is True
    assert res.extractionMethod == "PDF_OCR"
    assert res.pageCount == 1
    assert len([p for p in res.pages if p.used_ocr]) == 1
    assert res.text is not None
    assert len(res.text) > 50


def test_cv_text_layer_pdf_no_unnecessary_ocr(require_tesseract_ready, monkeypatch):
    """Test 6: Verify pure text-layer PDF does NOT trigger OCR."""
    fixture_path = FIXTURES_DIR / "cv_text_layer.pdf"
    assert fixture_path.exists(), f"Missing fixture {fixture_path}"

    # Track if tesseract_runtime.ocr_image is called
    ocr_called = []
    original_ocr = tesseract_runtime.ocr_image

    def mock_ocr_image(*args, **kwargs):
        ocr_called.append(True)
        return original_ocr(*args, **kwargs)

    monkeypatch.setattr(tesseract_runtime, "ocr_image", mock_ocr_image)

    req = DocumentExtractRequest(
        file_base64=_read_b64(fixture_path),
        file_name="cv_text_layer.pdf",
        file_type="PDF"
    )
    res = document_extractor.extract_document(req)

    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.used_ocr is False
    assert res.extractionMethod == "TEXT_LAYER"
    assert len(ocr_called) == 0, "OCR should NOT have been invoked for a valid text-layer PDF"
    assert "Senior Software Engineer" in res.text
    assert "Spring Boot" in res.text


def test_cv_hybrid_pdf(require_tesseract_ready):
    """Test 7: Verify hybrid PDF uses HYBRID extraction method (text layer on page 1, OCR on page 2)."""
    fixture_path = FIXTURES_DIR / "cv_hybrid.pdf"
    assert fixture_path.exists(), f"Missing fixture {fixture_path}"

    req = DocumentExtractRequest(
        file_base64=_read_b64(fixture_path),
        file_name="cv_hybrid.pdf",
        file_type="PDF"
    )
    res = document_extractor.extract_document(req)

    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.used_ocr is True
    assert res.extractionMethod == "HYBRID"
    assert res.pageCount == 2
    assert len([p for p in res.pages if p.used_ocr]) == 1  # Only page 2 required OCR!
    assert res.text is not None
    assert "Senior Software Engineer" in res.text
    assert ("phụ lục" in res.text.lower() or "chứng chỉ" in res.text.lower() or "solutions architect" in res.text.lower() or "đại học" in res.text.lower())
