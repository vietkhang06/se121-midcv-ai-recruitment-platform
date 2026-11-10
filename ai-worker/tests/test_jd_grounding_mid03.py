"""Unit tests with explicit LLM stubs (not live acceptance)."""
from app.schemas.jd import JDExtractRequest
from app.services.jd_parser import JDParser


class Stub:
    def __init__(self, output):
        self.output = output

    def generate_json(self, *_):
        return self.output


def _req(text):
    return JDExtractRequest(job_id="jd-1", title="Engineer", industry="Technology", raw_description=text)


def test_reject_hallucinated_qualifications_and_default_seniority():
    text = "Job posting: Maintain reporting dashboards."
    model_output = {"seniority": "Senior", "required_skills": [
        {"skill_name": "Kubernetes", "snippet": "Kubernetes", "section": "Requirements", "min_years_exp": 5}
    ], "education_requirement": "PhD in AI", "spoken_languages": ["Japanese"]}
    result = JDParser(Stub(model_output)).parse_job_description(_req(text))
    assert result.required_skills == []
    assert result.seniority == "UNSPECIFIED"
    assert result.education_requirement is None
    assert result.spoken_languages == []


def test_exact_quotes_and_years_not_in_quote_are_not_invented():
    text = "Requirements:\n- 3 years of Java development\nPreferred:\n- Docker\n"
    model_output = {"seniority": None, "required_skills": [
        {"skill_name": "Java", "snippet": "3 years of Java development", "section": "Requirements:", "min_years_exp": 3}
    ], "preferred_skills": [
        {"skill_name": "Docker", "snippet": "Docker", "section": "Preferred:", "min_years_exp": 5}
    ]}
    result = JDParser(Stub(model_output)).parse_job_description(_req(text))
    assert result.required_skills[0].snippet == "3 years of Java development"
    assert result.required_skills[0].min_years_exp == 3
    assert result.preferred_skills[0].min_years_exp == 0


def test_missing_model_quote_can_recover_only_exact_source_skill():
    model_output = {"required_skills": [{"skill_name": "Java"}]}
    result = JDParser(Stub(model_output)).parse_job_description(_req("Java is required."))
    assert result.required_skills[0].snippet == "Java"
    assert result.required_skills[0].snippet in "Java is required."
