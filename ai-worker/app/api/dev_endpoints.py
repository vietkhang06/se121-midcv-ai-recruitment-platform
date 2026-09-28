import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Request
from pydantic import BaseModel

from app.config import settings
from app.services.document_extraction_service import DocumentExtractionService, ExtractionMetadata
from app.services.cv_structuring_service import CVStructuringService, StructuringResponse
from app.services.llm.types import LLMResponse, LLMServerError, LLMAuthenticationError, LLMModelNotFoundError
from app.services.llm.fallback_client import FallbackLLMClient

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
    Calls PRIMARY LLM first with controlled Ollama fallback.
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

    simulate_status = request.headers.get("X-Simulate-Primary-Status")
    if simulate_status == "401":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="[PRIMARY] Authentication failure: HTTP 401 Invalid API key. Fallback prohibited."
        )
    elif simulate_status == "403":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="[PRIMARY] Authorization failure: HTTP 403 Forbidden. Fallback prohibited."
        )
    elif simulate_status == "404":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="[PRIMARY] Model not found: HTTP 404 Model does not exist. Fallback prohibited."
        )

    try:
        if simulate_status == "503":
            # Simulate Primary 503 transient error falling back to Ollama
            class SimulatedPrimary503:
                async def chat(self, messages, correlation_id=None):
                    raise LLMServerError("Simulated 503: Service Unavailable", status_code=503, provider="openai_compatible")
                def chat_sync(self, messages, correlation_id=None):
                    raise LLMServerError("Simulated 503: Service Unavailable", status_code=503, provider="openai_compatible")

            sim_orch = FallbackLLMClient(
                primary_client=SimulatedPrimary503(),
                fallback_client=structuring_service.orchestrator.fallback_client,
                fallback_enabled=True
            )
            sim_service = CVStructuringService(fallback_orchestrator=sim_orch)
            result = await sim_service.structure_raw_text(req.rawText)
        else:
            result = await structuring_service.structure_raw_text(req.rawText)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message or "CV structuring validation failed."
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in dev_structure_cv: {e}")
        status_code_val = getattr(e, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
        if status_code_val in [400, 401, 403, 404, 429, 502, 503]:
            http_status = status_code_val
        else:
            http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
        raise HTTPException(
            status_code=http_status,
            detail=str(e)
        )
