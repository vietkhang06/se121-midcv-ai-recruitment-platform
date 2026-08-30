from typing import List, Optional
from pydantic import BaseModel, Field

class RequirementEvidence(BaseModel):
    skill_name: str
    normalized_name: str
    requirement_type: str = Field(description="REQUIRED or PREFERRED")
    min_years_exp: int = 0
    section: str
    snippet: str

class JDExtractRequest(BaseModel):
    job_id: str
    title: str
    industry: str
    raw_description: str
    correlation_id: Optional[str] = None

class JDExtractResponse(BaseModel):
    job_id: str
    correlation_id: str
    title: str
    industry: str
    seniority: str
    responsibilities: List[str]
    required_skills: List[RequirementEvidence]
    preferred_skills: List[RequirementEvidence]
    education_requirement: Optional[str] = None
    certifications_required: List[str] = Field(default_factory=list)
    spoken_languages: List[str] = Field(default_factory=list)
    status: str = "SUCCESS"
    error_message: Optional[str] = None
