import io
import os
import sys
import base64

sys.path.insert(0, os.path.abspath("ai-worker"))
sys.stdout.reconfigure(encoding='utf-8')

import docx
import pypdf
from app.services.document_extractor import DocumentExtractor
from app.schemas.document import DocumentExtractRequest

def create_real_files():
    os.makedirs("scratch/test_files", exist_ok=True)

    # 1. Real text PDF with Vietnamese characters
    # We create a valid PDF using pypdf writer with real content
    writer = pypdf.PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    
    # Minimal valid PDF with content
    pdf_text = "NGUYEN VIET KHANG\nSenior Software Engineer\nKinh nghiem: 5 nam phat trien he thong Spring Boot va FastAPI.\nKy nang: Java, Python, PostgreSQL, Docker, Kubernetes."
    stream_content = f"BT\n/F1 12 Tf\n50 720 Td\n({pdf_text.replace(chr(10), ') Tj T* (')}) Tj\nET"
    stream_bytes = stream_content.encode("latin1", errors="replace")
    
    pdf_bytes = (
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
    with open("scratch/test_files/real_cv.pdf", "wb") as f:
        f.write(pdf_bytes)

    # 2. Real DOCX with Vietnamese unicode headings, paragraphs, and tables
    doc = docx.Document()
    doc.add_heading("HỒ SƠ ỨNG VIÊN — TRẦN BẢO NGỌC", level=1)
    doc.add_paragraph("Vị trí ứng tuyển: Kỹ sư Dữ liệu & Trí tuệ Nhân tạo (AI Engineer)")
    doc.add_paragraph("Tóm tắt năng lực: Có 4 năm kinh nghiệm nghiên cứu mô hình ngôn ngữ lớn (LLM), xây dựng pipeline ETL và triển khai hệ thống đối sánh ngữ nghĩa.")
    
    table = doc.add_table(rows=3, cols=2)
    table.cell(0, 0).text = "Học vấn"
    table.cell(0, 1).text = "Thạc sĩ Khoa học Máy tính — Đại học Bách Khoa TP.HCM"
    table.cell(1, 0).text = "Kỹ năng chuyên môn"
    table.cell(1, 1).text = "Python, PyTorch, LangChain, PostgreSQL, pgvector, Docker"
    table.cell(2, 0).text = "Dự án tiêu biểu"
    table.cell(2, 1).text = "MatchJD — Nền tảng tuyển dụng thông minh và xác thực năng lực qua GitHub"
    
    doc.save("scratch/test_files/real_cv.docx")

    # 3. Scanned PDF (no text layer)
    w_scan = pypdf.PdfWriter()
    w_scan.add_blank_page(width=300, height=300)
    with open("scratch/test_files/scanned_image.pdf", "wb") as f:
        w_scan.write(f)

def run_real_verification():
    create_real_files()
    extractor = DocumentExtractor()

    print("\n==================================================")
    print("MATCHJD REAL CV DOCUMENT EXTRACTION VERIFICATION")
    print("==================================================")

    # Test 1: Real PDF
    with open("scratch/test_files/real_cv.pdf", "rb") as f:
        pdf_bytes = f.read()
    res_pdf = extractor.extract_document(DocumentExtractRequest(
        file_base64=base64.b64encode(pdf_bytes).decode("utf-8"),
        file_name="real_cv.pdf",
        file_type="PDF",
        correlation_id="demo-pdf-01"
    ))
    print(f"\n[TEST 1 - REAL PDF] Status: {res_pdf.status}, SourceType: {res_pdf.source_type}, UsedOCR: {res_pdf.used_ocr}")
    print(f"Extracted Length: {len(res_pdf.text)} chars")
    print(f"Sample Excerpt:\n{res_pdf.text[:120]}...\n")
    assert res_pdf.status == "SUCCESS"
    assert "Senior Software Engineer" in res_pdf.text

    # Test 2: Real DOCX (with table and Vietnamese accents)
    with open("scratch/test_files/real_cv.docx", "rb") as f:
        docx_bytes = f.read()
    res_docx = extractor.extract_document(DocumentExtractRequest(
        file_base64=base64.b64encode(docx_bytes).decode("utf-8"),
        file_name="real_cv.docx",
        file_type="DOCX",
        correlation_id="demo-docx-02"
    ))
    print(f"[TEST 2 - REAL DOCX WITH TABLES] Status: {res_docx.status}, SourceType: {res_docx.source_type}, UsedOCR: {res_docx.used_ocr}")
    print(f"Extracted Length: {len(res_docx.text)} chars")
    print(f"Full Extracted Document:\n{res_docx.text}\n")
    assert res_docx.status == "SUCCESS"
    assert "TRẦN BẢO NGỌC" in res_docx.text
    assert "Thạc sĩ Khoa học Máy tính — Đại học Bách Khoa TP.HCM" in res_docx.text
    assert "MatchJD" in res_docx.text

    # Test 3: Scanned PDF (verifying OCR route)
    with open("scratch/test_files/scanned_image.pdf", "rb") as f:
        scan_bytes = f.read()
    res_scan = extractor.extract_document(DocumentExtractRequest(
        file_base64=base64.b64encode(scan_bytes).decode("utf-8"),
        file_name="scanned_image.pdf",
        file_type="PDF",
        correlation_id="demo-scan-03"
    ))
    print(f"[TEST 3 - SCANNED PDF] Status: {res_scan.status}, SourceType: {res_scan.source_type}, UsedOCR: {res_scan.used_ocr}")
    print(f"ErrorCode: {res_scan.error_code}, ErrorMessage: {res_scan.error_message}")
    assert res_scan.used_ocr is True
    assert res_scan.error_code in ["OCR_FAILED", "OCR_REQUIRED"]
    assert res_scan.status == "FAILED"

    print("\nALL REAL DOCUMENT EXTRACTION VERIFICATIONS PASSED 100%!")

if __name__ == "__main__":
    run_real_verification()
