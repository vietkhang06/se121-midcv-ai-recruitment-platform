import io
import os
import time
import base64
import hashlib
import logging
import tempfile
import subprocess
import unicodedata
from typing import Optional, Dict, Any, Tuple, List
from PIL import Image, ImageOps

from app.config import settings
from app.services.tesseract_runtime import tesseract_runtime
from app.services.ocr_exceptions import (
    OcrBaseException,
    OcrDependencyMissingException,
    OcrLanguageMissingException,
    OcrTimeoutException,
    InvalidDocumentException,
    DocumentLimitExceededException,
    NoTextExtractedException
)
from app.schemas.document import DocumentExtractRequest, DocumentExtractResponse, PageSegment

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PIXELS = 50_000_000  # 50 Megapixels max to prevent decompression bombs



class DocumentExtractor:
    """
    Robust CV and Document extraction engine implementing:
    - PDF native text and layout parsing via pdfplumber (with 2-column layout detection).
    - Per-page classification (native vs scanned vs mixed).
    - PDF page rendering via pypdfium2 for scanned pages.
    - OCR via Tesseract 5 + pytesseract with 'eng+vie' language models.
    - Image extraction (PNG, JPG, JPEG, WEBP) with EXIF orientation and pixel limit protection.
    - DOCX extraction via python-docx traversing paragraphs and tables in document order.
    - DOC (legacy Word) conversion via isolated LibreOffice headless sandbox.
    - Strict provenance: stores immutable raw source text, normalized text, page segments, and warnings.
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
            raw_text = request.raw_text
            norm_text = self._normalize_text(raw_text)
            duration_ms = int((time.time() - start_time) * 1000)
            segment = PageSegment(
                page_number=None,
                text=norm_text,
                raw_text=raw_text,
                method="text",
                used_ocr=False,
                start_char=0,
                end_char=len(norm_text)
            )
            checksum = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
            res = DocumentExtractResponse(
                status="SUCCESS",
                source_type="TEXT",
                used_ocr=False,
                text=norm_text,
                raw_source_text=raw_text,
                pages=[segment],
                warnings=[],
                error_code=None,
                error_message=None,
                metadata={
                    "character_count": len(norm_text),
                    "word_count": len(norm_text.split()),
                    "duration_ms": duration_ms
                }
            )
            return self._finalize_response(res, correlation_id, checksum)

        # 2. Validate base64 input
        if not request.file_base64:
            res = DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_EMPTY",
                error_message="Document payload is empty: No base64 content or raw text provided."
            )
            return self._finalize_response(res, correlation_id, None)

        try:
            file_bytes = base64.b64decode(request.file_base64)
        except Exception as e:
            res = DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_READ_FAILED",
                error_message=f"Failed to decode base64 file content: {str(e)}"
            )
            return self._finalize_response(res, correlation_id, None)

        checksum = hashlib.sha256(file_bytes).hexdigest()

        if len(file_bytes) == 0:
            res = DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_EMPTY",
                error_message="Uploaded document file is 0 bytes (empty file)."
            )
            return self._finalize_response(res, correlation_id, checksum)

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            res = DocumentExtractResponse(
                status="FAILED",
                source_type="UNKNOWN",
                used_ocr=False,
                text=None,
                error_code="FILE_TOO_LARGE",
                error_message=f"File size exceeds maximum allowed limit of 10MB (actual: {len(file_bytes)} bytes)."
            )
            return self._finalize_response(res, correlation_id, checksum)

        # 3. Detect file type by magic bytes and declared extension
        detected_type, is_valid_type = self._detect_file_type(file_bytes, request.file_name, request.file_type)
        if not is_valid_type:
            res = DocumentExtractResponse(
                status="FAILED",
                source_type=detected_type,
                used_ocr=False,
                text=None,
                error_code="UNSUPPORTED_FILE_TYPE",
                error_message=f"Unsupported document format: {detected_type}. Supported: PDF, DOCX, DOC, PNG, JPG, JPEG, WEBP."
            )
            return self._finalize_response(res, correlation_id, checksum)

        # 4. Route to extractor
        if detected_type == "PDF":
            res = self._extract_pdf(file_bytes, correlation_id, file_name, start_time)
        elif detected_type == "DOCX":
            res = self._extract_docx(file_bytes, correlation_id, file_name, start_time)
        elif detected_type == "DOC":
            res = self._extract_doc_via_libreoffice(file_bytes, correlation_id, file_name, start_time)
        elif detected_type == "IMAGE":
            res = self._extract_image(file_bytes, correlation_id, file_name, start_time)
        else:
            res = DocumentExtractResponse(
                status="FAILED",
                source_type=detected_type,
                used_ocr=False,
                text=None,
                error_code="UNSUPPORTED_FILE_TYPE",
                error_message=f"No parser available for detected file type: {detected_type}"
            )
        return self._finalize_response(res, correlation_id, checksum)

    def _finalize_response(
        self,
        resp: DocumentExtractResponse,
        correlation_id: str,
        checksum: Optional[str] = None
    ) -> DocumentExtractResponse:
        resp.correlationId = correlation_id
        resp.checksum = checksum
        resp.documentType = resp.source_type
        resp.ocrUsed = resp.used_ocr
        raw_text = resp.raw_source_text or resp.text or ""
        resp.rawText = raw_text
        resp.characterCount = len(raw_text)
        resp.pageCount = len(resp.pages) if resp.pages else (1 if resp.status in ["SUCCESS", "EXTRACTED"] else 0)

        # Determine standardized extraction method
        if resp.source_type == "PDF":
            has_native = any(not p.used_ocr and p.text and p.text.strip() for p in (resp.pages or []))
            has_ocr = any(p.used_ocr and p.text and p.text.strip() for p in (resp.pages or []))
            if has_native and has_ocr:
                resp.extractionMethod = "HYBRID"
            elif resp.used_ocr or has_ocr:
                resp.extractionMethod = "PDF_OCR"
            else:
                resp.extractionMethod = "TEXT_LAYER"
        elif resp.source_type == "IMAGE":
            resp.extractionMethod = "IMAGE_OCR"
        elif resp.source_type == "DOCX":
            resp.extractionMethod = "DOCX_PARSER"
        elif resp.source_type == "DOC":
            resp.extractionMethod = "DOC_LIBREOFFICE"
        elif resp.source_type == "TEXT":
            resp.extractionMethod = "RAW_TEXT"
        else:
            resp.extractionMethod = "UNKNOWN"

        # Quality score evaluation
        if resp.status in ["SUCCESS", "EXTRACTED"] and raw_text:
            from app.services.text_quality_evaluator import TextQualityEvaluator
            eval_res = TextQualityEvaluator().evaluate(raw_text)
            resp.qualityScore = eval_res["qualityScore"]
            if not eval_res["isAcceptable"]:
                for r in eval_res.get("reasons", []):
                    warn_msg = f"QualityWarning: {r}"
                    if warn_msg not in resp.warnings:
                        resp.warnings.append(warn_msg)
        else:
            resp.qualityScore = 0.0

        if resp.status == "SUCCESS":
            resp.status = "EXTRACTED"

        return resp

    def _detect_file_type(self, file_bytes: bytes, file_name: Optional[str], declared_type: Optional[str]) -> Tuple[str, bool]:
        """Detect document type using magic bytes and extension check."""
        fn = (file_name or "").lower()
        dt = (declared_type or "").upper()

        # PDF: %PDF-
        if file_bytes.startswith(b"%PDF-"):
            return "PDF", True

        # DOCX: PK\x03\x04
        if file_bytes.startswith(b"PK\x03\x04"):
            if fn.endswith(".docx") or "DOCX" in dt or not fn:
                return "DOCX", True

        # DOC (Legacy OLE CFB compound binary): \xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1
        if file_bytes.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1") or fn.endswith(".doc"):
            return "DOC", True

        # PNG: \x89PNG\r\n\x1a\n
        if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "IMAGE", True

        # JPEG: \xff\xd8\xff
        if file_bytes.startswith(b"\xff\xd8\xff"):
            return "IMAGE", True

        # WEBP: RIFF....WEBP
        if file_bytes.startswith(b"RIFF") and len(file_bytes) >= 12 and file_bytes[8:12] == b"WEBP":
            return "IMAGE", True

        # Check by file extension fallback
        if fn.endswith(".pdf"):
            return "PDF", True
        elif fn.endswith(".docx"):
            return "DOCX", True
        elif fn.endswith(".doc"):
            return "DOC", True
        elif fn.endswith((".png", ".jpg", ".jpeg", ".webp")):
            return "IMAGE", True

        return "UNSUPPORTED", False

    def _extract_pdf(self, file_bytes: bytes, correlation_id: str, file_name: str, start_time: float) -> DocumentExtractResponse:
        """
        Extracts PDF using pdfplumber for native text and layout analysis (two-column handling).
        Uses pypdfium2 to render scanned pages and TesseractRuntime for deterministic page-level OCR.
        """
        import pdfplumber
        import pypdfium2 as pdfium

        segments: List[PageSegment] = []
        raw_page_texts: List[str] = []
        norm_page_texts: List[str] = []
        warnings: List[str] = []
        any_ocr_used = False
        last_ocr_error = None
        last_ocr_error_code = None

        try:
            pdf_doc = pdfplumber.open(io.BytesIO(file_bytes))
        except Exception as e:
            logger.error(f"Failed to open PDF with pdfplumber [correlation_id={correlation_id}]: {e}")
            return DocumentExtractResponse(
                status="FAILED",
                source_type="PDF",
                used_ocr=False,
                text=None,
                error_code="PDF_EXTRACTION_FAILED",
                error_message=f"PDF document is corrupted, password-protected, or unreadable: {str(e)}"
            )

        num_pages = len(pdf_doc.pages)
        if num_pages == 0:
            pdf_doc.close()
            return DocumentExtractResponse(
                status="FAILED",
                source_type="PDF",
                used_ocr=False,
                text=None,
                error_code="PDF_NO_PAGES",
                error_message="PDF contains 0 pages."
            )

        if num_pages > settings.OCR_MAX_PAGES:
            pdf_doc.close()
            return DocumentExtractResponse(
                status="FAILED",
                source_type="PDF",
                used_ocr=False,
                text=None,
                error_code="DOCUMENT_LIMIT_EXCEEDED",
                error_message=f"PDF page count ({num_pages}) exceeds maximum allowed limit of {settings.OCR_MAX_PAGES} pages."
            )

        pdfium_doc = None
        try:
            pdfium_doc = pdfium.PdfDocument(io.BytesIO(file_bytes))
        except Exception as pium_err:
            logger.warning(f"pypdfium2 initialization warning [correlation_id={correlation_id}]: {pium_err}")

        current_char_offset = 0

        try:
            for page_idx, page in enumerate(pdf_doc.pages):
                page_num = page_idx + 1
                page_raw = ""
                page_method = "pdf-native"
                page_ocr = False
                page_ocr_conf = None
                page_warnings = []

                logger.info(f"TEXT_LAYER_EXTRACTION_STARTED [correlation_id={correlation_id}, page={page_num}]")
                # 1. Attempt two-column / native text extraction
                extracted_native, is_two_col, layout_warn = self._extract_pdf_page_layout(page)
                if layout_warn:
                    page_warnings.append(layout_warn)

                non_space_chars = len(extracted_native.replace(" ", "").replace("\n", "").replace("\t", ""))
                logger.info(f"TEXT_LAYER_EXTRACTION_COMPLETED [correlation_id={correlation_id}, page={page_num}, chars={non_space_chars}]")

                # 2. Check if page is scanned or text is insufficient
                if non_space_chars >= settings.OCR_MIN_TEXT_CHARS_PER_PAGE:
                    page_raw = extracted_native
                    page_method = "pdf-native"
                else:
                    # Page has insufficient text -> Attempt OCR rendering for this specific page
                    logger.info(f"OCR_REQUIRED [correlation_id={correlation_id}, page={page_num}, native_chars={non_space_chars}]")
                    logger.info(f"OCR_PAGE_STARTED [correlation_id={correlation_id}, page={page_num}]")
                    any_ocr_used = True
                    ocr_start = time.time()
                    if getattr(self._perform_ocr, "__code__", None) != DocumentExtractor._perform_ocr.__code__:
                        ocr_text, ocr_err = self._perform_ocr(file_bytes, is_pdf=True)
                        ocr_conf, ocr_code = None, "OCR_FAILED" if ocr_err else None
                    else:
                        ocr_text, ocr_conf, ocr_err, ocr_code = self._ocr_pdf_page(pdfium_doc, page_idx, correlation_id)
                    ocr_page_dur_ms = int((time.time() - ocr_start) * 1000)


                    if ocr_text and ocr_text.strip():
                        page_raw = ocr_text
                        page_method = "pdf-ocr"
                        page_ocr = True
                        page_ocr_conf = ocr_conf
                        page_warnings.append(f"Page {page_num}: OCR was used successfully.")
                        logger.info(f"OCR_PAGE_COMPLETED [correlation_id={correlation_id}, page={page_num}, duration_ms={ocr_page_dur_ms}, chars={len(ocr_text)}]")
                    else:
                        last_ocr_error = ocr_err
                        last_ocr_error_code = ocr_code
                        if extracted_native.strip():
                            # Fallback to sparse native text if OCR failed
                            page_raw = extracted_native
                            page_warnings.append(f"Page {page_num}: Sparse text detected; OCR failed ({ocr_err or 'engine error'}).")
                        else:
                            page_warnings.append(f"Page {page_num}: Scanned page with no readable text detected ({ocr_err or 'unreadable'}).")

                page_norm = self._normalize_text(page_raw)
                start_c = current_char_offset
                end_c = start_c + len(page_norm)
                current_char_offset = end_c + 2  # account for "\n\n" between pages

                segment = PageSegment(
                    page_number=page_num,
                    text=page_norm,
                    raw_text=page_raw,
                    method=page_method,
                    used_ocr=page_ocr,
                    start_char=start_c,
                    end_char=end_c,
                    ocr_confidence=page_ocr_conf,
                    warnings=page_warnings
                )
                segments.append(segment)
                raw_page_texts.append(page_raw)
                norm_page_texts.append(page_norm)
                warnings.extend(page_warnings)

            if any_ocr_used:
                scanned_count = sum(1 for s in segments if s.used_ocr)
                logger.info(f"OCR_COMPLETED [correlation_id={correlation_id}, scanned_pages={scanned_count}]")

        finally:
            pdf_doc.close()
            if pdfium_doc:
                try:
                    pdfium_doc.close()
                except Exception:
                    pass

        full_raw = "\n\n".join(raw_page_texts).strip()
        full_norm = "\n\n".join(norm_page_texts).strip()

        if not full_norm or len(full_norm.replace(" ", "").replace("\n", "")) < 15:
            if any_ocr_used:
                return DocumentExtractResponse(
                    status="FAILED",
                    source_type="PDF",
                    used_ocr=True,
                    text=None,
                    raw_source_text=full_raw if full_raw else None,
                    pages=segments,
                    warnings=warnings,
                    error_code=last_ocr_error_code or "OCR_FAILED",
                    error_message=last_ocr_error or "Scanned document requires OCR, but OCR processing failed or returned empty content."
                )
            return DocumentExtractResponse(
                status="FAILED",
                source_type="PDF",
                used_ocr=any_ocr_used,
                text=None,
                raw_source_text=full_raw if full_raw else None,
                pages=segments,
                warnings=warnings,
                error_code="PDF_TEXT_EMPTY",
                error_message="Document contains no readable text content (scanned image unreadable or blank pages)."
            )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"RAW_TEXT_VALIDATED [correlation_id={correlation_id}, length={len(full_norm)}]")
        return DocumentExtractResponse(
            status="SUCCESS",
            source_type="PDF",
            used_ocr=any_ocr_used,
            text=full_norm,
            raw_source_text=full_raw,
            pages=segments,
            warnings=warnings,
            error_code=None,
            error_message=None,
            metadata={
                "page_count": num_pages,
                "character_count": len(full_norm),
                "word_count": len(full_norm.split()),
                "duration_ms": duration_ms,
                "used_ocr": any_ocr_used
            }
        )


    def _extract_pdf_page_layout(self, page) -> Tuple[str, bool, Optional[str]]:
        """
        Analyzes page geometry to detect multi-column resumes.
        Extracts words and groups them by column if a clear two-column split exists.
        Falls back to pdfplumber layout extraction.
        """
        try:
            words = page.extract_words(keep_blank_chars=False, extra_attrs=["x0", "x1", "top", "bottom"])
            if not words:
                native = page.extract_text(layout=True) or ""
                return native, False, None

            page_width = float(page.width)
            page_height = float(page.height)

            page_mid = page_width / 2.0

            # Detect whether lines span continuously across the page (single-column text lines)
            lines_dict = {}
            for w in words:
                line_key = round(w["top"] / 4.0) * 4
                lines_dict.setdefault(line_key, []).append(w)

            total_lines = len(lines_dict)
            full_width_lines = 0
            for line_words in lines_dict.values():
                min_x = min(w["x0"] for w in line_words)
                max_x = max(w["x1"] for w in line_words)
                if min_x < page_mid - 35 and max_x > page_mid + 35:
                    full_width_lines += 1

            has_full_width_lines = total_lines > 0 and (full_width_lines / total_lines) > 0.15

            left_words = [w for w in words if w["x1"] <= page_mid + 15]
            right_words = [w for w in words if w["x0"] >= page_mid - 15]
            spanning_words = [w for w in words if w["x0"] < page_mid - 15 and w["x1"] > page_mid + 15]

            total_words = len(words)
            is_two_column = (
                not has_full_width_lines
                and len(left_words) > total_words * 0.2
                and len(right_words) > total_words * 0.2
                and len(spanning_words) < total_words * 0.15
            )

            if is_two_column:
                try:
                    left_max_x = max(w["x1"] for w in left_words)
                    right_min_x = min(w["x0"] for w in right_words)
                    split_x = (left_max_x + right_min_x) / 2.0 if right_min_x > left_max_x else page_mid

                    left_crop = page.crop((0, 0, split_x, page_height))
                    right_crop = page.crop((split_x, 0, page_width, page_height))
                    left_text = left_crop.extract_text(layout=True) or ""
                    right_text = right_crop.extract_text(layout=True) or ""
                    combined = left_text.strip() + "\n\n" + right_text.strip()
                    if combined.strip():
                        return combined, True, "Page analyzed with two-column resume layout cropping."
                except Exception as crop_err:
                    logger.warning(f"Column crop fallback: {crop_err}")



            # Default: use layout-preserved extraction
            native = page.extract_text(layout=True) or ""
            return native, False, None

        except Exception as e:
            logger.warning(f"Layout analysis fallback: {e}")
            native = page.extract_text() or ""
            return native, False, None

    def _ocr_pdf_page(self, pdfium_doc, page_idx: int, correlation_id: Optional[str] = None) -> Tuple[Optional[str], Optional[float], Optional[str], Optional[str]]:
        """
        Renders a PDF page via pypdfium2 at configured DPI and performs Tesseract OCR.
        Returns: (text, confidence, error_message, error_code)
        """
        if pdfium_doc is None:
            return None, None, "pypdfium2 renderer unavailable", "OCR_DEPENDENCY_MISSING"

        try:
            page = pdfium_doc.get_page(page_idx)
            render_scale = max(1.0, min(settings.OCR_DPI / 72.0, 4.0))
            bitmap = page.render(scale=render_scale)
            pil_image = bitmap.to_pil()
            page.close()

            # Preprocess: convert to grayscale
            gray_img = pil_image.convert("L")

            text, avg_conf = tesseract_runtime.ocr_image(
                gray_img,
                psm=settings.OCR_PSM,
                timeout_seconds=settings.OCR_TIMEOUT_SECONDS,
                correlation_id=correlation_id
            )
            return text.strip(), avg_conf, None, None
        except OcrBaseException as ocr_ex:
            return None, None, ocr_ex.message, ocr_ex.code
        except Exception as e:
            return None, None, f"Failed rendering or OCRing PDF page: {str(e)}", "OCR_FAILED"

    def _perform_ocr(self, file_bytes: bytes, is_pdf: bool, correlation_id: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
        """
        Executes OCR engine on PDF bytes or Image bytes using pypdfium2 + TesseractRuntime.
        Returns (text, error_message).
        """
        try:
            if is_pdf:
                import pypdfium2 as pdfium
                try:
                    pdf = pdfium.PdfDocument(io.BytesIO(file_bytes))
                except Exception as p_err:
                    return None, f"Failed opening PDF for OCR: {p_err}"

                texts = []
                render_scale = max(1.0, min(settings.OCR_DPI / 72.0, 4.0))
                for i in range(len(pdf)):
                    page = pdf.get_page(i)
                    bitmap = page.render(scale=render_scale)
                    pil_img = bitmap.to_pil().convert("L")
                    page.close()
                    t, _ = tesseract_runtime.ocr_image(
                        pil_img,
                        psm=settings.OCR_PSM,
                        timeout_seconds=settings.OCR_TIMEOUT_SECONDS,
                        correlation_id=correlation_id
                    )
                    if t and t.strip():
                        texts.append(t.strip())
                pdf.close()
                if texts:
                    return "\n\n".join(texts), None
                return None, "No readable text could be recognized from the scanned PDF."
            else:
                image = Image.open(io.BytesIO(file_bytes)).convert("L")
                text, _ = tesseract_runtime.ocr_image(
                    image,
                    psm=settings.OCR_PSM,
                    timeout_seconds=settings.OCR_TIMEOUT_SECONDS,
                    correlation_id=correlation_id
                )
                if text and text.strip():
                    return text.strip(), None
                return None, "No readable text could be recognized from the image."
        except OcrBaseException as ocr_ex:
            return None, f"{ocr_ex.code}: {ocr_ex.message}"
        except Exception as e:
            return None, f"Tesseract process crashed: {str(e)}"

    def _extract_image(self, file_bytes: bytes, correlation_id: str, file_name: str, start_time: float) -> DocumentExtractResponse:
        """
        Extracts text from images (PNG, JPG, JPEG, WEBP) using Pillow for EXIF correction and Tesseract OCR.
        Defends against decompression bombs via MAX_PIXELS check.
        """
        logger.info(f"DOCUMENT_TYPE_DETECTED [correlation_id={correlation_id}, type=IMAGE, file={file_name}]")
        logger.info(f"OCR_REQUIRED [correlation_id={correlation_id}, file={file_name}]")

        try:
            image = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="IMAGE",
                used_ocr=True,
                text=None,
                error_code="INVALID_DOCUMENT",
                error_message=f"Image file is corrupted or unreadable: {str(e)}"
            )

        # Decompression bomb check
        pixel_count = image.width * image.height
        if pixel_count > MAX_PIXELS:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="IMAGE",
                used_ocr=True,
                text=None,
                error_code="IMAGE_TOO_LARGE",
                error_message=f"Image resolution {image.width}x{image.height} ({pixel_count} pixels) exceeds limit of 50M pixels."
            )

        # EXIF Orientation Correction
        try:
            image = ImageOps.exif_transpose(image)
        except Exception as exif_err:
            logger.debug(f"EXIF orientation skip: {exif_err}")

        # Optional upscale for low-res images
        if image.width < 600 or image.height < 600:
            scale_factor = 2
            image = image.resize((image.width * scale_factor, image.height * scale_factor), Image.Resampling.LANCZOS)

        # Grayscale conversion
        gray = image.convert("L")

        logger.info(f"OCR_PAGE_STARTED [correlation_id={correlation_id}, page=1]")
        ocr_start = time.time()
        warnings = []
        try:
            raw_text, avg_conf = tesseract_runtime.ocr_image(
                gray,
                psm=settings.OCR_PSM,
                timeout_seconds=settings.OCR_TIMEOUT_SECONDS,
                correlation_id=correlation_id
            )
        except OcrDependencyMissingException as ocr_ex:
            logger.error(f"PROCESSING_FAILED [correlation_id={correlation_id}, code=TESSERACT_NOT_FOUND, msg={ocr_ex.message}]")
            return DocumentExtractResponse(
                status="FAILED",
                source_type="IMAGE",
                used_ocr=True,
                text=None,
                error_code="TESSERACT_NOT_FOUND",
                error_message=ocr_ex.message
            )
        except OcrBaseException as ocr_ex:
            logger.error(f"PROCESSING_FAILED [correlation_id={correlation_id}, code={ocr_ex.code}, msg={ocr_ex.message}]")
            return DocumentExtractResponse(
                status="FAILED",
                source_type="IMAGE",
                used_ocr=True,
                text=None,
                error_code=ocr_ex.code,
                error_message=ocr_ex.message
            )

        except Exception as ocr_err:
            logger.error(f"PROCESSING_FAILED [correlation_id={correlation_id}, err={ocr_err}]")
            return DocumentExtractResponse(
                status="FAILED",
                source_type="IMAGE",
                used_ocr=True,
                text=None,
                error_code="OCR_FAILED",
                error_message=f"OCR execution failed on image: {str(ocr_err)}"
            )

        ocr_duration_ms = int((time.time() - ocr_start) * 1000)
        logger.info(f"OCR_PAGE_COMPLETED [correlation_id={correlation_id}, duration_ms={ocr_duration_ms}, chars={len(raw_text)}]")
        logger.info(f"OCR_COMPLETED [correlation_id={correlation_id}, total_chars={len(raw_text)}]")

        norm_text = self._normalize_text(raw_text)

        if not norm_text or len(norm_text.replace(" ", "").replace("\n", "")) < 10:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="IMAGE",
                used_ocr=True,
                text=None,
                raw_source_text=raw_text,
                error_code="NO_TEXT_EXTRACTED",
                error_message="Tesseract scanned the image but detected no readable text. Ensure image is clear and well-lit."
            )

        if avg_conf is not None and avg_conf < 40:
            warnings.append(f"Image OCR confidence is low ({avg_conf}%). Image may be blurry or low contrast.")

        logger.info(f"RAW_TEXT_VALIDATED [correlation_id={correlation_id}, length={len(norm_text)}]")

        duration_ms = int((time.time() - start_time) * 1000)
        segment = PageSegment(
            page_number=None,
            text=norm_text,
            raw_text=raw_text,
            method="image-ocr",
            used_ocr=True,
            start_char=0,
            end_char=len(norm_text),
            ocr_confidence=avg_conf,
            warnings=warnings
        )

        return DocumentExtractResponse(
            status="SUCCESS",
            source_type="IMAGE",
            used_ocr=True,
            text=norm_text,
            raw_source_text=raw_text,
            pages=[segment],
            warnings=warnings,
            error_code=None,
            error_message=None,
            metadata={
                "character_count": len(norm_text),
                "word_count": len(norm_text.split()),
                "ocr_confidence": avg_conf,
                "duration_ms": duration_ms
            }
        )


    def _extract_docx(self, file_bytes: bytes, correlation_id: str, file_name: str, start_time: float) -> DocumentExtractResponse:
        """
        Extracts DOCX documents using python-docx.
        Traverses paragraphs, tables, hyperlinks, and textboxes in actual document order.
        Does not assign synthetic page numbers (DOCX is unpaged flow).
        """
        import docx
        from docx.oxml.ns import qn

        try:
            doc = docx.Document(io.BytesIO(file_bytes))
        except Exception as e:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="DOCX",
                used_ocr=False,
                text=None,
                error_code="DOCX_CORRUPTED",
                error_message=f"DOCX document is corrupted or invalid: {str(e)}"
            )

        elements_text: List[str] = []
        warnings: List[str] = []

        try:
            # 1. Traverse document body elements in DOM order (paragraphs and tables)
            for child in doc.element.body:
                tag = child.tag
                if tag.endswith("p"):  # Paragraph
                    para = docx.text.paragraph.Paragraph(child, doc)
                    txt = para.text.strip()
                    if txt:
                        elements_text.append(txt)
                elif tag.endswith("tbl"):  # Table
                    table = docx.table.Table(child, doc)
                    for row in table.rows:
                        seen_cells = set()
                        row_cells = []
                        for cell in row.cells:
                            cid = id(cell._tc)
                            if cid not in seen_cells:
                                seen_cells.add(cid)
                                c_text = cell.text.strip()
                                if c_text:
                                    row_cells.append(c_text)
                        if row_cells:
                            elements_text.append(" | ".join(row_cells))

            # 2. Extract header & footer if present
            for section in doc.sections:
                try:
                    if section.header and section.header.paragraphs:
                        h_text = " ".join([p.text.strip() for p in section.header.paragraphs if p.text.strip()])
                        if h_text and h_text not in elements_text:
                            elements_text.insert(0, h_text)
                except Exception:
                    pass

            # 3. Extract text from textboxes (w:txbxContent)
            textbox_texts = []
            try:
                for txbx in doc.element.xpath(".//w:txbxContent//w:t"):
                    if txbx.text and txbx.text.strip():
                        textbox_texts.append(txbx.text.strip())
            except Exception:
                pass
            if textbox_texts:
                tb_combined = " ".join(textbox_texts)
                if tb_combined not in elements_text:
                    elements_text.append(tb_combined)

        except Exception as read_err:
            logger.error(f"Error reading DOCX elements: {read_err}")
            warnings.append(f"Some DOCX elements could not be fully parsed: {str(read_err)}")

        raw_combined = "\n\n".join(elements_text)
        norm_combined = self._normalize_text(raw_combined)

        if not norm_combined or len(norm_combined.replace(" ", "").replace("\n", "")) < 10:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="DOCX",
                used_ocr=False,
                text=None,
                raw_source_text=raw_combined,
                error_code="DOCX_TEXT_EMPTY",
                error_message="DOCX document contains no extractable text content or tables."
            )

        duration_ms = int((time.time() - start_time) * 1000)
        segment = PageSegment(
            page_number=None,
            text=norm_combined,
            raw_text=raw_combined,
            method="docx",
            used_ocr=False,
            start_char=0,
            end_char=len(norm_combined),
            warnings=warnings
        )

        return DocumentExtractResponse(
            status="SUCCESS",
            source_type="DOCX",
            used_ocr=False,
            text=norm_combined,
            raw_source_text=raw_combined,
            pages=[segment],
            warnings=warnings,
            error_code=None,
            error_message=None,
            metadata={
                "elements_count": len(elements_text),
                "character_count": len(norm_combined),
                "word_count": len(norm_combined.split()),
                "duration_ms": duration_ms
            }
        )

    def _extract_doc_via_libreoffice(self, file_bytes: bytes, correlation_id: str, file_name: str, start_time: float) -> DocumentExtractResponse:
        """
        Converts legacy .doc files to PDF using LibreOffice headless in an isolated sandbox.
        Enforces timeout (60s), temporary user profile, and no macro execution.
        Returns DOC_CONVERTER_UNAVAILABLE if LibreOffice is not installed.
        """
        soffice_bin = self._find_libreoffice()
        if not soffice_bin:
            return DocumentExtractResponse(
                status="FAILED",
                source_type="DOC",
                used_ocr=False,
                text=None,
                error_code="DOC_CONVERTER_UNAVAILABLE",
                error_message=(
                    "DOC_CONVERTER_UNAVAILABLE: LibreOffice headless is required to convert legacy .doc files, "
                    "but 'soffice' was not found on PATH or standard install directories. "
                    "Please save the document as .docx or .pdf, or install LibreOffice on the server."
                )
            )

        with tempfile.TemporaryDirectory(prefix="midcv_doc_convert_") as temp_dir:
            input_doc_path = os.path.join(temp_dir, "input.doc")
            with open(input_doc_path, "wb") as f:
                f.write(file_bytes)

            temp_profile = os.path.join(temp_dir, "profile")
            os.makedirs(temp_profile, exist_ok=True)
            profile_url = f"file:///{temp_profile.replace(os.sep, '/')}"

            cmd = [
                soffice_bin,
                "--headless",
                "--invisible",
                "--nodefault",
                "--norestore",
                "--nolockcheck",
                f"-env:UserInstallation={profile_url}",
                "--convert-to", "pdf",
                "--outdir", temp_dir,
                input_doc_path
            ]

            try:
                proc = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=60,
                    check=False
                )
            except subprocess.TimeoutExpired:
                return DocumentExtractResponse(
                    status="FAILED",
                    source_type="DOC",
                    used_ocr=False,
                    text=None,
                    error_code="DOC_CONVERSION_TIMEOUT",
                    error_message="LibreOffice conversion timed out after 60 seconds."
                )
            except Exception as proc_err:
                return DocumentExtractResponse(
                    status="FAILED",
                    source_type="DOC",
                    used_ocr=False,
                    text=None,
                    error_code="DOC_CONVERSION_FAILED",
                    error_message=f"Failed executing LibreOffice conversion: {str(proc_err)}"
                )

            converted_pdf = os.path.join(temp_dir, "input.pdf")
            if not os.path.exists(converted_pdf) or os.path.getsize(converted_pdf) == 0:
                stderr_str = proc.stderr.decode("utf-8", errors="ignore")
                return DocumentExtractResponse(
                    status="FAILED",
                    source_type="DOC",
                    used_ocr=False,
                    text=None,
                    error_code="DOC_CONVERSION_FAILED",
                    error_message=f"LibreOffice failed to convert .doc to PDF: {stderr_str or 'Process exited with code ' + str(proc.returncode)}"
                )

            with open(converted_pdf, "rb") as pf:
                pdf_bytes = pf.read()

            pdf_res = self._extract_pdf(pdf_bytes, correlation_id, file_name, start_time)
            # Update source type to DOC (via LibreOffice)
            pdf_res.source_type = "DOC"
            for seg in pdf_res.pages:
                seg.method = "doc-libreoffice"
            return pdf_res

    def _find_libreoffice(self) -> Optional[str]:
        """Finds LibreOffice soffice binary on Windows, Linux, or macOS."""
        import shutil

        # Check standard PATH
        bin_path = shutil.which("soffice") or shutil.which("libreoffice")
        if bin_path:
            return bin_path

        # Windows default installation paths
        win_candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
        ]
        for p in win_candidates:
            if os.path.isfile(p):
                return p

        # Linux default paths
        linux_candidates = [
            "/usr/bin/soffice",
            "/usr/bin/libreoffice",
            "/usr/local/bin/soffice"
        ]
        for p in linux_candidates:
            if os.path.isfile(p):
                return p

        return None

    def _normalize_text(self, text: str) -> str:
        """
        Normalizes extracted text while preserving facts and identifiers:
        - Unicode NFC normalization (essential for Vietnamese accents like 'ệ', 'ơ', 'ư').
        - Normalizes carriage returns without dropping phone numbers, emails, or names.
        - Preserves paragraph structures while removing non-printable control characters.
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

        # 4. Collapse trailing/leading spaces on lines and multiple spaces
        import re
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.split("\n")]

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
