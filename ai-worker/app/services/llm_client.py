import re
import time
import json
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class LLMAPIError(Exception):
    """
    Explicit Exception for LLM API failures across providers (Ollama, OpenAI).
    Preserves HTTP status code, error type, error code, error message, and request ID
    WITHOUT exposing secrets, tokens, or API keys.
    """
    def __init__(
        self,
        status_code: int,
        error_type: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        request_id: Optional[str] = None,
        provider: Optional[str] = None,
        body: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.error_type = error_type
        self.error_code = error_code
        self.error_message = error_message
        self.request_id = request_id
        self.provider = provider or "llm"
        self.body = body or {}
        super().__init__(
            f"[{self.provider.upper()}] API error HTTP {status_code} "
            f"(error.type={error_type}, error.code={error_code}): {error_message}"
        )


class LLMClient:
    """
    MatchJD Multi-Provider LLM Client supporting:
    1. OLLAMA (local default runtime: dna5rm/granite4.2:3b-8k)
    2. OPENAI (cloud API)
    3. MOCK (deterministic fallback strictly for offline testing when use_mock=True)
    """
    def __init__(
        self,
        model_name: Optional[str] = None,
        provider: Optional[str] = None,
        use_mock: Optional[bool] = None,
        base_url: Optional[str] = None
    ):
        self.provider = (provider or settings.AI_PROVIDER).lower()
        self.use_mock = settings.USE_MOCK_LLM if use_mock is None else use_mock
        
        if self.provider == "ollama":
            self.model_name = model_name or settings.OLLAMA_MODEL
            self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        else:
            self.model_name = model_name or settings.OPENAI_MODEL
            self.base_url = base_url

    def generate_json(self, system_instruction: str, untrusted_content: str) -> Dict[str, Any]:
        """
        Executes LLM request with strict system instruction and untrusted data wrapping.
        Enforces Prompt Injection Defense by strictly isolating System Prompts from Untrusted User Data.
        """
        sanitized_content = untrusted_content.replace("<UNTRUSTED_CONTENT>", "").replace("</UNTRUSTED_CONTENT>", "")

        # Strictly allow mock ONLY when use_mock is True or provider is mock
        if self.use_mock or self.provider == "mock":
            logger.info("Using Mock LLM Client (USE_MOCK_LLM=true)")
            return self._mock_response_for_content(sanitized_content, system_instruction)

        if self.provider == "ollama":
            return self._generate_json_ollama(system_instruction, sanitized_content)
        elif self.provider == "openai":
            return self._generate_json_openai(system_instruction, sanitized_content)
        else:
            raise LLMAPIError(
                status_code=400,
                error_type="unsupported_provider",
                error_code="invalid_provider",
                error_message=f"Unsupported AI_PROVIDER: '{self.provider}'. Expected 'ollama', 'openai', or 'mock'.",
                provider=self.provider
            )

    def _generate_json_ollama(self, system_instruction: str, sanitized_content: str) -> Dict[str, Any]:
        import httpx

        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": f"{system_instruction}\n\nCRITICAL INSTRUCTION: You must respond with a single, valid JSON object ONLY. Do NOT write conversational text, markdown formatting, explanations, or thinking processes."
                },
                {
                    "role": "user",
                    "content": f"<UNTRUSTED_CONTENT>\n{sanitized_content}\n</UNTRUSTED_CONTENT>"
                }
            ],
            "format": "json",
            "think": False,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 1024
            }
        }

        max_retries = 2
        for attempt in range(max_retries + 1):
            t0 = time.time()
            try:
                with httpx.Client(timeout=180.0) as client:
                    resp = client.post(url, json=payload)
            except Exception as net_err:
                logger.error(f"[Ollama] Connection error on {url}: {net_err}")
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue
                raise LLMAPIError(
                    status_code=503,
                    error_type="server_unavailable",
                    error_code="connection_failed",
                    error_message=f"Failed to connect to Ollama server at {url}: {net_err}",
                    provider="ollama"
                )

            if resp.is_error:
                status_code = resp.status_code
                err_msg = resp.text
                logger.error(f"[Ollama] HTTP error {status_code}: {err_msg}")
                raise LLMAPIError(
                    status_code=status_code,
                    error_type="http_error",
                    error_code="ollama_request_failed",
                    error_message=err_msg,
                    provider="ollama"
                )

            latency = time.time() - t0
            res_json = resp.json()
            message_obj = res_json.get("message", {})
            raw_text = message_obj.get("content", "").strip()
            
            # If content is empty but model produced JSON in thinking, extract from thinking
            if not raw_text and message_obj.get("thinking"):
                raw_text = message_obj.get("thinking", "").strip()

            parsed_data = self._clean_and_parse_json(raw_text)
            if parsed_data is not None:
                logger.info(f"[Ollama] Extraction success via {self.model_name} in {latency:.2f}s")
                return parsed_data

            logger.warning(f"[Ollama] Malformed JSON on attempt {attempt + 1}: {raw_text[:200]}")
            if attempt < max_retries:
                time.sleep(1.0)
                continue

        # All retries failed
        raise LLMAPIError(
            status_code=502,
            error_type="malformed_output",
            error_code="invalid_json",
            error_message=f"Ollama model {self.model_name} failed to produce valid JSON after {max_retries + 1} attempts.",
            provider="ollama"
        )

    def _clean_and_parse_json(self, raw_text: str) -> Optional[Dict[str, Any]]:
        """Cleans and extracts valid JSON object from LLM response"""
        if not raw_text:
            return None
        text = raw_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if len(lines) >= 2:
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip().startswith("```"):
                    lines = lines[:-1]
                text = "\n".join(lines).strip()

        try:
            val = json.loads(text)
            if isinstance(val, dict):
                return val
        except Exception:
            pass

        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            try:
                val = json.loads(match.group(1))
                if isinstance(val, dict):
                    return val
            except Exception:
                pass

        return None

    def _generate_json_openai(self, system_instruction: str, sanitized_content: str) -> Dict[str, Any]:
        import httpx
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        body = {
            "model": self.model_name,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"<UNTRUSTED_CONTENT>\n{sanitized_content}\n</UNTRUSTED_CONTENT>"}
            ]
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
        except Exception as net_err:
            logger.error(f"[OpenAI] Network request failed: {net_err}")
            raise LLMAPIError(
                status_code=503,
                error_type="network_error",
                error_code="connection_failed",
                error_message=str(net_err),
                provider="openai"
            )

        request_id = resp.headers.get("x-request-id")
        if resp.is_error:
            status_code = resp.status_code
            err_type = None
            err_code = None
            err_message = None
            resp_body = {}
            try:
                resp_body = resp.json()
                err_obj = resp_body.get("error", {})
                err_type = err_obj.get("type")
                err_code = err_obj.get("code")
                err_message = err_obj.get("message")
            except Exception:
                err_message = resp.text

            logger.error(
                f"[OpenAI] API request failed: status_code={status_code}, "
                f"error.type={err_type}, error.code={err_code}, "
                f"error.message={err_message}, request_id={request_id}"
            )

            raise LLMAPIError(
                status_code=status_code,
                error_type=err_type,
                error_code=err_code,
                error_message=err_message,
                request_id=request_id,
                provider="openai",
                body=resp_body
            )

        try:
            res_data = resp.json()
            content = res_data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as parse_err:
            logger.error(f"[OpenAI] Failed to parse LLM JSON output: {parse_err}")
            raise LLMAPIError(
                status_code=502,
                error_type="malformed_output",
                error_code="invalid_json",
                error_message=str(parse_err),
                provider="openai"
            )

    def _mock_response_for_content(self, content: str, system_instruction: str = "") -> Dict[str, Any]:
        """Fallback mock extractor supporting multi-industry keyword matching and CV non-fabrication extraction"""
        lower = content.lower()
        is_cv = "cv" in system_instruction.lower() or "resume" in system_instruction.lower()

        if is_cv:
            # High-fidelity CV extraction strictly grounded in provided content (zero-fabrication)
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
            for kw, norm, exp in known_skills:
                pattern = r"\b" + re.escape(kw.lower()) + r"\b"
                if re.search(pattern, lower):
                    lines = [l.strip() for l in content.split("\n") if kw.lower() in l.lower()]
                    snippet = lines[0] if lines else kw
                    skills.append({
                        "skill_name": kw,
                        "normalized_name": norm,
                        "min_years_exp": exp,
                        "years_exp": exp,
                        "section": "SKILLS",
                        "snippet": snippet
                    })

            experiences = []
            if "experience" in lower or "work history" in lower or "employment" in lower:
                for line in content.split("\n"):
                    l_clean = line.strip()
                    if ("engineer" in l_clean.lower() or "developer" in l_clean.lower() or "lead" in l_clean.lower() or "manager" in l_clean.lower() or "consultant" in l_clean.lower()) and len(l_clean) > 5:
                        experiences.append({
                            "company_name": "TechCorp Vietnam" if "techcorp" in lower else ("FPT" if "fpt" in lower else "Software Corp"),
                            "position": l_clean.split("-")[0].split("at")[0].strip() if ("-" in l_clean or "at" in l_clean) else l_clean,
                            "start_date": "2021-01-01" if "2021" in l_clean else ("2022-01-01" if "2022" in l_clean else None),
                            "end_date": None,
                            "is_current": True if "present" in l_clean.lower() or "now" in l_clean.lower() else False,
                            "description": l_clean,
                            "technologies": [s["skill_name"] for s in skills[:3]]
                        })
                        break

            educations = []
            if "education" in lower or "university" in lower or "bachelor" in lower or "degree" in lower or "academic" in lower:
                for line in content.split("\n"):
                    l_clean = line.strip()
                    if ("university" in l_clean.lower() or "college" in l_clean.lower() or "bachelor" in l_clean.lower() or "degree" in l_clean.lower()) and len(l_clean) > 5:
                        educations.append({
                            "institution": l_clean,
                            "degree": "Bachelor" if "bachelor" in l_clean.lower() else None,
                            "field_of_study": "Computer Science" if "computer science" in l_clean.lower() else None,
                            "start_year": 2018 if "2018" in l_clean else None,
                            "end_year": 2022 if "2022" in l_clean else None
                        })
                        break

            projects = []
            if "project" in lower:
                in_proj = False
                for line in content.split("\n"):
                    l_clean = line.strip()
                    if not l_clean:
                        continue
                    if "project" in l_clean.lower() and (l_clean.endswith(":") or len(l_clean) < 25):
                        in_proj = True
                        continue
                    if in_proj:
                        if l_clean.isupper() and (l_clean.endswith(":") or "language" in l_clean.lower() or "education" in l_clean.lower()):
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

            languages = []
            if "language" in lower or "english" in lower or "vietnamese" in lower or "japanese" in lower:
                if "english" in lower:
                    languages.append({"language_name": "English", "proficiency_level": "ADVANCED"})
                if "vietnamese" in lower:
                    languages.append({"language_name": "Vietnamese", "proficiency_level": "NATIVE"})
                if "japanese" in lower:
                    languages.append({"language_name": "Japanese", "proficiency_level": "INTERMEDIATE"})

            gh_match = re.search(r"https?://(?:www\.)?github\.com/[a-zA-Z0-9_-]+", content)
            email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", content)
            first_line = [l.strip() for l in content.split("\n") if l.strip() and not l.strip().startswith("http") and "@" not in l.strip()]

            return {
                "full_name": first_line[0] if first_line else "Candidate Name",
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
