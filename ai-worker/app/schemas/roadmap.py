from typing import List, Optional
from pydantic import BaseModel, Field


class SkillGapItem(BaseModel):
    skill_name: str
    canonical_id: Optional[str] = None
    category: str = Field(
        ...,
        description="One of: MET, MISSING_MANDATORY, MISSING_PREFERRED, RELATED_TO_LEARN, EVIDENCE_MISSING"
    )
    importance: str = Field(default="MEDIUM", description="HIGH | MEDIUM | LOW")
    reason: Optional[str] = None


class RoadmapMilestone(BaseModel):
    milestone_number: int
    title: str
    target_skills: List[str]
    estimated_weeks: int
    learning_objectives: List[str]
    practice_project: str


class SkillGapAnalysisRequest(BaseModel):
    candidate_skills: List[str] = Field(..., description="Skills declared in candidate CV")
    candidate_verified_skills: List[str] = Field(
        default_factory=list,
        description="Skills verified via GitHub or certification"
    )
    jd_required_skills: List[str] = Field(..., description="Mandatory skills from JD")
    jd_preferred_skills: List[str] = Field(
        default_factory=list,
        description="Preferred/nice-to-have skills from JD"
    )
    target_job_title: Optional[str] = Field(
        default="Target Position",
        description="Target job title"
    )
    correlation_id: Optional[str] = None


class SkillGapAnalysisResponse(BaseModel):
    gap_breakdown: List[SkillGapItem]
    met_count: int
    missing_mandatory_count: int
    missing_preferred_count: int
    related_to_learn_count: int
    evidence_missing_count: int
    tailored_roadmap: List[RoadmapMilestone]
    disclaimer: str = Field(
        default="Recommended learning roadmap is strictly for guidance and does NOT automatically modify candidate profile.",
        description="Anti auto-injection disclaimer per AC-P8-02"
    )
