import io
import time
import base64
import logging
import unicodedata
from typing import Optional, Dict, Any, Tuple
from app.schemas.document import DocumentExtractRequest, DocumentExtractResponse

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

class DocumentExtractor:
    """
    Strict real-data document extraction service for PDF and DOCX documents with OCR support.
    Follows zero-mock, no-silent-fallback, and non-fabrication principles.
    """

    def extract_document(self, request: DocumentExtractRequest) -> DocumentExtractResponse:
        start_time = time.time()
        correlation_id = request.correlation_id or "unknown"
        file_name = request.file_name or "unknown_document"
        
        logger.info(
            f"Starting document extraction [correlation_id={correlation_id}, "
            f"file_name={file_name}, declared_type={request.file_type}]"
        )

        # 1. Handle raw text direct pass-through if explicitly provided
        if request.raw_text and request.raw_text.strip():
            norm_text = self._normalize_text(request.raw_text)
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(
                f"Document extraction succeeded from raw_text [correlation_id={correlation_id}, "
                f"char_count={len(norm_text)}, duration_ms={duration_ms}]"
            )
            return DocumentExtractResponse(
                status="SUCCESS",
                source_type="TEXT",
                used_ocr=False,
                text=norm_text,
                error_code=None,
                error_message=None,
                metadata={
                    "character_count": len(norm_text),
                    "word_count": len(norm_text.split()),
                    "duration_ms": duration_ms
                }
            )

        # 2. Decode and validate file bytes
        if not request.file_base64:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_EMPTY",
                error_message="Document payload is empty: No base64 content or raw text provided."
            )

        try:
            file_bytes = base64.b64decode(request.file_base64)
        except Exception as e:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_READ_FAILED",
                error_message=f"Failed to decode base64 file content: {str(e)}"
            )

        # Check empty file
        if len(file_bytes) == 0:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_EMPTY",
                error_message="Uploaded document file is 0 bytes (empty file)."
            )

        # Check file size limit (10MB)
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_TOO_LARGE",
                error_message=f"File size exceeds maximum allowed limit of 10MB (actual: {len(file_bytes)} bytes)."
            )

        # 3. Detect file type by magic bytes and declared extension
        detected_type, is_valid_type = self._detect_file_type(file_bytes, request.file_name, request.file_type)
        if not is_valid_type:
            return DocumentExtractResponse(
                status="FAILED",
                source_type=detected_type,
                used_ocr=False,
                text=None,
                error_code="UNSUPPORTED_FILE_TYPE",
                error_message=f"Unsupported or invalid document type: {detected_type}. Only PDF and DOCX files are supported."
            )

        # 4. Route to specific extractor
        if detected_type == "PDF":
            return self._extract_pdf(file_bytes, correlation_id, file_name, start_time)
        elif detected_type == "DOCX":
            return self._extract_docx(file_bytes, correlation_id, file_name, start_time)
        elif detected_type == "IMAGE":
            return self._extract_image_ocr(file_bytes, correlation_id, file_name, start_time)
        else:
            return DocumentExtractResponse(
                status="FAILED",
                source_type=detected_type,
                used_ocr=False,
                text=None,
                error_code="UNSUPPORTED_FILE_TYPE",
                error_message=f"No parser available for detected file type: {detected_type}"
            )

    def _detect_file_type(self, file_bytes: bytes, file_name: Optional[str], declared_type: Optional[str]) -> Tuple[str, bool]:
        """Detect and validate document type using magic bytes."""
        # PDF check: begins with %PDF-
        if file_bytes.startswith(b"%PDF-"):
            return "PDF", True

        # DOCX check: begins with ZIP header PK\x03\x04
        if file_bytes.startswith(b"PK\x03\x04"):
            # Further verify it is declared or named as docx
            fn = (file_name or "").lower()
            dt = (declared_type or "").upper()
            if fn.endswith(".docx") or "DOCX" in dt or "WORD" in dt or not fn:
                return "DOCX", True

        # Image checks
        if file_bytes.startswith(b"\xff\xd8\xff") or file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "IMAGE", True

        # Check declared extension mismatch
        fn = (file_name or "").lower()
        if fn.endswith(".pdf"):
            # Has .pdf extension but missing %PDF- magic bytes -> corrupted or invalid PDF
            return "PDF", True
        elif fn.endswith(".docx"):
            return "DOCX", True
        elif fn.endswith((".jpg", ".jpeg", ".png")):
            return "IMAGE", True

        return "UNSUPPORTED", False

    def _extract_pdf(self, file_bytes: bytes, correlation_id: str, file_name: str, start_time: float) -> DocumentExtractResponse:
        import pypdf

        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        except Exception as e:
            logger.error(f"PDF extraction failed during initialization [correlation_id={correlation_id}]: {e}")
            return DocumentExtractResponse(
                status="FAILED",
                source_type="PDF",
                used_ocr=False,
                text=None,
                error_code="PDF_EXTRACTION_FAILED",
                error_message=f"PDF document is corrupted or unreadable: {str(e)}"
            )

        page_texts = []
        try:
            num_pages = len(reader.pages)
            for page_idx, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted and extracted.strip():
                    page_texts.append(extracted.strip())
        except Exception as e:
            logger.error(f"PDF page extraction error [correlation_id={correlation_id}]: {e}")
            return DocumentExtractResponse(
                status="FAILED",
                source_type="PDF",
                used_ocr=False,
                text=None,
                error_code="PDF_EXTRACTION_FAILED",
                error_message=f"Failed reading pages from PDF: {str(e)}"
            )

        combined_text = "\n\n".join(page_texts)
        normalized_text = self._normalize_text(combined_text)

        # Scanned PDF detection: if non-empty PDF produces no or negligible text (< 30 characters)
        if len(normalized_text.strip()) < 30:
            logger.info(
                f"PDF contains negligible text ({len(normalized_text.strip())} chars) across {num_pages} pages. "
                f"Flagging OCR_REQUIRED [correlation_id={correlation_id}]."
            )
            return self._attempt_ocr_on_pdf(file_bytes, correlation_id, file_name, num_pages, start_time)

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            f"PDF extraction successful [correlation_id={correlation_id}, "
            f"pages={num_pages}, char_count={len(normalized_text)}, duration_ms={duration_ms}]"
        )

        return DocumentExtractResponse(
            status="SUCCESS",
            source_type="PDF",
            used_ocr=False,
            text=normalized_text,
            error_code=None,
            error_message=None,
            metadata={
                "page_count": num_pages,
                "character_count": len(normalized_text),
                "word_count": len(normalized_text.split()),
                "duration_ms": duration_ms
            }
        )

    def _extract_docx(self, file_bytes: bytes, correlation_id: str, file_name: str, start_time: float) -> DocumentExtractResponse:
        import docx

        try:
            doc = docx.Document(io.BytesIO(file_bytes))
        except Exception as e:
            logger.error(f"DOCX extraction failed during parse [correlation_id={correlation_id}]: {e}")
            return DocumentExtractResponse(
                status="FAILED",
                source_type="DOCX",
                used_ocr=False,
                text=None,
                error_code="DOCX_EXTRACTION_FAILED",
                error_message=f"DOCX document is corrupted or unreadable: {str(e)}"
            )

        elements = []

        # 1. Paragraphs (including headings, lists, body)
        for p in doc.paragraphs:
            txt = p.text.strip()
            if txt:
                elements.append(txt)

        # 2. Tables (crucial for resumes with structured tables)
        for table in doc.tables:
            for row in table.rows:
                # Deduplicate cells in case of merged cells
                seen_cells = set()
                cell_texts = []
                for cell in row.cells:
                    cell_id = id(cell._tc)
                    if cell_id not in seen_cells:
                        seen_cells.add(cell_id)
                        cell_txt = cell.text.strip()
                        if cell_txt:
                            cell_texts.append(cell_txt)
                if cell_texts:
                    elements.append(" | ".join(cell_texts))

        combined_text = "\n\n".join(elements)
        normalized_text = self._normalize_text(combined_text)

        if not normalized_text or not normalized_text.strip():
            return DocumentExtractResponse(
                status="FAILED",
                source_type="DOCX",
                used_ocr=False,
                text=None,
                error_code="DOCX_EXTRACTION_FAILED",
                error_message="DOCX document contains no extractable text content or tables."
            )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(
            f"DOCX extraction successful [correlation_id={correlation_id}, "
            f"elements={len(elements)}, char_count={len(normalized_text)}, duration_ms={duration_ms}]"
        )

        return DocumentExtractResponse(
            status="SUCCESS",
            source_type="DOCX",
            used_ocr=False,
            text=normalized_text,
            error_code=None,
            error_message=None,
            metadata={
                "elements_count": len(elements),
                "character_count": len(normalized_text),
                "word_count": len(normalized_text.split()),
                "duration_ms": duration_ms
            }
        )

    def _attempt_ocr_on_pdf(self, file_bytes: bytes, correlation_id: str, file_name: str, page_count: int, start_time: float) -> DocumentExtractResponse:
        """
        Executes OCR when PDF is scanned/image-only.
        Differentiates OCR_REQUIRED, OCR_SUCCESS, and OCR_FAILED.
        Never fakes success when OCR engine is unavailable or fails.
        """
        ocr_result, error_msg = self._perform_ocr(file_bytes, is_pdf=True)
        duration_ms = int((time.time() - start_time) * 1000)

        if ocr_result and ocr_result.strip():
            normalized = self._normalize_text(ocr_result)
            logger.info(
                f"OCR extraction successful for scanned PDF [correlation_id={correlation_id}, "
                f"char_count={len(normalized)}, duration_ms={duration_ms}]"
            )
            return DocumentExtractResponse(
                status="SUCCESS",
                source_type="PDF",
                used_ocr=True,
                text=normalized,
                error_code=None,
                error_message=None,
                metadata={
                    "page_count": page_count,
                    "character_count": len(normalized),
                    "word_count": len(normalized.split()),
                    "ocr_engine": "tesseract",
                    "duration_ms": duration_ms
                }
            )
        else:
            logger.warning(
                f"OCR execution failed or unavailable for scanned PDF [correlation_id={correlation_id}, error={error_msg}]"
            )
            return DocumentExtractResponse(
                status="FAILED",
                source_type="PDF",
                used_ocr=True,
                text=None,
                error_code="OCR_FAILED",
                error_message=error_msg or "Scanned document requires OCR, but OCR processing failed or returned empty content."
            )

    def _extract_image_ocr(self, file_bytes: bytes, correlation_id: str, file_name: str, start_time: float) -> DocumentExtractResponse:
        """
        Extracts text from image document via OCR.
        """
        ocr_result, error_msg = self._perform_ocr(file_bytes, is_pdf=False)
        duration_ms = int((time.time() - start_time) * 1000)

        if ocr_result and ocr_result.strip():
            normalized = self._normalize_text(ocr_result)
            return DocumentExtractResponse(
                status="SUCCESS",
                source_type="IMAGE",
                used_ocr=True,
                text=normalized,
                error_code=None,
                error_message=None,
                metadata={
                    "character_count": len(normalized),
                    "word_count": len(normalized.split()),
                    "duration_ms": duration_ms
                }
            )
        else:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="IMAGE",
                used_ocr=True,
                text=None,
                error_code="OCR_FAILED",
                error_message=error_msg or "Image document requires OCR, but OCR engine failed or is unavailable."
            )

    def _perform_ocr(self, file_bytes: bytes, is_pdf: bool) -> Tuple[Optional[str], Optional[str]]:
        """
        Invokes OCR engine if installed and configured.
        Returns (text, error_message).
        """
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            return None, "OCR engine unavailable: 'pytesseract' or 'Pillow' is not installed in the environment."

        try:
            if is_pdf:
                # Extract images from PDF pages using pypdf
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                ocr_texts = []
                for page_idx, page in enumerate(reader.pages):
                    for img_idx, image_file_object in enumerate(page.images):
                        try:
                            image = Image.open(io.BytesIO(image_file_object.data))
                            text = pytesseract.image_to_string(image, lang="eng+vie")
                            if text and text.strip():
                                ocr_texts.append(text.strip())
                        except Exception as img_err:
                            logger.error(f"Error processing image {img_idx} on page {page_idx}: {img_err}")
                
                if ocr_texts:
                    return "\n\n".join(ocr_texts), None
                return None, "No readable text could be recognized from images inside the scanned PDF."
            else:
                image = Image.open(io.BytesIO(file_bytes))
                text = pytesseract.image_to_string(image, lang="eng+vie")
                if text and text.strip():
                    return text.strip(), None
                return None, "No readable text could be recognized from the image."
        except Exception as e:
            return None, f"Tesseract OCR execution failed: {str(e)}"

    def _normalize_text(self, text: str) -> str:
        """
        Normalizes extracted text:
        - Unicode NFC normalization (crucial for Vietnamese accents: e.g. 'ệ', 'ơ', 'ư')
        - Preserves paragraphs and intentional newlines
        - Replaces non-standard whitespace/control characters
        """
        if not text:
            return ""
        # 1. Unicode NFC normalization
        normalized = unicodedata.normalize("NFC", text)
        # 2. Normalize Windows/Mac carriage returns
        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
        # 3. Clean control characters while preserving \n and \t
        cleaned_chars = []
        for ch in normalized:
            if ch == "\n" or ch == "\t" or unicodedata.category(ch)[0] != "C":
                cleaned_chars.append(ch)
            else:
                cleaned_chars.append(" ")
        cleaned = "".join(cleaned_chars)
        # 4. Collapse runs of horizontal spaces (not newlines)
        lines = [line.strip() for line in cleaned.split("\n")]
        # Keep paragraph breaks but avoid more than two consecutive newlines
        result_lines = []
        blank_count = 0
        for line in lines:
            if not line:
                blank_count += 1
                if blank_count <= 1:
                    result_lines.append("")
            else:
                blank_count = 0
                result_lines.append(line)
        return "\n".join(result_lines).strip()
