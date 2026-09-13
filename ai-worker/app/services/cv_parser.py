import io
import re
import time
import uuid
import base64
import logging
from typing import Dict, Any, List, Optional
from app.schemas.cv import (
    CVExtractRequest, CVExtractResponse, CVEvidence,
    ExtractedSkill, ExtractedExperience, ExtractedEducation,
    ExtractedProject, ExtractedLanguage, ExtractedCertification, ContactInfo
)
from app.services.llm_client import LLMClient
from app.services.normalizer import normalize_skill_name

logger = logging.getLogger(__name__)

# Canonical Section Heading Aliases Map
SECTION_ALIASES = {
    "skills": "SKILLS",
    "technical skills": "SKILLS",
    "core competencies": "SKILLS",
    "key skills": "SKILLS",
    "technical expertise": "SKILLS",
    "expertise": "SKILLS",
    
    "experience": "EXPERIENCE",
    "work experience": "EXPERIENCE",
    "professional experience": "EXPERIENCE",
    "employment history": "EXPERIENCE",
    "career history": "EXPERIENCE",
    "work history": "EXPERIENCE",
    
    "education": "EDUCATION",
    "academic background": "EDUCATION",
    "education history": "EDUCATION",
    "academic qualifications": "EDUCATION",
    
    "projects": "PROJECTS",
    "selected projects": "PROJECTS",
    "key projects": "PROJECTS",
    "personal projects": "PROJECTS",
    
    "languages": "LANGUAGES",
    "spoken languages": "LANGUAGES",
    "language proficiency": "LANGUAGES"
}

def map_heading_to_canonical_section(heading: str) -> str:
    if not heading:
        return "GENERAL"
    clean = heading.strip().lower()
    return SECTION_ALIASES.get(clean, "GENERAL")

from app.schemas.document import DocumentExtractRequest
from app.services.document_extractor import DocumentExtractor

class CVParser:
    def __init__(self, llm_client: LLMClient = None, document_extractor: DocumentExtractor = None):
        self.llm_client = llm_client or LLMClient()
        self.document_extractor = document_extractor or DocumentExtractor()

    def parse_cv_document(self, request: CVExtractRequest) -> CVExtractResponse:
        correlation_id = request.correlation_id or str(uuid.uuid4())
        raw_text = request.raw_text

        # If raw_text is missing and file_base64 is provided, extract via DocumentExtractor
        if (raw_text is None or not raw_text.strip()) and request.file_base64:
            doc_req = DocumentExtractRequest(
                file_base64=request.file_base64,
                file_type=request.file_type,
                correlation_id=correlation_id
            )
            doc_res = self.document_extractor.extract_document(doc_req)
            if doc_res.status == "FAILED":
                return CVExtractResponse(
                    cv_id=request.cv_id,
                    cv_version_id=request.cv_version_id,
                    correlation_id=correlation_id,
                    status="FAILED",
                    error_message=f"{doc_res.error_code}: {doc_res.error_message}"
                )
            raw_text = doc_res.text

        # Strict input validation
        if raw_text is None:
            return CVExtractResponse(
                cv_id=request.cv_id,
                cv_version_id=request.cv_version_id,
                correlation_id=correlation_id,
                status="FAILED",
                error_code="RAW_TEXT_MISSING",
                error_message="RAW_TEXT_MISSING: Raw CV text is required for information extraction."
            )

        if not raw_text.strip():
            return CVExtractResponse(
                cv_id=request.cv_id,
                cv_version_id=request.cv_version_id,
                correlation_id=correlation_id,
                status="FAILED",
                error_code="RAW_TEXT_EMPTY",
                error_message="RAW_TEXT_EMPTY: Raw CV text is empty."
            )

        if len(raw_text.strip()) < 30:
            return CVExtractResponse(
                cv_id=request.cv_id,
                cv_version_id=request.cv_version_id,
                correlation_id=correlation_id,
                status="FAILED",
                error_code="RAW_TEXT_INSUFFICIENT",
                error_message="RAW_TEXT_INSUFFICIENT: Raw CV text is too short to contain meaningful resume content."
            )

        # Pre-extract regex entities for grounding
        email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", raw_text)
        gh_match = re.search(r"https?://(?:www\.)?github\.com/([a-zA-Z0-9_-]+)", raw_text)
        phone_match = re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b0\d{9}\b", raw_text)
        li_match = re.search(r"https?://(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)", raw_text)

        extracted_email = email_match.group(0) if email_match else None
        extracted_gh = gh_match.group(0) if gh_match else None
        extracted_phone = phone_match.group(0) if phone_match else None
        extracted_li = li_match.group(0) if li_match else None

        system_instruction = """
You are an expert, objective CV & Resume Parsing Engine for the MidCV intelligent recruitment platform.
Your task is to parse raw candidate CV text into a structured JSON representation according to the exact schema.

STRICT ANTI-FABRICATION AND NON-HALLUCINATION RULES:
1. Extract ONLY facts, entities, skills, work history, educations, projects, and languages that are EXPLICITLY STATED in the candidate CV.
2. NEVER invent, fabricate, extrapolate, or assume companies, institutions, degrees, dates, job titles, technologies, or skills.
3. If a section or entity is absent from the candidate text, return an empty array [] or null. Do NOT provide placeholder or default data ("N/A", "Unknown", "Candidate Name", etc.).
4. Do NOT guess or infer skill proficiency levels or years of experience unless explicitly written in the CV text.
5. Do NOT guess dates or company names if not present in the text.
6. Return a valid JSON object only. No markdown formatting, conversational preamble, or explanations.

OUTPUT JSON SCHEMA:
{
  "full_name": "Full Name or null",
  "headline": "Professional Title / Headline or null",
  "bio": "Summary / Bio or null",
  "email": "Email address or null",
  "phone": "Phone number or null",
  "github_url": "GitHub URL or null",
  "portfolio_url": "Portfolio / LinkedIn / Website URL or null",
  "skills": [
    {
      "skill_name": "Exact skill name",
      "years_exp": 0,
      "section": "SKILLS",
      "snippet": "verbatim snippet from raw text"
    }
  ],
  "experiences": [
    {
      "company_name": "Company name",
      "position": "Job title",
      "start_date": "YYYY-MM or YYYY or null",
      "end_date": "YYYY-MM or YYYY or null",
      "is_current": false,
      "description": "Responsibilities and achievements",
      "technologies": ["Tech1", "Tech2"]
    }
  ],
  "educations": [
    {
      "institution": "University / College / School",
      "degree": "Degree name or null",
      "field_of_study": "Major or field of study or null",
      "start_year": null,
      "end_year": null
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "role": "Role in project or null",
      "description": "Project details",
      "tech_stack": ["Tech1"]
    }
  ],
  "languages": [
    {
      "language_name": "Language",
      "proficiency_level": "NATIVE" | "ADVANCED" | "INTERMEDIATE" | "BASIC" | null
    }
  ]
}
"""

        try:
            raw_json = self.llm_client.generate_json(system_instruction, raw_text)
        except Exception as llm_err:
            logger.error(f"LLM extraction failed [cv_id={request.cv_id}]: {llm_err}")
            return CVExtractResponse(
                cv_id=request.cv_id,
                cv_version_id=request.cv_version_id,
                correlation_id=correlation_id,
                status="FAILED",
                error_code="LLM_EXTRACTION_FAILED",
                error_message=f"LLM_EXTRACTION_FAILED: {str(llm_err)}"
            )

        lower_text = raw_text.lower()

        # 1. Identity & Contact Info
        full_name = raw_json.get("full_name")
        if full_name:
            full_name = full_name.strip()
            if full_name.lower() in ["candidate name", "full name", "unknown", "n/a", "none", "not provided"]:
                full_name = None

        if not full_name:
            for line in raw_text.split("\n")[:5]:
                l_clean = line.strip()
                if l_clean and "@" not in l_clean and "http" not in l_clean and ":" not in l_clean and not any(ch.isdigit() for ch in l_clean):
                    words = l_clean.split()
                    if 1 <= len(words) <= 5 and len(l_clean) <= 40:
                        full_name = l_clean
                        break

        headline = raw_json.get("headline")
        if headline and headline.lower() in ["unknown", "n/a", "none"]:
            headline = None

        bio = raw_json.get("bio")
        email = raw_json.get("email") or extracted_email
        phone = raw_json.get("phone") or extracted_phone
        github_url = raw_json.get("github_url") or extracted_gh
        linkedin_url = raw_json.get("linkedin_url") or extracted_li
        portfolio_url = raw_json.get("portfolio_url")

        # Age extraction only if explicitly stated in text
        age = None
        age_match = re.search(r"\b(?:age|tuổi)[:\s]+(\d{1,2})\b", lower_text)
        if not age_match:
            age_match = re.search(r"\b(\d{2})\s*(?:years old|tuổi)\b", lower_text)
        if age_match:
            try:
                age_val = int(age_match.group(1))
                if 16 <= age_val <= 80:
                    age = age_val
            except Exception:
                pass

        # 2. Skills Extraction (Strictly Grounded in raw_text)
        skills: List[ExtractedSkill] = []
        seen_skills = set()

        raw_skill_list = raw_json.get("skills", [])
        if not raw_skill_list:
            raw_skill_list = raw_json.get("required_skills", []) + raw_json.get("preferred_skills", [])

        for s in raw_skill_list:
            s_name = s.get("skill_name") or s.get("name") or ""
            if not s_name.strip():
                continue
            
            # Anti-hallucination check: skill keyword must be in raw_text
            if s_name.lower() in lower_text or normalize_skill_name(s_name).lower() in lower_text:
                norm = normalize_skill_name(s_name)
                if norm not in seen_skills:
                    seen_skills.add(norm)
                    # Do NOT invent years_exp: only if explicitly specified as positive integer
                    raw_years = s.get("years_exp") or s.get("min_years_exp") or 0
                    try:
                        years = int(raw_years) if int(raw_years) >= 0 else 0
                    except (ValueError, TypeError):
                        years = 0
                    sec = map_heading_to_canonical_section(s.get("section", "SKILLS"))
                    skills.append(ExtractedSkill(
                        skill_name=s_name,
                        normalized_name=norm,
                        years_exp=years,
                        section=sec
                    ))

        # Fallback keyword scan only if LLM returned zero skills (with years_exp=0, NEVER 2!)
        if not skills:
            known_catalog = [
                ("Java", "Java"),
                ("Spring Boot", "Spring Boot"),
                ("Spring Framework", "Spring Boot"),
                ("PostgreSQL", "PostgreSQL"),
                ("Postgres", "PostgreSQL"),
                ("Docker", "Docker"),
                ("Kubernetes", "Kubernetes"),
                ("Redis", "Redis"),
                ("Python", "Python"),
                ("FastAPI", "FastAPI"),
                ("Django", "Django"),
                ("React", "React"),
                ("TypeScript", "TypeScript"),
                ("Node.js", "Node.js"),
                ("Facebook Ads", "Facebook Ads"),
                ("Google Analytics", "Google Analytics 4"),
                ("GA4", "Google Analytics 4"),
                ("Financial Reporting", "Financial Reporting"),
                ("Tax Compliance", "Tax Compliance"),
                ("Excel", "Excel"),
                ("Figma", "Figma"),
                ("Adobe XD", "Adobe XD"),
                ("Content Creation", "Content Creation"),
                ("HTML", "HTML"),
                ("CSS", "CSS"),
                ("SQL", "SQL"),
                ("AWS", "Amazon Web Services (AWS)"),
            ]
            for kw, norm in known_catalog:
                pattern = r"\b" + re.escape(kw.lower()) + r"\b"
                if re.search(pattern, lower_text) and norm not in seen_skills:
                    seen_skills.add(norm)
                    skills.append(ExtractedSkill(
                        skill_name=kw,
                        normalized_name=norm,
                        years_exp=0,
                        section="SKILLS"
                    ))

        # 3. Experiences (Strict Non-Fabrication: Empty if not explicitly in raw_text)
        experiences: List[ExtractedExperience] = []
        raw_exps = raw_json.get("experiences", [])
        for exp in raw_exps:
            c_name = exp.get("company_name", "")
            pos = exp.get("position", "")
            # Anti-fabrication check: company or position must appear in raw_text
            if (c_name and c_name.lower() in lower_text) or (pos and pos.lower() in lower_text):
                techs = [t for t in exp.get("technologies", []) if t.lower() in lower_text]
                experiences.append(ExtractedExperience(
                    company_name=c_name,
                    position=pos,
                    start_date=exp.get("start_date"),
                    end_date=exp.get("end_date"),
                    is_current=exp.get("is_current", False),
                    description=exp.get("description", ""),
                    technologies=techs
                ))

        # 4. Educations (Strict Non-Fabrication: Empty if not explicitly in raw_text)
        educations: List[ExtractedEducation] = []
        raw_edus = raw_json.get("educations", [])
        for edu in raw_edus:
            inst = edu.get("institution", "")
            if inst and (inst.lower() in lower_text or any(part in lower_text for part in inst.lower().split() if len(part) > 4)):
                educations.append(ExtractedEducation(
                    institution=inst,
                    degree=edu.get("degree"),
                    field_of_study=edu.get("field_of_study"),
                    start_year=edu.get("start_year"),
                    end_year=edu.get("end_year")
                ))

        # 5. Projects (Strict Non-Fabrication: Empty if not in raw_text)
        projects: List[ExtractedProject] = []
        raw_projs = raw_json.get("projects", [])
        for proj in raw_projs:
            p_name = proj.get("name", "")
            if p_name and p_name.lower() in lower_text:
                techs = [t for t in proj.get("tech_stack", []) if t.lower() in lower_text]
                projects.append(ExtractedProject(
                    name=p_name,
                    role=proj.get("role"),
                    description=proj.get("description", ""),
                    tech_stack=techs
                ))

        # 6. Languages (Strict Non-Fabrication: Empty if not in raw_text)
        languages: List[ExtractedLanguage] = []
        raw_langs = raw_json.get("languages", [])
        for lang in raw_langs:
            if isinstance(lang, dict):
                l_name = lang.get("language_name") or lang.get("name") or ""
                prof = lang.get("proficiency_level")
            elif isinstance(lang, str):
                l_name = lang
                prof = None
            else:
                continue

            if l_name and l_name.lower() in lower_text:
                # Do not speculate proficiency level if not present
                if prof and prof.lower() in ["unknown", "n/a", "none"]:
                    prof = None
                languages.append(ExtractedLanguage(
                    language_name=l_name,
                    proficiency_level=prof
                ))

        # 7. Certifications (Strict Non-Fabrication: Empty if not in raw_text)
        certifications: List[ExtractedCertification] = []
        raw_certs = raw_json.get("certifications", [])
        for cert in raw_certs:
            if isinstance(cert, dict):
                c_name = cert.get("name") or cert.get("certification_name") or ""
                c_issuer = cert.get("issuer")
                c_date = cert.get("date")
            elif isinstance(cert, str):
                c_name = cert
                c_issuer = None
                c_date = None
            else:
                continue

            if c_name and c_name.strip() and (c_name.lower() in lower_text or any(w in lower_text for w in c_name.lower().split() if len(w) > 4)):
                certifications.append(ExtractedCertification(
                    name=c_name.strip(),
                    issuer=c_issuer,
                    date=c_date
                ))

        # 8. Grounded Evidence Traceability (Verbatim Substring Guarantee)
        evidences: List[CVEvidence] = []
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

        for s in skills:
            snippet = None
            for line in lines:
                if s.skill_name.lower() in line.lower() and line in raw_text:
                    snippet = line
                    break
            
            if not snippet:
                s_idx = raw_text.lower().find(s.skill_name.lower())
                if s_idx != -1:
                    snippet = raw_text[s_idx : s_idx + len(s.skill_name)]
                else:
                    norm_idx = raw_text.lower().find(s.normalized_name.lower())
                    if norm_idx != -1:
                        snippet = raw_text[norm_idx : norm_idx + len(s.normalized_name)]

            if snippet and snippet in raw_text:
                evidences.append(CVEvidence(
                    field_name=f"skill_{s.normalized_name.lower().replace(' ', '_')}",
                    section=s.section,
                    snippet=snippet,
                    normalized_value=s.normalized_name
                ))

        contact_info = None
        if email or phone or linkedin_url or portfolio_url:
            contact_info = ContactInfo(
                email=email,
                phone=phone,
                linkedin_url=linkedin_url or portfolio_url
            )

        return CVExtractResponse(
            cv_id=request.cv_id,
            cv_version_id=request.cv_version_id,
            correlation_id=correlation_id,
            full_name=full_name,
            age=age,
            headline=headline,
            bio=bio,
            email=email,
            phone=phone,
            contact_info=contact_info,
            github_url=github_url,
            linkedin_url=linkedin_url,
            portfolio_url=portfolio_url,
            skills=skills,
            experiences=experiences,
            educations=educations,
            projects=projects,
            certifications=certifications,
            languages=languages,
            evidences=evidences,
            status="SUCCESS"
        )

    def _extract_text_from_pdf(self, file_bytes: bytes) -> str:
        res = self.document_extractor._extract_pdf(file_bytes, "cv_parser_internal", "uploaded.pdf", time.time())
        return res.text or ""

    def _extract_text_from_docx(self, file_bytes: bytes) -> str:
        res = self.document_extractor._extract_docx(file_bytes, "cv_parser_internal", "uploaded.docx", time.time())
        return res.text or ""

