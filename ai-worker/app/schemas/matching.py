from typing import Dict, Optional
from pydantic import BaseModel, Field


class SemanticCompareRequest(BaseModel):
    candidate_text_chunks: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary mapping section names to text chunks (e.g. summary, experience, projects)"
    )
    jd_text_chunks: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary mapping section names to text chunks (e.g. overview, requirements, responsibilities)"
    )
    correlation_id: Optional[str] = None


class SemanticCompareResponse(BaseModel):
    similarity_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Dictionary of calculated cosine similarity scores in range [0.0, 1.0]"
    )


class ExplainScoreRequest(BaseModel):
    overall_score: float = Field(..., description="Overall match score in range 0-100")
    score_breakdown: Dict[str, float] = Field(
        default_factory=dict,
        description="Detailed score breakdown (e.g. required_skills_score, experience_score, etc.)"
    )
    reason_codes: list[str] = Field(
        default_factory=list,
        description="List of machine-generated reason codes explaining the match factors"
    )
    target_job_title: Optional[str] = Field(
        default="Specified Position",
        description="Target job title"
    )
    correlation_id: Optional[str] = None


class ExplainScoreResponse(BaseModel):
    explanation_markdown: str = Field(
        ...,
        description="Grounded, human-readable markdown explanation of the score"
    )

