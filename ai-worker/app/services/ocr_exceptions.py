from typing import Optional, Dict, Any


class OcrBaseException(Exception):
    """Base exception for OCR and document extraction domain errors."""
    def __init__(
        self,
        code: str,
        message: str,
        http_status: int = 500,
        details: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or {}
        self.correlation_id = correlation_id

    def to_dict(self) -> Dict[str, Any]:
        res = {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }
        if self.correlation_id:
            res["correlation_id"] = self.correlation_id
        return res


class OcrDependencyMissingException(OcrBaseException):
    def __init__(self, message: str = "Tesseract-OCR engine is not installed or not found on system PATH.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="OCR_DEPENDENCY_MISSING",
            message=message,
            http_status=503,
            details=details,
            correlation_id=correlation_id
        )


class OcrLanguageMissingException(OcrBaseException):
    def __init__(self, message: str = "AI Worker is missing required OCR language models.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="OCR_LANGUAGE_MISSING",
            message=message,
            http_status=503,
            details=details,
            correlation_id=correlation_id
        )


class OcrMisconfiguredException(OcrBaseException):
    def __init__(self, message: str = "OCR service configuration is invalid.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="OCR_MISCONFIGURED",
            message=message,
            http_status=503,
            details=details,
            correlation_id=correlation_id
        )


class OcrTimeoutException(OcrBaseException):
    def __init__(self, message: str = "OCR processing timed out.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="OCR_TIMEOUT",
            message=message,
            http_status=504,
            details=details,
            correlation_id=correlation_id
        )


class InvalidDocumentException(OcrBaseException):
    def __init__(self, message: str = "Document is corrupted, invalid or unreadable.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="INVALID_DOCUMENT",
            message=message,
            http_status=422,
            details=details,
            correlation_id=correlation_id
        )


class UnsupportedMediaTypeException(OcrBaseException):
    def __init__(self, message: str = "File format is not supported.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="UNSUPPORTED_MEDIA_TYPE",
            message=message,
            http_status=415,
            details=details,
            correlation_id=correlation_id
        )


class DocumentLimitExceededException(OcrBaseException):
    def __init__(self, message: str = "Document exceeds maximum allowed pages or file size limit.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="DOCUMENT_LIMIT_EXCEEDED",
            message=message,
            http_status=422,
            details=details,
            correlation_id=correlation_id
        )


class NoTextExtractedException(OcrBaseException):
    def __init__(self, message: str = "No readable text content could be extracted from document.", details: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        super().__init__(
            code="NO_TEXT_EXTRACTED",
            message=message,
            http_status=422,
            details=details,
            correlation_id=correlation_id
        )
