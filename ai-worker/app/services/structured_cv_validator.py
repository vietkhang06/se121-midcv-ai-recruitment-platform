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

    def model_post_init(self, __context: Any) -> None:
        super().model_post_init(__context)
        if self.headline is None and self.personalInfo and self.personalInfo.headline:
            self.headline = self.personalInfo.headline
        elif self.personalInfo and self.personalInfo.headline is None and self.headline:
            self.personalInfo.headline = self.headline




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
        """Fail closed for unsupported extracted skills/GPA; never applies to user review edits.

        Schema validity and factual support are separate properties. This local check is
        conservative and does not claim that every paraphrased fact has been verified.
        """
        import re
        import unicodedata

        def normalized(value: str) -> str:
            value = unicodedata.normalize("NFKC", value).casefold()
            return re.sub(r"[\s\-_./\\]+", "", value)

        lower_raw = raw_text.casefold()
        normalized_raw = normalized(raw_text)
        retained = []
        for skill in model.skills:
            # Use word boundaries for plain terms: Java must not match JavaScript.
            term = skill.name.strip().casefold()
            literal = bool(term) and re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", lower_raw)
            flexible = len(term) >= 3 and any(c in term for c in " -_./") and normalized(term) in normalized_raw
            if literal or flexible:
                retained.append(skill)
            else:
                model.warnings.append("Unsupported extracted skill omitted; review the source document.")
        model.skills = retained

        number = r"(\d+(?:[.,]\d+)?)"
        gpa_mentions = []
        # Explicit labelled grades may omit a scale. Bare fractions require a decimal
        # to avoid treating a calendar date such as 3/4 as a GPA.
        for match in re.finditer(r"(?:gpa|grade\s*point\s*average|điểm\s*trung\s*bình|diem\s*trung\s*binh)\s*[:=]?\s*" + number + r"(?:\s*/\s*" + number + r")?", lower_raw):
            gpa_mentions.append((float(match.group(1).replace(',', '.')),
                                 float(match.group(2).replace(',', '.')) if match.group(2) else None))
        for match in re.finditer(r"(?<![\d/])" + number + r"\s*/\s*" + number + r"(?![\d/])", lower_raw):
            if '.' in match.group(1) or ',' in match.group(1):
                gpa_mentions.append((float(match.group(1).replace(',', '.')), float(match.group(2).replace(',', '.'))))
        for education in model.education:
            if education.gpa is None:
                # A scale/display without a source-backed numerical grade is not a fact.
                education.gpa_scale = None
                education.gpa_display = None
                continue
            matches = [(v, scale) for v, scale in gpa_mentions if abs(v-education.gpa) < 1e-9]
            if not matches or education.gpa < 0:
                education.gpa = education.gpa_scale = education.gpa_display = None
                model.warnings.append("Unsupported extracted GPA omitted; no grade is provided by the source.")
                continue
            if education.gpa_scale is not None and not any(scale is not None and abs(scale-education.gpa_scale) < 1e-9 for _, scale in matches):
                education.gpa_scale = None
                education.gpa_display = None
                model.warnings.append("Unsupported GPA scale omitted; the scale must not be inferred.")
            if education.gpa_scale is not None and education.gpa > education.gpa_scale:
                education.gpa = education.gpa_scale = education.gpa_display = None
                model.warnings.append("Invalid extracted GPA omitted; grade exceeds its scale.")
            if education.gpa_display and normalized(education.gpa_display.replace(',', '.')) not in normalized(raw_text.replace(',', '.')):
                education.gpa_display = None

        if model.personalInfo.email and model.personalInfo.email.casefold() not in lower_raw:
            model.personalInfo.email = None
            model.warnings.append("Unsupported extracted email omitted.")
        if model.personalInfo.phone:
            digits = re.sub(r"\D", "", model.personalInfo.phone)
            if not digits or digits not in re.sub(r"\D", "", raw_text):
                model.personalInfo.phone = None
                model.warnings.append("Unsupported extracted phone omitted.")

        model.warnings = list(dict.fromkeys(model.warnings))
        model.evidence["raw_char_count"] = len(raw_text)
        model.evidence["extracted_skills_count"] = len(model.skills)
        model.evidence["grounding_policy"] = "unsupported_skills_gpa_removed_v1"
        return model
