from typing import List, Optional
from pydantic import BaseModel, Field

class SkillNormalizeRequest(BaseModel):
    skills: List[str] = Field(..., description="List of raw skill strings extracted from CV or JD")
    context: Optional[str] = Field(None, description="Optional text context surrounding the skills for disambiguation")

class NormalizedSkillItem(BaseModel):
    raw_name: str
    canonical_id: str
    canonical_name: str
    match_type: str = Field(..., description="EXACT | ALIAS | FUZZY | SEMANTIC | LLM_DISAMBIGUATION")
    confidence: float = Field(..., ge=0.0, le=1.0)
    category: Optional[str] = None

class SkillNormalizeResponse(BaseModel):
    normalized_skills: List[NormalizedSkillItem]

class AutocompleteItem(BaseModel):
    canonical_id: str
    canonical_name: str
    category: str
    match_type: str = "PREFIX"

class AutocompleteResponse(BaseModel):
    query: str
    suggestions: List[AutocompleteItem]
