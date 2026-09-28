import logging
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.services.document_extraction_service import DocumentExtractionService, ExtractionMetadata

logger = logging.getLogger(__name__)
dev_router = APIRouter(prefix="/dev")

extraction_service = DocumentExtractionService()


class DevExtractResponse(BaseModel):
    success: bool
    document: ExtractionMetadata
    rawText: str


@dev_router.post("/extract-text", response_model=DevExtractResponse)
async def dev_extract_text(file: UploadFile = File(...)):
    """
    Development endpoint for isolated CV text extraction testing.
    Active only when ENABLE_DEV_AI_TEST_ENDPOINTS=true.
    Strictly runs local library extraction without calling any LLM.
    Does NOT log raw text or personal information.
    """
    if not settings.ENABLE_DEV_AI_TEST_ENDPOINTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dev test endpoints are disabled in current environment."
        )

    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided in multipart/form-data upload."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    try:
        # Isolated extraction via local libraries only
        result = extraction_service.extract_from_bytes(
            file_bytes=file_bytes,
            file_name=file.filename
        )

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Extraction failed: [{result.error_code}] {result.error_message}"
            )

        logger.info(
            f"Dev extraction successful [file_name={file.filename}, "
            f"type={result.document.fileType}, method={result.document.extractionMethod}, "
            f"chars={result.document.characterCount}]"
        )

        return DevExtractResponse(
            success=True,
            document=result.document,
            rawText=result.rawText
        )
    finally:
        await file.close()
