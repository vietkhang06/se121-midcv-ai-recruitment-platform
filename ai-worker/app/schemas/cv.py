from typing import List, Optional
from pydantic import BaseModel, Field

class CVEvidence(BaseModel):
    field_name: str
    section: str
    snippet: str
    normalized_value: str

class ExtractedSkill(BaseModel):
    skill_name: str
    normalized_name: str
    years_exp: int = 0
    section: str

class ExtractedExperience(BaseModel):
    company_name: str
    position: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: str
    technologies: List[str] = Field(default_factory=list)

class ExtractedEducation(BaseModel):
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None

class ExtractedProject(BaseModel):
    name: str
    role: Optional[str] = None
    description: str
    tech_stack: List[str] = Field(default_factory=list)

class ExtractedLanguage(BaseModel):
    language_name: str
    proficiency_level: str = "INTERMEDIATE"

class CVExtractRequest(BaseModel):
    cv_id: str
    cv_version_id: str
    file_type: str  # PDF or DOCX
    raw_text: Optional[str] = None
    file_base64: Optional[str] = None
    correlation_id: Optional[str] = None

class CVExtractResponse(BaseModel):
    cv_id: str
    cv_version_id: str
    correlation_id: str
    full_name: Optional[str] = None
    age: Optional[int] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: List[ExtractedSkill] = Field(default_factory=list)
    experiences: List[ExtractedExperience] = Field(default_factory=list)
    educations: List[ExtractedEducation] = Field(default_factory=list)
    projects: List[ExtractedProject] = Field(default_factory=list)
    languages: List[ExtractedLanguage] = Field(default_factory=list)
    evidences: List[CVEvidence] = Field(default_factory=list)
    status: str = "SUCCESS"
    error_message: Optional[str] = None
