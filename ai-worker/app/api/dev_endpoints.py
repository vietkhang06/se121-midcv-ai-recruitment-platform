import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Request
from pydantic import BaseModel

from app.config import settings
from app.services.document_extraction_service import DocumentExtractionService, ExtractionMetadata
from app.services.cv_structuring_service import CVStructuringService, StructuringResponse
from app.services.llm.types import LLMError

logger = logging.getLogger(__name__)
dev_router = APIRouter(prefix="/dev")

extraction_service = DocumentExtractionService()
structuring_service = CVStructuringService()


class DevExtractResponse(BaseModel):
    success: bool
    document: ExtractionMetadata
    rawText: str


class DevStructureRequest(BaseModel):
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


@dev_router.post("/structure-cv", response_model=StructuringResponse)
async def dev_structure_cv(req: DevStructureRequest, request: Request):
    """
    Development endpoint for converting raw CV text into structured JSON.
    Active only when ENABLE_DEV_AI_TEST_ENDPOINTS=true.
    Does NOT receive files.
    Does NOT call document extraction.
    Calls the configured LLM provider.
    Validates output with Pydantic.
    Supports X-Simulate-Primary-Status header for testing error conditions.
    """
    if not settings.ENABLE_DEV_AI_TEST_ENDPOINTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dev test endpoints are disabled in current environment."
        )

    if not req.rawText or not req.rawText.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Raw text is required and cannot be empty."
        )

    if len(req.rawText.strip()) < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Raw text is too short to contain meaningful CV content."
        )

    simulated = request.headers.get("X-Simulate-Primary-Status")
    if simulated in {"401", "403", "404", "503"}:
        raise HTTPException(int(simulated), f"Simulated LLM provider error (HTTP {simulated}).")

    try:
        result = await structuring_service.structure_raw_text(req.rawText)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message or "CV structuring validation failed."
            )
        return result
    except HTTPException:
        raise
    except LLMError as error:
        status_code = error.status_code or 502
        raise HTTPException(status_code, str(error)) from error
