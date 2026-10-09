import json
import logging
from typing import Optional, Dict, Any, Tuple, List
from pydantic import BaseModel, Field, ConfigDict, AliasChoices

logger = logging.getLogger(__name__)


class PersonalInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    fullName: Optional[str] = Field(default=None, validation_alias=AliasChoices("fullName", "full_name"))
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = Field(default=None, validation_alias=AliasChoices("address", "location"))
    headline: Optional[str] = None
    linkedinUrl: Optional[str] = Field(default=None, validation_alias=AliasChoices("linkedinUrl", "linkedin_url"))
    githubUrl: Optional[str] = Field(default=None, validation_alias=AliasChoices("githubUrl", "github_url"))


class ExtractedSkillItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    name: str = Field(validation_alias=AliasChoices("name", "skill_name"))
    level: Optional[str] = None


class ExtractedEducationItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    institution: str
    degree: Optional[str] = None
    fieldOfStudy: Optional[str] = Field(default=None, validation_alias=AliasChoices("fieldOfStudy", "field_of_study"))
    startYear: Optional[int] = Field(default=None, validation_alias=AliasChoices("startYear", "start_year"))
    endYear: Optional[int] = Field(default=None, validation_alias=AliasChoices("endYear", "end_year"))
    gpa: Optional[float] = None
    gpa_scale: Optional[float] = Field(default=None, validation_alias=AliasChoices("gpa_scale", "gpaScale"))
    gpa_display: Optional[str] = Field(default=None, validation_alias=AliasChoices("gpa_display", "gpaDisplay"))


class ExtractedExperienceItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    company: str = Field(validation_alias=AliasChoices("company", "company_name"))
    position: str = Field(validation_alias=AliasChoices("position", "role"))
    startDate: Optional[str] = Field(default=None, validation_alias=AliasChoices("startDate", "start_date"))
    endDate: Optional[str] = Field(default=None, validation_alias=AliasChoices("endDate", "end_date"))
    is_current: bool = Field(default=False, validation_alias=AliasChoices("is_current", "isCurrent"))
    description: str = ""
    technologies: List[str] = Field(default_factory=list, validation_alias=AliasChoices("technologies", "techStack", "tech_stack"))


class ExtractedProjectItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    name: str
    role: Optional[str] = None
    description: str = ""
    techStack: List[str] = Field(default_factory=list, validation_alias=AliasChoices("techStack", "tech_stack", "technologies"))


class ExtractedCertificationItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    name: str
    issuer: Optional[str] = None
    date: Optional[str] = Field(default=None, validation_alias=AliasChoices("date", "issue_date", "issueDate"))


class ExtractedLanguageItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    language: str = Field(validation_alias=AliasChoices("language", "language_name"))
    proficiency: Optional[str] = Field(default=None, validation_alias=AliasChoices("proficiency", "proficiency_level", "proficiencyLevel"))


class StructuredCVData(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    personalInfo: PersonalInfo = Field(default_factory=PersonalInfo, validation_alias=AliasChoices("personalInfo", "personal_info"))
    headline: Optional[str] = None
    summary: Optional[str] = Field(default=None, validation_alias=AliasChoices("summary", "professional_summary", "professionalSummary", "bio"))
    skills: List[ExtractedSkillItem] = Field(default_factory=list)
    education: List[ExtractedEducationItem] = Field(default_factory=list, validation_alias=AliasChoices("education", "educations"))
    experience: List[ExtractedExperienceItem] = Field(default_factory=list, validation_alias=AliasChoices("experience", "experiences", "work_experience", "workExperience"))
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
