import re
from typing import Dict, Any

class MockLLMClient:
    """
    Test-only Mock LLM Client strictly for deterministic offline unit and integration tests.
    This class is isolated in the test suite and is NEVER imported by production runtime code.
    """
    def __init__(self, model_name: str = "mock-model", provider: str = "mock", base_url: str = None):
        self.model_name = model_name
        self.provider = provider
        self.base_url = base_url

    def generate_json(self, system_instruction: str, untrusted_content: str) -> Dict[str, Any]:
        sanitized_content = untrusted_content.replace("<UNTRUSTED_CONTENT>", "").replace("</UNTRUSTED_CONTENT>", "")
        return self._mock_response_for_content(sanitized_content, system_instruction)

    def _mock_response_for_content(self, content: str, system_instruction: str = "") -> Dict[str, Any]:
        lower = content.lower()
        is_cv = "cv" in system_instruction.lower() or "resume" in system_instruction.lower()

        if is_cv:
            skills = []
            known_skills = [
                ("Java", "Java", 3),
                ("Spring Boot", "Spring Boot", 2),
                ("Spring Framework", "Spring Boot", 2),
                ("PostgreSQL", "PostgreSQL", 2),
                ("Docker", "Docker", 1),
                ("Kubernetes", "Kubernetes", 1),
                ("Redis", "Redis", 1),
                ("Python", "Python", 2),
                ("FastAPI", "FastAPI", 2),
                ("Django", "Django", 2),
                ("React", "React", 2),
                ("TypeScript", "TypeScript", 2),
                ("Node.js", "Node.js", 1),
                ("Facebook Ads", "Facebook Ads", 2),
                ("Google Analytics", "Google Analytics 4", 2),
                ("GA4", "Google Analytics 4", 2),
                ("Financial Reporting", "Financial Reporting", 3),
                ("Tax Compliance", "Tax Compliance", 3),
                ("Excel", "Excel", 3),
                ("Figma", "Figma", 2),
                ("Adobe XD", "Adobe XD", 2),
                ("Content Creation", "Content Creation", 2),
                ("SQL", "SQL", 2),
                ("AWS", "Amazon Web Services (AWS)", 2),
                ("HTML", "HTML", 1),
                ("CSS", "CSS", 1),
            ]
            for kw, norm, _ in known_skills:
                pattern = r"\b" + re.escape(kw.lower()) + r"\b"
                if re.search(pattern, lower):
                    lines = [l.strip() for l in content.split("\n") if kw.lower() in l.lower()]
                    snippet = lines[0] if lines else kw
                    yr_match = re.search(r"(\d+)\+?\s*(?:years?|năm)\s*(?:of\s*)?(?:experience\s*)?(?:in\s*)?" + re.escape(kw.lower()), lower)
                    skill_yr = int(yr_match.group(1)) if yr_match else 0
                    skills.append({
                        "skill_name": kw,
                        "normalized_name": norm,
                        "years_exp": skill_yr,
                        "section": "SKILLS",
                        "snippet": snippet
                    })

            experiences = []
            if "experience" in lower or "work history" in lower or "employment" in lower or "kinh nghiệm" in lower:
                for line in content.split("\n"):
                    l_clean = line.strip()
                    if ("engineer" in l_clean.lower() or "developer" in l_clean.lower() or "lead" in l_clean.lower() or "manager" in l_clean.lower() or "consultant" in l_clean.lower() or "lập trình viên" in l_clean.lower() or "kỹ sư" in l_clean.lower()) and len(l_clean) > 5:
                        comp = "TechCorp Vietnam" if "techcorp" in lower else ("FPT" if "fpt" in lower else ("VNG Corporation" if "vng" in lower else "Software Corp"))
                        if "-" in l_clean:
                            candidate_comp = l_clean.split("-")[0].strip()
                            if len(candidate_comp) <= 35 and not any(ch.isdigit() for ch in candidate_comp):
                                comp = candidate_comp
                        experiences.append({
                            "company_name": comp,
                            "position": l_clean.split("-")[1].split("(")[0].strip() if "-" in l_clean and "(" in l_clean else (l_clean.split("-")[0].strip() if "-" in l_clean else l_clean),
                            "start_date": "2021-01-01" if "2021" in l_clean else ("2022-01-01" if "2022" in l_clean else None),
                            "end_date": None,
                            "is_current": True if "present" in l_clean.lower() or "now" in l_clean.lower() else False,
                            "description": l_clean,
                            "technologies": [s["skill_name"] for s in skills[:3]]
                        })
                        break

            educations = []
            if "education" in lower or "university" in lower or "bachelor" in lower or "degree" in lower or "academic" in lower or "học vấn" in lower or "đại học" in lower or "bách khoa" in lower:
                for line in content.split("\n"):
                    l_clean = line.strip()
                    if ("university" in l_clean.lower() or "college" in l_clean.lower() or "bachelor" in l_clean.lower() or "degree" in l_clean.lower() or "đại học" in l_clean.lower() or "bách khoa" in l_clean.lower()) and len(l_clean) > 5:
                        educations.append({
                            "institution": l_clean,
                            "degree": "Bachelor" if "bachelor" in l_clean.lower() or "kỹ sư" in l_clean.lower() else None,
                            "field_of_study": "Computer Science" if "computer science" in l_clean.lower() or "thông tin" in l_clean.lower() else None,
                            "start_year": 2018 if "2018" in l_clean else None,
                            "end_year": 2022 if "2022" in l_clean else (2023 if "2023" in l_clean else None)
                        })
                        break

            projects = []
            if "project" in lower or "dự án" in lower:
                in_proj = False
                for line in content.split("\n"):
                    l_clean = line.strip()
                    if not l_clean:
                        continue
                    if "project" in l_clean.lower() and (l_clean.endswith(":") or len(l_clean) < 25):
                        in_proj = True
                        continue
                    if in_proj:
                        if l_clean.isupper() and (l_clean.endswith(":") or "language" in l_clean.lower() or "education" in l_clean.lower() or "certification" in l_clean.lower()):
                            in_proj = False
                            continue
                        if not l_clean.lower().startswith("role:") and not l_clean.lower().startswith("developed") and len(l_clean) > 3:
                            proj_name = l_clean.split(":")[0].strip() if ":" in l_clean else l_clean
                            projects.append({
                                "name": proj_name,
                                "role": "Lead Architect" if "lead" in lower else "Developer",
                                "description": l_clean,
                                "tech_stack": [s["skill_name"] for s in skills[:2]]
                            })
                            break
                    elif "project" in l_clean.lower() and len(l_clean) > 8 and not l_clean.lower().startswith("selected") and not l_clean.lower().startswith("key"):
                        projects.append({
                            "name": l_clean.split(":")[0].strip() if ":" in l_clean else l_clean,
                            "role": "Developer",
                            "description": l_clean,
                            "tech_stack": [s["skill_name"] for s in skills[:2]]
                        })
                        break

            certifications = []
            if "certification" in lower or "certificate" in lower or "chứng chỉ" in lower or "aws certified" in lower:
                for line in content.split("\n"):
                    l_clean = line.strip()
                    if ("certified" in l_clean.lower() or "certificate" in l_clean.lower() or "chứng chỉ" in l_clean.lower() or "aws" in l_clean.lower()) and len(l_clean) > 5 and not l_clean.lower().endswith(":"):
                        certifications.append({
                            "name": l_clean.split("-")[0].strip() if "-" in l_clean else l_clean,
                            "issuer": "Amazon Web Services" if ("aws" in l_clean.lower() or "amazon" in l_clean.lower()) else None,
                            "date": "2023" if "2023" in l_clean else None
                        })
                        break

            languages = []
            if "language" in lower or "ngôn ngữ" in lower or "english" in lower or "vietnamese" in lower or "japanese" in lower or "french" in lower:
                if "english" in lower:
                    prof = "ADVANCED" if "advanced" in lower else ("intermediate" if "intermediate" in lower else None)
                    languages.append({"language_name": "English", "proficiency_level": prof})
                if "vietnamese" in lower:
                    prof = "NATIVE" if "native" in lower else None
                    languages.append({"language_name": "Vietnamese", "proficiency_level": prof})
                if "japanese" in lower:
                    prof = "INTERMEDIATE" if "intermediate" in lower else None
                    languages.append({"language_name": "Japanese", "proficiency_level": prof})
                if "french" in lower:
                    prof = "ADVANCED" if "advanced" in lower else None
                    languages.append({"language_name": "French", "proficiency_level": prof})

            gh_match = re.search(r"https?://(?:www\.)?github\.com/[a-zA-Z0-9_-]+", content)
            email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", content)
            first_line = [l.strip() for l in content.split("\n") if l.strip() and not l.strip().startswith("http") and "@" not in l.strip()]

            return {
                "full_name": first_line[0] if first_line else None,
                "headline": "Software Engineer" if ("software" in lower or "developer" in lower or "engineer" in lower) else None,
                "bio": None,
                "email": email_match.group(0) if email_match else None,
                "github_url": gh_match.group(0) if gh_match else None,
                "portfolio_url": None,
                "skills": skills,
                "required_skills": skills,
                "preferred_skills": [],
                "experiences": experiences,
                "educations": educations,
                "projects": projects,
                "certifications": certifications,
                "languages": languages
            }

        if "frontend" in lower or "react" in lower:
            return {
                "seniority": "Mid",
                "responsibilities": ["Develop user interfaces with React and TypeScript"],
                "required_skills": [
                    {"skill_name": "React", "normalized_name": "React", "type": "REQUIRED", "min_years_exp": 2, "section": "Must have", "snippet": "React.js"},
                    {"skill_name": "TypeScript", "normalized_name": "TypeScript", "type": "REQUIRED", "min_years_exp": 2, "section": "Must have", "snippet": "TypeScript"},
                    {"skill_name": "Node.js", "normalized_name": "Node.js", "type": "REQUIRED", "min_years_exp": 1, "section": "Must have", "snippet": "Node.js"}
                ],
                "preferred_skills": [
                    {"skill_name": "Vue.js", "normalized_name": "Vue.js", "type": "PREFERRED", "min_years_exp": 1, "section": "Nice to have", "snippet": "Vue.js"}
                ],
                "education_requirement": "Bachelor Degree",
                "certifications_required": [],
                "spoken_languages": ["English"]
            }
        elif "marketing" in lower or "facebook ads" in lower:
            return {
                "seniority": "Mid",
                "responsibilities": ["Manage digital advertising campaigns"],
                "required_skills": [
                    {"skill_name": "Facebook Ads", "normalized_name": "Facebook Ads", "type": "REQUIRED", "min_years_exp": 2, "section": "Mandatory", "snippet": "Facebook Ads"},
                    {"skill_name": "GA4", "normalized_name": "Google Analytics 4", "type": "REQUIRED", "min_years_exp": 2, "section": "Mandatory", "snippet": "GA4"}
                ],
                "preferred_skills": [
                    {"skill_name": "Figma", "normalized_name": "Figma", "type": "PREFERRED", "min_years_exp": 0, "section": "Preferred", "snippet": "Figma"}
                ],
                "education_requirement": "Bachelor Degree",
                "certifications_required": [],
                "spoken_languages": ["English"]
            }
        elif "accountant" in lower or "financial reporting" in lower:
            return {
                "seniority": "Senior",
                "responsibilities": ["Financial reporting and tax compliance"],
                "required_skills": [
                    {"skill_name": "Financial Reporting", "normalized_name": "Financial Reporting", "type": "REQUIRED", "min_years_exp": 3, "section": "Requirements", "snippet": "Financial Reporting"},
                    {"skill_name": "Tax Compliance", "normalized_name": "Tax Compliance", "type": "REQUIRED", "min_years_exp": 3, "section": "Requirements", "snippet": "Tax Compliance"},
                    {"skill_name": "Excel", "normalized_name": "Excel", "type": "REQUIRED", "min_years_exp": 3, "section": "Requirements", "snippet": "Excel"}
                ],
                "preferred_skills": [
                    {"skill_name": "SAP", "normalized_name": "SAP", "type": "PREFERRED", "min_years_exp": 0, "section": "Bonus", "snippet": "SAP"}
                ],
                "education_requirement": "Bachelor of Finance/Accounting",
                "certifications_required": [],
                "spoken_languages": ["English"]
            }
        elif "designer" in lower or "figma" in lower:
            return {
                "seniority": "Mid",
                "responsibilities": ["Design UI wireframes and visual prototypes"],
                "required_skills": [
                    {"skill_name": "Figma", "normalized_name": "Figma", "type": "REQUIRED", "min_years_exp": 2, "section": "Required", "snippet": "Figma"},
                    {"skill_name": "Adobe XD", "normalized_name": "Adobe XD", "type": "REQUIRED", "min_years_exp": 2, "section": "Required", "snippet": "Adobe XD"}
                ],
                "preferred_skills": [
                    {"skill_name": "HTML", "normalized_name": "HTML", "type": "PREFERRED", "min_years_exp": 1, "section": "Preferred", "snippet": "HTML"}
                ],
                "education_requirement": "Bachelor of Design",
                "certifications_required": [],
                "spoken_languages": ["English"]
            }
        elif "python" in lower:
            return {
                "seniority": "Mid",
                "responsibilities": ["Develop backend services with Python and Django"],
                "required_skills": [
                    {"skill_name": "Python", "normalized_name": "Python", "type": "REQUIRED", "min_years_exp": 2, "section": "Must have", "snippet": "Python"},
                    {"skill_name": "Django", "normalized_name": "Django", "type": "REQUIRED", "min_years_exp": 2, "section": "Must have", "snippet": "Django"},
                    {"skill_name": "Redis", "normalized_name": "Redis", "type": "REQUIRED", "min_years_exp": 1, "section": "Must have", "snippet": "Redis"}
                ],
                "preferred_skills": [],
                "education_requirement": "Bachelor Degree",
                "certifications_required": [],
                "spoken_languages": ["English"]
            }
        else:
            req_skills = [
                {"skill_name": "Java", "normalized_name": "Java", "type": "REQUIRED", "min_years_exp": 3, "section": "Requirements", "snippet": "experience with Java"},
                {"skill_name": "Spring Framework", "normalized_name": "Spring Boot", "type": "REQUIRED", "min_years_exp": 2, "section": "Requirements", "snippet": "experience with Spring Framework"},
                {"skill_name": "PostgreSQL", "normalized_name": "PostgreSQL", "type": "REQUIRED", "min_years_exp": 2, "section": "Requirements", "snippet": "PostgreSQL database experience"}
            ]
            if "kubernetes" in lower or "k8s" in lower:
                req_skills.append({"skill_name": "Kubernetes", "normalized_name": "Kubernetes", "type": "REQUIRED", "min_years_exp": 1, "section": "Requirements", "snippet": "Kubernetes"})

            return {
                "seniority": "Senior",
                "responsibilities": ["Design and implement microservices", "Optimize PostgreSQL queries"],
                "required_skills": req_skills,
                "preferred_skills": [
                    {"skill_name": "Docker", "normalized_name": "Docker", "type": "PREFERRED", "min_years_exp": 1, "section": "Preferred", "snippet": "Familiarity with Docker"},
                    {"skill_name": "AWS", "normalized_name": "Amazon Web Services (AWS)", "type": "PREFERRED", "min_years_exp": 1, "section": "Preferred", "snippet": "Knowledge of AWS"}
                ],
                "education_requirement": "Bachelor of Computer Science",
                "certifications_required": [],
                "spoken_languages": ["English"]
            }
