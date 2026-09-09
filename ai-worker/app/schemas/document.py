from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class DocumentExtractRequest(BaseModel):
    file_base64: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None  # "PDF", "DOCX", "IMAGE", etc.
    raw_text: Optional[str] = None
    correlation_id: Optional[str] = None

class DocumentExtractResponse(BaseModel):
    status: str = "SUCCESS"  # "SUCCESS", "PARTIAL", "FAILED"
    source_type: str = "PDF"  # "PDF", "DOCX", "IMAGE", "UNSUPPORTED"
    used_ocr: bool = False
    text: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
