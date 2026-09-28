import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.jd import JDExtractRequest, JDExtractResponse
from app.schemas.cv import CVExtractRequest, CVExtractResponse
from app.schemas.document import DocumentExtractRequest, DocumentExtractResponse
from app.schemas.github import GitHubAnalyzeRequest, GitHubAnalyzeResponse
from app.schemas.taxonomy import (
    SkillNormalizeRequest,
    SkillNormalizeResponse,
    AutocompleteResponse
)
from app.schemas.matching import SemanticCompareRequest, SemanticCompareResponse
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser
from app.services.document_extractor import DocumentExtractor
from app.services.github_analyzer import GitHubAnalyzer
from app.services.taxonomy_normalizer import TaxonomyNormalizer
from app.services.semantic_matching_service import SemanticMatchingService
from app.services.llm.openai_compatible_client import OpenAICompatibleClient
from app.api.dev_endpoints import dev_router
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()
router.include_router(dev_router)

jd_parser = JDParser()
document_extractor = DocumentExtractor()
cv_parser = CVParser(document_extractor=document_extractor)
github_analyzer = GitHubAnalyzer()
semantic_matching_service = SemanticMatchingService()

# Initialize TaxonomyNormalizer with primary LLM client if configured
primary_llm_client = None
if settings.LLM_PRIMARY_ENABLED and settings.LLM_PRIMARY_API_KEY:
    try:
        primary_llm_client = OpenAICompatibleClient(
            base_url=settings.LLM_PRIMARY_BASE_URL,
            api_key=settings.LLM_PRIMARY_API_KEY,
            model=settings.LLM_PRIMARY_MODEL,
            timeout_seconds=settings.LLM_PRIMARY_TIMEOUT_SECONDS,
            max_retries=settings.LLM_PRIMARY_MAX_RETRIES
        )
    except Exception as e:
        logger.warning(f"Failed to initialize LLM client for taxonomy normalizer: {e}")

taxonomy_normalizer = TaxonomyNormalizer(llm_client=primary_llm_client)

import httpx

@router.get("/health")
def health_check():
    primary_configured = bool(
        settings.LLM_PRIMARY_BASE_URL and settings.LLM_PRIMARY_API_KEY and settings.LLM_PRIMARY_MODEL
    )
    
    primary_reachable = False
    if primary_configured:
        try:
            with httpx.Client(timeout=1.0) as http_client:
                headers = {"Authorization": f"Bearer {settings.LLM_PRIMARY_API_KEY}"}
                resp = http_client.get(f"{settings.LLM_PRIMARY_BASE_URL}/models", headers=headers)
                primary_reachable = resp.status_code in [200, 404]
        except Exception:
            primary_reachable = False

    ollama_reachable = False
    if settings.LLM_FALLBACK_ENABLED:
        try:
            with httpx.Client(timeout=1.0) as http_client:
                resp = http_client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                ollama_reachable = resp.status_code == 200
        except Exception:
            ollama_reachable = False

    return {
        "status": "UP",
        "documentExtraction": {
            "status": "UP"
        },
        "llm": {
            "primary": {
                "provider": settings.LLM_PRIMARY_PROVIDER,
                "configured": primary_configured,
                "reachable": primary_reachable,
                "model": settings.LLM_PRIMARY_MODEL
            },
            "fallback": {
                "provider": settings.LLM_FALLBACK_PROVIDER,
                "enabled": settings.LLM_FALLBACK_ENABLED,
                "reachable": ollama_reachable,
                "model": settings.OLLAMA_CHAT_MODEL
            }
        }
    }

@router.post("/extract-document", response_model=DocumentExtractResponse)
def extract_document(request: DocumentExtractRequest):
    try:
        logger.info(f"Received Document Extraction request [file_name={request.file_name}, declared_type={request.file_type}]")
        return document_extractor.extract_document(request)
    except Exception as e:
        logger.error(f"Document Extraction unhandled exception: {e}", exc_info=True)
        return DocumentExtractResponse(
            status="FAILED",
            source_type=request.file_type or "UNKNOWN",
            used_ocr=False,
            text=None,
            error_code="EXTRACTION_ERROR",
            error_message=f"Document extraction unexpected error: {str(e)}"
        )

@router.post("/extract-jd", response_model=JDExtractResponse)
def extract_jd(request: JDExtractRequest):
    try:
        logger.info(f"Received JD Extraction request for job_id: {request.job_id}")
        return jd_parser.parse_job_description(request)
    except Exception as e:
        logger.error(f"JD Extraction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"JD Extraction Error: {str(e)}"
        )

@router.post("/extract-cv", response_model=CVExtractResponse)
def extract_cv(request: CVExtractRequest):
    try:
        logger.info(f"Received CV Extraction request for cv_id: {request.cv_id}, version_id: {request.cv_version_id}")
        return cv_parser.parse_cv_document(request)
    except Exception as e:
        logger.error(f"CV Extraction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CV Extraction Error: {str(e)}"
        )

@router.post("/analyze-github", response_model=GitHubAnalyzeResponse)
def analyze_github(request: GitHubAnalyzeRequest):
    try:
        logger.info(f"Received GitHub Analysis request for candidate_id: {request.candidate_id}")
        return github_analyzer.analyze_candidate_github(request)
    except Exception as e:
        logger.error(f"GitHub Analysis failed: {e}", exc_info=True)
        # Graceful Fallback: Return UNAVAILABLE rather than HTTP 500 error to keep CV/JD processing intact
        return GitHubAnalyzeResponse(
            candidate_id=request.candidate_id,
            username="unknown",
            github_url=request.github_url,
            public_repos_count=0,
            activity_signal="LIMITED_OBSERVABLE_ACTIVITY",
            summary_notes=f"GitHub Analysis fallback triggered due to error: {str(e)}",
            language_rank_summary="Unavailable",
            overall_supporting_rating="UNAVAILABLE",
            status="UNAVAILABLE",
            error_message=str(e)
        )

@router.post("/taxonomy/normalize-skills", response_model=SkillNormalizeResponse)
def normalize_skills(request: SkillNormalizeRequest):
    try:
        logger.info(f"Received Taxonomy Normalization request for {len(request.skills)} skills")
        return taxonomy_normalizer.normalize_skills(request)
    except Exception as e:
        logger.error(f"Taxonomy Normalization failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Taxonomy Normalization Error: {str(e)}"
        )

@router.get("/taxonomy/autocomplete", response_model=AutocompleteResponse)
def autocomplete_skills(query: str = "", limit: int = 10):
    try:
        return taxonomy_normalizer.autocomplete(query=query, limit=limit)
    except Exception as e:
        logger.error(f"Taxonomy Autocomplete failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Taxonomy Autocomplete Error: {str(e)}"
        )

@router.post("/matching/semantic-compare", response_model=SemanticCompareResponse)
def semantic_compare(request: SemanticCompareRequest):
    try:
        logger.info(
            f"Received Semantic Compare request: "
            f"candidate chunks={list(request.candidate_text_chunks.keys())}, "
            f"jd chunks={list(request.jd_text_chunks.keys())}"
        )
        return semantic_matching_service.compare_semantic(request)
    except Exception as e:
        logger.error(f"Semantic comparison failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic Comparison Error: {str(e)}"
        )

