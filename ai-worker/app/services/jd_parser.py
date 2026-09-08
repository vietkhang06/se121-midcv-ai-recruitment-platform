import uuid
import logging
from app.schemas.jd import JDExtractRequest, JDExtractResponse, RequirementEvidence
from app.services.llm_client import LLMClient
from app.services.normalizer import normalize_skill_name

logger = logging.getLogger(__name__)

class JDParser:
    def __init__(self, llm_client: LLMClient = None):
        self.llm_client = llm_client or LLMClient()

    def parse_job_description(self, request: JDExtractRequest) -> JDExtractResponse:
        correlation_id = request.correlation_id or str(uuid.uuid4())
        
        system_instruction = """
You are an expert HR Solution Architect & Business Analyst.
Your task is to parse a raw Job Description (JD) and extract structured requirements into JSON format.

OUTPUT JSON SCHEMA:
{
  "seniority": "Senior",
  "responsibilities": ["Core responsibility 1"],
  "required_skills": [
    {"skill_name": "SkillName", "min_years_exp": 3, "section": "Requirements", "snippet": "Exact quote from text"}
  ],
  "preferred_skills": [
    {"skill_name": "SkillName", "min_years_exp": 1, "section": "Nice to have", "snippet": "Exact quote from text"}
  ],
  "education_requirement": "Degree requirement or null",
  "spoken_languages": ["Language 1"]
}

CRITICAL INSTRUCTIONS:
1. REQUIRED VS PREFERRED: Distinguish strictly between REQUIRED (mandatory qualifications) and PREFERRED (nice to have qualifications).
2. EVIDENCE: For each skill, extract the exact source section and original text quote snippet from the raw JD.
3. UNKNOWN VALUES: If education or languages are not mentioned, return empty list or null. DO NOT invent facts.
"""
        
        raw_result = self.llm_client.generate_json(system_instruction, request.raw_description)
        
        required_evidences = []
        for req in raw_result.get("required_skills", []):
            norm = normalize_skill_name(req.get("skill_name", ""))
            required_evidences.append(RequirementEvidence(
                skill_name=req.get("skill_name", ""),
                normalized_name=norm,
                requirement_type="REQUIRED",
                min_years_exp=req.get("min_years_exp", 0),
                section=req.get("section", "Requirements"),
                snippet=req.get("snippet", req.get("skill_name", ""))
            ))

        preferred_evidences = []
        for pref in raw_result.get("preferred_skills", []):
            norm = normalize_skill_name(pref.get("skill_name", ""))
            preferred_evidences.append(RequirementEvidence(
                skill_name=pref.get("skill_name", ""),
                normalized_name=norm,
                requirement_type="PREFERRED",
                min_years_exp=pref.get("min_years_exp", 0),
                section=pref.get("section", "Preferred"),
                snippet=pref.get("snippet", pref.get("skill_name", ""))
            ))

        return JDExtractResponse(
            job_id=request.job_id,
            correlation_id=correlation_id,
            title=request.title,
            industry=request.industry,
            seniority=raw_result.get("seniority", "Mid"),
            responsibilities=raw_result.get("responsibilities", []),
            required_skills=required_evidences,
            preferred_skills=preferred_evidences,
            education_requirement=raw_result.get("education_requirement"),
            certifications_required=raw_result.get("certifications_required", []),
            spoken_languages=raw_result.get("spoken_languages", []),
            status="SUCCESS"
        )
