import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.jd import JDExtractRequest, JDExtractResponse
from app.schemas.cv import CVExtractRequest, CVExtractResponse
from app.schemas.document import DocumentExtractRequest, DocumentExtractResponse
from app.schemas.github import GitHubAnalyzeRequest, GitHubAnalyzeResponse
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser
from app.services.document_extractor import DocumentExtractor
from app.services.github_analyzer import GitHubAnalyzer

logger = logging.getLogger(__name__)
router = APIRouter()

jd_parser = JDParser()
document_extractor = DocumentExtractor()
cv_parser = CVParser(document_extractor=document_extractor)
github_analyzer = GitHubAnalyzer()

@router.get("/health")
def health_check():
    return {"status": "UP", "service": "AI Recruitment Worker", "version": "1.0.0"}

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
