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
