from typing import List, Optional
from pydantic import BaseModel, Field

class LanguageDistribution(BaseModel):
    language_name: str
    bytes_count: int
    percentage_ratio: float

class ExtractedRepo(BaseModel):
    name: str
    repo_url: str
    description: Optional[str] = None
    primary_language: Optional[str] = None
    stars_count: int = 0
    forks_count: int = 0
    is_archived: bool = False
    updated_at_github: Optional[str] = None
    languages: List[LanguageDistribution] = Field(default_factory=list)
    topics: List[str] = Field(default_factory=list)

class GitHubAnalyzeRequest(BaseModel):
    candidate_id: str
    github_url: str
    target_job_title: Optional[str] = None
    target_job_industry: Optional[str] = None
    correlation_id: Optional[str] = None

class GitHubAnalyzeResponse(BaseModel):
    candidate_id: str
    username: str
    github_url: str
    public_repos_count: int
    activity_signal: str  # HIGH, MODERATE, LOW, LIMITED_OBSERVABLE_ACTIVITY
    latest_activity_at: Optional[str] = None
    observation_window_days: int = 180
    language_distributions: List[LanguageDistribution] = Field(default_factory=list)
    repositories: List[ExtractedRepo] = Field(default_factory=list)
    summary_notes: str
    language_rank_summary: str
    overall_supporting_rating: str
    status: str = "SYNCED"
    error_message: Optional[str] = None
