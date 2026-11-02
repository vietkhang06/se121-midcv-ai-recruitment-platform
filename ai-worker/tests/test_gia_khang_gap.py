"""Synthetic behavioral contracts; no external provider or production database."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
import pytest
from pydantic import ValidationError
from app.services.skill_gap_service import SkillGapService
from app.schemas.roadmap import SkillGapAnalysisRequest

def test_gap_with_no_missing_skills_does_not_invent_a_roadmap():
    request = SkillGapAnalysisRequest(candidate_skills=["Java"], jd_required_skills=["Java"], target_job_title="Java engineer")
    before = request.model_dump()
    result = SkillGapService().analyze_gap_and_generate_roadmap(request)
    assert result.tailored_roadmap == []
    assert request.model_dump() == before


def test_empty_evidence_assessment_differs_from_unassessed():
    result = SkillGapService().analyze_gap_and_generate_roadmap(SkillGapAnalysisRequest(
        candidate_skills=["Java"], candidate_verified_skills=[], jd_required_skills=["Java"]))
    assert result.evidence_missing_count == 1 and result.met_count == 0
