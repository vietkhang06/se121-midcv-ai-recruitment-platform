import os
import base64
import pytest
from app.services.document_extractor import DocumentExtractor
from app.schemas.document import DocumentExtractRequest

FIXTURE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../test-fixtures/synthetic"))

@pytest.fixture
def extractor():
    return DocumentExtractor()

def test_extract_single_column_pdf(extractor):
    file_path = os.path.join(FIXTURE_DIR, "01_single_column_tech_cv.pdf")
    assert os.path.exists(file_path), f"Fixture missing: {file_path}"
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(file_bytes).decode("utf-8"),
        file_name="01_single_column_tech_cv.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert "NGUYEN TUAN ANH" in res.text
    assert "tuananh.nguyen@example.com" in res.text
    assert "Spring Boot" in res.text
    assert "FinTech Solutions Vietnam" in res.text
    assert len(res.pages) >= 1
    assert res.pages[0].method in ["pdf-native", "NATIVE_LAYOUT", "PDFPLUMBER_LAYOUT", "PDFPLUMBER_TWO_COLUMN"]

def test_extract_two_column_pdf(extractor):
    file_path = os.path.join(FIXTURE_DIR, "02_two_column_cv.pdf")
    assert os.path.exists(file_path), f"Fixture missing: {file_path}"
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(file_bytes).decode("utf-8"),
        file_name="02_two_column_cv.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert "LE MINH QUAN" in res.text
    assert "quan.le@example.com" in res.text
    assert "FastAPI" in res.text
    assert "NextGen Tech Hanoi" in res.text

def test_extract_docx_with_tables(extractor):
    file_path = os.path.join(FIXTURE_DIR, "05_structured_table_cv.docx")
    assert os.path.exists(file_path), f"Fixture missing: {file_path}"
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(file_bytes).decode("utf-8"),
        file_name="05_structured_table_cv.docx",
        file_type="DOCX"
    )
    res = extractor.extract_document(req)
    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert "PHAM DUC THANG" in res.text
    assert "thang.pham@example.com" in res.text
    assert "Saigon Tech Labs" in res.text
    assert "InnoSoft Vietnam" in res.text
    assert "Next.js" in res.text

def test_extract_doc_graceful_handling(extractor):
    file_path = os.path.join(FIXTURE_DIR, "06_legacy_cv.doc")
    assert os.path.exists(file_path), f"Fixture missing: {file_path}"
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(file_bytes).decode("utf-8"),
        file_name="06_legacy_cv.doc",
        file_type="DOC"
    )
    res = extractor.extract_document(req)
    # If LibreOffice is installed, it extracts text; if not, it returns clean DOC_CONVERTER_UNAVAILABLE without crashing
    if res.status == "SUCCESS":
        assert "HOANG VAN NAM" in res.text
    else:
        assert res.error_code == "DOC_CONVERTER_UNAVAILABLE" or "DOC_CONVERTER_UNAVAILABLE" in res.warnings
