import os
import base64
import logging
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field

from app.schemas.document import DocumentExtractRequest, DocumentExtractResponse
from app.services.document_extractor import DocumentExtractor
from app.services.text_quality_evaluator import TextQualityEvaluator

logger = logging.getLogger(__name__)


class ExtractionMetadata(BaseModel):
    fileType: str
    extractionMethod: str
    pageCount: int
    characterCount: int
    wordCount: int
    ocrUsed: bool
    qualityScore: float


class DocumentExtractionResult(BaseModel):
    success: bool
    document: ExtractionMetadata
    rawText: str
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class DocumentExtractionService:
    """
    Dedicated document extraction service responsible for:
    - Receiving PDF, DOCX, DOC, or Image files (file path or bytes/base64).
    - Utilizing local libraries (pdfplumber, pypdfium2, python-docx, pytesseract) to extract raw text.
    - Strictly NEVER calling any LLM.
    - Has no knowledge of LLM models or API keys.
    - Applying TextQualityEvaluator to evaluate extracted text quality and decide OCR necessity.
    - Returning raw text with clear extraction metadata.
    """

    def __init__(
        self,
        document_extractor: Optional[DocumentExtractor] = None,
        quality_evaluator: Optional[TextQualityEvaluator] = None
    ):
        self.document_extractor = document_extractor or DocumentExtractor()
        self.quality_evaluator = quality_evaluator or TextQualityEvaluator()

    def extract_from_file_path(self, file_path: str) -> DocumentExtractionResult:
        """Extracts text from a local filesystem file."""
        if not os.path.exists(file_path):
            return self._build_failure_result(
                file_type="UNKNOWN",
                error_code="FILE_NOT_FOUND",
                error_message=f"File does not exist: {file_path}"
            )

        file_name = os.path.basename(file_path)
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
        except Exception as e:
            return self._build_failure_result(
                file_type="UNKNOWN",
                error_code="FILE_READ_ERROR",
                error_message=f"Unable to read file: {str(e)}"
            )

        return self.extract_from_bytes(file_bytes=file_bytes, file_name=file_name)

    def extract_from_bytes(
        self,
        file_bytes: bytes,
        file_name: str = "document",
        declared_type: Optional[str] = None,
        correlation_id: Optional[str] = None
    ) -> DocumentExtractionResult:
        """Extracts text from in-memory file bytes."""
        if len(file_bytes) == 0:
            return self._build_failure_result(
                file_type="UNKNOWN",
                error_code="FILE_EMPTY",
                error_message="Uploaded document file is 0 bytes (empty file)."
            )

        b64 = base64.b64encode(file_bytes).decode("utf-8")
        req = DocumentExtractRequest(
            file_base64=b64,
            file_name=file_name,
            file_type=declared_type,
            correlation_id=correlation_id
        )

        doc_res: DocumentExtractResponse = self.document_extractor.extract_document(req)

        if doc_res.status == "FAILED":
            return self._build_failure_result(
                file_type=doc_res.source_type,
                error_code=doc_res.error_code or "EXTRACTION_FAILED",
                error_message=doc_res.error_message or "Failed to extract text from document."
            )

        raw_text = doc_res.raw_source_text or doc_res.text or ""
        eval_metrics = self.quality_evaluator.evaluate(raw_text)

        # Map extraction method to standardized uppercase string
        extraction_method = self._resolve_extraction_method(doc_res)

        page_count = len(doc_res.pages) if doc_res.pages else 1

        metadata = ExtractionMetadata(
            fileType=doc_res.source_type,
            extractionMethod=extraction_method,
            pageCount=page_count,
            characterCount=eval_metrics["characterCount"],
            wordCount=eval_metrics["wordCount"],
            ocrUsed=doc_res.used_ocr,
            qualityScore=eval_metrics["qualityScore"]
        )

        return DocumentExtractionResult(
            success=True,
            document=metadata,
            rawText=raw_text
        )

    def _resolve_extraction_method(self, doc_res: DocumentExtractResponse) -> str:
        if doc_res.source_type == "PDF":
            return "PDF_OCR" if doc_res.used_ocr else "PDF_TEXT"
        elif doc_res.source_type == "DOCX":
            return "DOCX_PARSER"
        elif doc_res.source_type == "DOC":
            return "DOC_LIBREOFFICE"
        elif doc_res.source_type == "IMAGE":
            return "IMAGE_OCR"
        elif doc_res.source_type == "TEXT":
            return "RAW_TEXT"
        return "LOCAL_LIBRARY"

    def _build_failure_result(
        self,
        file_type: str,
        error_code: str,
        error_message: str
    ) -> DocumentExtractionResult:
        return DocumentExtractionResult(
            success=False,
            document=ExtractionMetadata(
                fileType=file_type,
                extractionMethod="NONE",
                pageCount=0,
                characterCount=0,
                wordCount=0,
                ocrUsed=False,
                qualityScore=0.0
            ),
            rawText="",
            error_code=error_code,
            error_message=error_message
        )
