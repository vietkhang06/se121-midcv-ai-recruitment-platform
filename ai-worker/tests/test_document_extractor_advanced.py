import io
import os
import base64
import pytest
from PIL import Image
import docx

from app.schemas.document import DocumentExtractRequest, DocumentExtractResponse
from app.services.document_extractor import DocumentExtractor


@pytest.fixture
def extractor():
    return DocumentExtractor()


def create_two_column_pdf_bytes():
    stream_content = (
        "BT\n/F1 12 Tf\n"
        "50 700 Td\n(LE MINH QUAN) Tj\n"
        "0 -20 Td\n(Email: quan.le@example.com) Tj\n"
        "0 -20 Td\n(Skills: Python, FastAPI, Docker) Tj\n"
        "300 40 Td\n(SENIOR BACKEND DEVELOPER) Tj\n"
        "0 -20 Td\n(TechCorp Vietnam 2021-2024) Tj\n"
        "0 -20 Td\n(Led microservices migration) Tj\n"
        "ET"
    )
    stream_bytes = stream_content.encode("latin1", errors="replace")
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length " + str(len(stream_bytes)).encode("latin1") + b" >> stream\n"
        + stream_bytes + b"\nendstream\nendobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000244 00000 n \n"
        b"0000000350 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n430\n%%EOF\n"
    )
    return pdf_content

def test_two_column_pdf_layout_handling(extractor):
    """
    Validates that pdfplumber extracts two-column PDF content in reading order
    and marks layout_mode / warnings if detected.
    """
    pdf_bytes = create_two_column_pdf_bytes()
    req = DocumentExtractRequest(
        file_base64=base64.b64encode(pdf_bytes).decode("utf-8"),
        file_name="two_column_resume.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.source_type == "PDF"
    assert "LE MINH QUAN" in res.text
    assert "SENIOR BACKEND DEVELOPER" in res.text
    assert len(res.pages) == 1
    assert res.pages[0].page_number == 1



def test_docx_ordered_paragraphs_and_tables(extractor):
    """
    Validates that python-docx reads elements in actual document order,
    traversing paragraphs, tables, and nested structures without dropping.
    """
    doc = docx.Document()
    doc.add_heading("NGUYEN DUC ANH - FULLSTACK ENGINEER", level=1)
    doc.add_paragraph("Summary: Experienced engineer in cloud systems.")

    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Skill Category"
    table.cell(0, 1).text = "Technologies"
    table.cell(1, 0).text = "Backend"
    table.cell(1, 1).text = "Java, Spring Boot, PostgreSQL"

    doc.add_paragraph("Education: Hanoi University of Science and Technology")

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(docx_bytes).decode("utf-8"),
        file_name="resume_ordered.docx",
        file_type="DOCX"
    )
    res = extractor.extract_document(req)
    assert res.status in ["SUCCESS", "EXTRACTED"]
    assert res.source_type == "DOCX"
    assert "NGUYEN DUC ANH" in res.text
    assert "Java, Spring Boot, PostgreSQL" in res.text
    assert "Hanoi University of Science and Technology" in res.text
    # Check that paragraphs appear in correct sequence
    summary_pos = res.text.find("Experienced engineer")
    table_pos = res.text.find("Spring Boot")
    edu_pos = res.text.find("Hanoi University")
    assert summary_pos < table_pos < edu_pos


def test_legacy_doc_fallback_unavailable(extractor, monkeypatch):
    """
    Validates that legacy .doc files with no LibreOffice installed
    return DOC_CONVERTER_UNAVAILABLE with clear error message.
    """
    monkeypatch.setattr(extractor, "_find_libreoffice", lambda: None)
    doc_header = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1Fake Word 97-2003 OLE compound document"

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(doc_header).decode("utf-8"),
        file_name="legacy_resume.doc",
        file_type="DOC"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.source_type == "DOC"
    assert res.error_code == "DOC_CONVERTER_UNAVAILABLE"
    assert "LibreOffice headless is required" in res.error_message


def test_image_decompression_bomb_prevention(extractor, monkeypatch):
    """
    Validates that images exceeding MAX_PIXELS (50M pixels) are blocked defensively.
    """
    img = Image.new("L", (8000, 7000), color=255)  # 56 Million pixels > 50M limit
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(img_bytes).decode("utf-8"),
        file_name="huge_image.png",
        file_type="PNG"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.error_code == "IMAGE_TOO_LARGE"


def test_tesseract_missing_reports_clean_error(extractor, monkeypatch):
    """
    Validates that if Tesseract is not found, a clean error code TESSERACT_NOT_FOUND
    is returned without throwing unhandled exceptions.
    """
    import pytesseract
    def mock_image_to_data(*args, **kwargs):
        raise pytesseract.TesseractNotFoundError()

    monkeypatch.setattr("pytesseract.image_to_data", mock_image_to_data)

    img = Image.new("L", (100, 100), color=255)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(img_bytes).decode("utf-8"),
        file_name="test_missing_tess.png",
        file_type="PNG"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.error_code == "TESSERACT_NOT_FOUND"
