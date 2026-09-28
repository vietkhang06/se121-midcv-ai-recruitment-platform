from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class PageSegment(BaseModel):
    page_number: Optional[int] = None
    text: str
    raw_text: Optional[str] = None
    method: str = "pdf-native"  # "pdf-native", "pdf-ocr", "docx", "doc-libreoffice", "image-ocr", "text"
    used_ocr: bool = False
    start_char: int = 0
    end_char: int = 0
    ocr_confidence: Optional[float] = None
    warnings: List[str] = Field(default_factory=list)

class DocumentExtractRequest(BaseModel):
    file_base64: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None  # "PDF", "DOCX", "IMAGE", "DOC", etc.
    raw_text: Optional[str] = None
    correlation_id: Optional[str] = None

class DocumentExtractResponse(BaseModel):
    status: str = "SUCCESS"  # "SUCCESS", "PARTIAL", "FAILED"
    source_type: str = "PDF"  # "PDF", "DOCX", "DOC", "IMAGE", "TEXT", "UNSUPPORTED"
    documentType: Optional[str] = None
    extractionMethod: Optional[str] = None
    rawText: Optional[str] = None
    pageCount: Optional[int] = None
    characterCount: Optional[int] = None
    qualityScore: Optional[float] = None
    ocrUsed: Optional[bool] = None
    checksum: Optional[str] = None
    correlationId: Optional[str] = None
    used_ocr: bool = False
    text: Optional[str] = None  # Normalized text
    raw_source_text: Optional[str] = None  # Immutable raw source text from extractor
    pages: List[PageSegment] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
