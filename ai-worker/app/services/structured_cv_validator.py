import json
import logging
from typing import Optional, Dict, Any, Tuple, List
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class PersonalInfo(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    headline: Optional[str] = None
    linkedinUrl: Optional[str] = None
    githubUrl: Optional[str] = None


class ExtractedSkillItem(BaseModel):
    name: str
    level: Optional[str] = None


class ExtractedEducationItem(BaseModel):
    institution: str
    degree: Optional[str] = None
    fieldOfStudy: Optional[str] = None
    startYear: Optional[int] = None
    endYear: Optional[int] = None
    gpa: Optional[float] = None
    gpa_scale: Optional[float] = None
    gpa_display: Optional[str] = None


class ExtractedExperienceItem(BaseModel):
    company: str
    position: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: str = ""
    technologies: List[str] = Field(default_factory=list)


class ExtractedProjectItem(BaseModel):
    name: str
    role: Optional[str] = None
    description: str = ""
    techStack: List[str] = Field(default_factory=list)


class ExtractedCertificationItem(BaseModel):
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None


class ExtractedLanguageItem(BaseModel):
    language: str
    proficiency: Optional[str] = None


class StructuredCVData(BaseModel):
    personalInfo: PersonalInfo = Field(default_factory=PersonalInfo)
    headline: Optional[str] = None
    summary: Optional[str] = None
    skills: List[ExtractedSkillItem] = Field(default_factory=list)
    education: List[ExtractedEducationItem] = Field(default_factory=list)
    experience: List[ExtractedExperienceItem] = Field(default_factory=list)
    projects: List[ExtractedProjectItem] = Field(default_factory=list)
    certifications: List[ExtractedCertificationItem] = Field(default_factory=list)
    languages: List[ExtractedLanguageItem] = Field(default_factory=list)
    links: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    evidence: Dict[str, Any] = Field(default_factory=dict)


class StructuredCVValidator:
    """
    Parses and validates LLM-generated JSON into StructuredCVData.
    - Strips whitespace and markdown code fences.
    - Validates JSON syntax.
    - Validates schema structure using Pydantic.
    - Verifies factual grounding against raw text.
    - Never fabricates or invents data to force validation to pass.
    """

    def clean_text(self, raw_output: str) -> str:
        if not raw_output or not isinstance(raw_output, str):
            return ""
        text = raw_output.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if len(lines) >= 2:
                if lines[0].strip().startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip().startswith("```"):
                    lines = lines[:-1]
                text = "\n".join(lines).strip()
        return text

    def validate(self, raw_output: str, raw_text: Optional[str] = None) -> Tuple[bool, bool, Optional[StructuredCVData], Optional[str]]:
        """
        Returns (json_valid, schema_valid, parsed_data, error_message).
        """
        cleaned = self.clean_text(raw_output)
        if not cleaned:
            return False, False, None, "Response content is empty"

        # 1. Parse JSON syntax
        try:
            parsed_dict = json.loads(cleaned)
            if not isinstance(parsed_dict, dict):
                return False, False, None, "Parsed JSON is not a dictionary"
        except Exception as e:
            return False, False, None, f"JSON syntax error: {str(e)}"

        # 2. Validate Pydantic schema
        try:
            model = StructuredCVData.model_validate(parsed_dict)
            if raw_text:
                model = self.ground_with_raw_text(model, raw_text)
            return True, True, model, None
        except Exception as e:
            logger.warning(f"Schema validation error: {e}")
            return True, False, None, f"Schema validation error: {str(e)}"

    def ground_with_raw_text(self, model: StructuredCVData, raw_text: str) -> StructuredCVData:
        """
        Verify extracted facts against raw text to enforce anti-fabrication rules.
        - Adds warnings for any skills or facts not explicitly found in raw CV text.
        - Builds factual evidence references.
        """
        if not raw_text:
            return model

        lower_raw = raw_text.lower()

        # Check skills grounding against raw text with normalization
        import re
        norm_raw = re.sub(r'[\s\-_./\\]+', '', lower_raw)
        for skill in model.skills:
            clean_skill = skill.name.lower().strip()
            norm_skill = re.sub(r'[\s\-_./\\]+', '', clean_skill)
            if clean_skill not in lower_raw and norm_skill not in norm_raw:
                warn_msg = f"Skill '{skill.name}' was not explicitly found in raw CV text."
                if warn_msg not in model.warnings:
                    model.warnings.append(warn_msg)

        # Check personal info grounding
        if model.personalInfo.email and model.personalInfo.email.lower() not in lower_raw:
            model.warnings.append(f"Email '{model.personalInfo.email}' not found in raw text.")
        if model.personalInfo.phone and model.personalInfo.phone not in raw_text:
            model.warnings.append(f"Phone '{model.personalInfo.phone}' not found in raw text.")

        model.evidence["raw_char_count"] = len(raw_text)
        model.evidence["extracted_skills_count"] = len(model.skills)
        return model
