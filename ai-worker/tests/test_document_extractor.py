import io
import base64
import pytest
import docx
import pypdf
from app.services.document_extractor import DocumentExtractor, MAX_FILE_SIZE_BYTES
from app.schemas.document import DocumentExtractRequest, DocumentExtractResponse

def create_sample_pdf(text: str) -> bytes:
    """Helper to generate a valid PDF byte stream containing the given text."""
    escaped_text = text.replace("(", "\\(").replace(")", "\\)")
    stream_content = f"BT\n/F1 12 Tf\n50 700 Td\n({escaped_text}) Tj\nET"
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

def create_sample_docx(heading: str, paragraphs: list, table_data: list = None) -> bytes:
    """Helper to generate a valid DOCX byte stream containing headings, paragraphs, and tables."""
    doc = docx.Document()
    doc.add_heading(heading, level=1)
    for p in paragraphs:
        doc.add_paragraph(p)
    if table_data:
        table = doc.add_table(rows=len(table_data), cols=len(table_data[0]))
        for r_idx, row in enumerate(table_data):
            for c_idx, val in enumerate(row):
                table.cell(r_idx, c_idx).text = val
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

@pytest.fixture
def extractor():
    return DocumentExtractor()

# ==============================================================================
# CV-EX-01: Valid Text PDF
# ==============================================================================
def test_cv_ex_01_valid_text_pdf(extractor):
    pdf_bytes = create_sample_pdf("Nguyen Van A - Senior Backend Engineer with 6 years experience in Java and Spring Boot.")
    req = DocumentExtractRequest(
        file_base64=base64.b64encode(pdf_bytes).decode("utf-8"),
        file_name="candidate_resume.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status == "SUCCESS"
    assert res.source_type == "PDF"
    assert res.used_ocr is False
    assert res.error_code is None
    assert "Senior Backend Engineer" in res.text
    assert res.metadata["character_count"] > 20

# ==============================================================================
# CV-EX-02: Valid DOCX with Paragraphs and Tables
# ==============================================================================
def test_cv_ex_02_valid_docx(extractor):
    docx_bytes = create_sample_docx(
        heading="Tran Thi B - Fullstack Developer",
        paragraphs=["Summary: Highly skilled developer with React and Node.js.", "Education: Computer Science."],
        table_data=[
            ["Skill", "Proficiency Level"],
            ["TypeScript", "Expert"],
            ["PostgreSQL", "Advanced"]
        ]
    )
    req = DocumentExtractRequest(
        file_base64=base64.b64encode(docx_bytes).decode("utf-8"),
        file_name="resume_tran_b.docx",
        file_type="DOCX"
    )
    res = extractor.extract_document(req)
    assert res.status == "SUCCESS"
    assert res.source_type == "DOCX"
    assert res.used_ocr is False
    assert "Tran Thi B" in res.text
    assert "TypeScript | Expert" in res.text
    assert "PostgreSQL | Advanced" in res.text

# ==============================================================================
# CV-EX-03: Scanned PDF / Image Triggers OCR Path
# ==============================================================================
def test_cv_ex_03_scanned_pdf_triggers_ocr(extractor, monkeypatch):
    # Blank PDF produces zero text, triggering OCR path
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=300, height=300)
    buf = io.BytesIO()
    writer.write(buf)
    blank_pdf_bytes = buf.getvalue()

    # Monkeypatch _perform_ocr to simulate OCR execution
    def mock_perform_ocr(file_bytes, is_pdf):
        return "OCR RECOGNIZED TEXT: Hoang C - Data Engineer", None

    monkeypatch.setattr(extractor, "_perform_ocr", mock_perform_ocr)

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(blank_pdf_bytes).decode("utf-8"),
        file_name="scanned_resume.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status == "SUCCESS"
    assert res.source_type == "PDF"
    assert res.used_ocr is True
    assert "Data Engineer" in res.text

# ==============================================================================
# CV-EX-04: Vietnamese Unicode Preservation (NFC Normalized)
# ==============================================================================
def test_cv_ex_04_vietnamese_unicode_preserved(extractor):
    vn_heading = "NGUYỄN VĂN AN — KỸ SƯ PHẦN MỀM"
    vn_summary = "Tóm tắt: 5 năm kinh nghiệm phát triển hệ thống phân tán, xử lý dữ liệu lớn."
    vn_table = [
        ["Học vấn", "Đại học Bách Khoa TP.HCM — Ngành Công nghệ Thông tin"],
        ["Chứng chỉ", "Kỹ sư đám mây AWS Certified Solutions Architect"]
    ]
    docx_bytes = create_sample_docx(vn_heading, [vn_summary], vn_table)

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(docx_bytes).decode("utf-8"),
        file_name="cv_tieng_viet.docx",
        file_type="DOCX"
    )
    res = extractor.extract_document(req)
    assert res.status == "SUCCESS"
    assert "NGUYỄN VĂN AN" in res.text
    assert "KỸ SƯ PHẦN MỀM" in res.text
    assert "Đại học Bách Khoa TP.HCM" in res.text
    assert "Công nghệ Thông tin" in res.text

# ==============================================================================
# CV-EX-05: Empty File (0 Bytes)
# ==============================================================================
def test_cv_ex_05_empty_file(extractor):
    req = DocumentExtractRequest(
        file_base64=base64.b64encode(b"").decode("utf-8"),
        file_name="empty_resume.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.error_code == "FILE_EMPTY"
    assert res.text is None

# ==============================================================================
# CV-EX-06: Corrupted PDF
# ==============================================================================
def test_cv_ex_06_corrupted_pdf(extractor):
    corrupted_bytes = b"%PDF-1.4\nCorrupted binary junk \x00\xff\xee not a valid pdf stream"
    req = DocumentExtractRequest(
        file_base64=base64.b64encode(corrupted_bytes).decode("utf-8"),
        file_name="corrupted.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.error_code == "PDF_EXTRACTION_FAILED"
    assert res.text is None

# ==============================================================================
# CV-EX-07: Unsupported File Type / Extension
# ==============================================================================
def test_cv_ex_07_unsupported_file_type(extractor):
    exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00Binary executable not a document"
    req = DocumentExtractRequest(
        file_base64=base64.b64encode(exe_bytes).decode("utf-8"),
        file_name="malicious_payload.exe",
        file_type="EXE"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.error_code == "UNSUPPORTED_FILE_TYPE"
    assert res.text is None

# ==============================================================================
# CV-EX-08: OCR Failure Must Return FAILED and OCR_FAILED (Never Fake Success)
# ==============================================================================
def test_cv_ex_08_ocr_failure_handling(extractor, monkeypatch):
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=300, height=300)
    buf = io.BytesIO()
    writer.write(buf)
    blank_pdf_bytes = buf.getvalue()

    # Simulate OCR failure
    def mock_perform_ocr_fail(file_bytes, is_pdf):
        return None, "OCR engine returned an unrecoverable error: Tesseract process crashed"

    monkeypatch.setattr(extractor, "_perform_ocr", mock_perform_ocr_fail)

    req = DocumentExtractRequest(
        file_base64=base64.b64encode(blank_pdf_bytes).decode("utf-8"),
        file_name="scanned_fail.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.used_ocr is True
    assert res.error_code == "OCR_FAILED"
    assert "Tesseract process crashed" in res.error_message
    assert res.text is None

# ==============================================================================
# CV-EX-09: File Exceeding Maximum Limit (10MB)
# ==============================================================================
def test_cv_ex_09_large_file(extractor):
    oversized_bytes = b"0" * (MAX_FILE_SIZE_BYTES + 1024)
    req = DocumentExtractRequest(
        file_base64=base64.b64encode(oversized_bytes).decode("utf-8"),
        file_name="giant_resume.pdf",
        file_type="PDF"
    )
    res = extractor.extract_document(req)
    assert res.status == "FAILED"
    assert res.error_code == "FILE_TOO_LARGE"
    assert res.text is None

# ==============================================================================
# CV-EX-10: No Mock Verification in Document Extraction Production Runtime
# ==============================================================================
def test_cv_ex_10_no_mock_in_production():
    import inspect
    import app.services.document_extractor as doc_mod

    doc_source = inspect.getsource(doc_mod)

    # Verify no mock dictionaries, fake data, or silent fallback in document extraction
    assert "MOCK_CV_DATA" not in doc_source
    assert "FAKE_CV" not in doc_source
    assert "SAMPLE_CV" not in doc_source
    assert "USE_MOCK" not in doc_source
    assert "mock_data" not in doc_source.lower()
    assert "fake_text" not in doc_source.lower()
