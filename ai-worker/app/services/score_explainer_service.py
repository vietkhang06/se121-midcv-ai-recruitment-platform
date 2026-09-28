import logging
import json
from typing import Optional, Dict, Any, List

from app.config import settings
from app.schemas.matching import ExplainScoreRequest, ExplainScoreResponse
from app.services.llm.types import LLMClientProtocol, LLMResponse
from app.services.llm.openai_compatible_client import OpenAICompatibleClient

logger = logging.getLogger(__name__)


# Reason code dictionary for Vietnamese explanations
REASON_CODE_DESCRIPTIONS = {
    "REQ_SKILLS_STRONG_ALIGNMENT": "Kỹ năng chuyên môn cốt lõi đáp ứng mạnh mẽ các yêu cầu bắt buộc của dự án.",
    "REQ_SKILLS_PARTIAL": "Một số kỹ năng cốt lõi đã được đáp ứng, nhưng vẫn còn khoảng cách so với yêu cầu bắt buộc.",
    "MISSING_MANDATORY_SKILL": "Hồ sơ chưa thể hiện đầy đủ các kỹ năng bắt buộc được yêu cầu trong JD.",
    "EXPERIENCE_SENIORITY_MATCHED": "Số năm kinh nghiệm và mức độ thâm niên hoàn toàn tương xứng với vị trí tuyển dụng.",
    "EXPERIENCE_SENIORITY_BELOW": "Số năm kinh nghiệm thực tế hiện tại thấp hơn yêu cầu kỳ vọng của vị trí.",
    "PROJECT_RELEVANCE_HIGH": "Các dự án đã tham gia có tính tương đồng cao về quy mô và công nghệ so với định hướng dự án.",
    "PROJECT_RELEVANCE_MODERATE": "Dự án đã thực hiện có liên quan một phần đến phạm vi công việc yêu cầu.",
    "EDUCATION_LEVEL_MATCHED": "Trình độ học vấn và chuyên ngành đào tạo phù hợp hoàn toàn với tiêu chuẩn vị trí.",
    "MISSING_PREFERRED_SKILL_KAFKA": "Hồ sơ chưa thể hiện kỹ năng Kafka - một trong các kỹ năng ưu tiên của dự án.",
    "PREFERRED_SKILLS_BONUS": "Ứng viên sở hữu các kỹ năng ưu tiên giúp gia tăng tính cạnh tranh.",
    "GITHUB_VERIFIED_STRONG": "Năng lực kỹ thuật được bảo chứng bởi các commit và mã nguồn thực tế trên GitHub.",
}


class ScoreExplainerService:
    """
    Phase 6: Deterministic Scoring Algorithm & LLM Explainer.
    Strictly conforms to:
    - AC-P6-01: Mathematical Determinism (LLM does not score).
    - AC-P6-02: Zero LLM Scoring - explanations are grounded purely on math breakdown.
    - AC-P6-05: LLM Explanation Grounding - faithful to reason codes and score breakdown.
    - Deterministic fallback when LLM is unavailable.
    """

    def __init__(self, llm_client: Optional[Any] = None):
        self.llm_client = llm_client

    def explain(self, request: ExplainScoreRequest) -> ExplainScoreResponse:
        """Generates grounded explanation markdown for match score."""
        # 1. Try LLM generation if client is available
        if self.llm_client:
            try:
                llm_explanation = self._generate_llm_explanation(request)
                if llm_explanation and len(llm_explanation.strip()) > 30:
                    return ExplainScoreResponse(explanation_markdown=llm_explanation.strip())
            except Exception as e:
                logger.warning(f"LLM explanation generation failed: {e}. Falling back to deterministic template.")

        # 2. Deterministic Template Fallback (100% grounded and reliable)
        fallback_md = self._generate_deterministic_template(request)
        return ExplainScoreResponse(explanation_markdown=fallback_md)

    def _generate_llm_explanation(self, request: ExplainScoreRequest) -> Optional[str]:
        system_prompt = (
            "You are an objective AI recruitment decision explainability engine.\n"
            "You are provided with a candidate's mathematical match score, detailed score breakdown, "
            "and machine-generated reason codes.\n\n"
            "CRITICAL RULES:\n"
            "1. You MUST NOT calculate, recalculate, adjust, or fabricate any numbers.\n"
            "2. Ground every sentence strictly in the provided score numbers and reason codes.\n"
            "3. Format your response in clean, professional Vietnamese Markdown.\n"
            "4. Structure:\n"
            "   - Executive summary sentence citing the overall score / 100 for the target position.\n"
            "   - Bullet points for 'Điểm mạnh' (Strengths) citing high component scores.\n"
            "   - Bullet points for 'Điểm cần cải thiện' (Areas to improve) citing missing skills or lower component scores."
        )

        user_prompt = (
            f"Target Position: {request.target_job_title}\n"
            f"Overall Match Score: {request.overall_score}/100\n"
            f"Score Breakdown: {json.dumps(request.score_breakdown, ensure_ascii=False, indent=2)}\n"
            f"Reason Codes: {json.dumps(request.reason_codes, ensure_ascii=False)}\n\n"
            f"Generate an explainable, grounded evaluation summary in Vietnamese."
        )

        if hasattr(self.llm_client, "chat_completion"):
            resp = self.llm_client.chat_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2
            )
            return resp.content if resp else None
        elif hasattr(self.llm_client, "chat_sync"):
            resp = self.llm_client.chat_sync(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            return resp.content if resp else None

        return None

    def _generate_deterministic_template(self, request: ExplainScoreRequest) -> str:
        """
        Produces consistent, grounded explanation when LLM is unavailable.
        Uses exact reason codes and breakdown scores.
        """
        job_title = request.target_job_title or "vị trí tuyển dụng"
        overall = request.overall_score
        breakdown = request.score_breakdown or {}
        reasons = request.reason_codes or []

        strengths = []
        improvements = []

        # Categorize by scores and reason codes
        req_score = breakdown.get("required_skills_score", 0.0)
        exp_score = breakdown.get("experience_score", 0.0)
        proj_score = breakdown.get("project_score", 0.0)
        pref_score = breakdown.get("preferred_skills_score", 0.0)
        edu_score = breakdown.get("education_score", 0.0)

        if req_score >= 80.0:
            strengths.append(f"Kỹ năng chuyên môn cốt lõi đáp ứng rất tốt yêu cầu bắt buộc ({req_score:.1f}/100).")
        elif req_score < 70.0:
            improvements.append(f"Kỹ năng bắt buộc cần được bổ sung thêm ({req_score:.1f}/100).")

        if exp_score >= 80.0:
            strengths.append(f"Kinh nghiệm làm việc thực tế được đánh giá cao ({exp_score:.1f}/100).")
        elif exp_score < 60.0:
            improvements.append(f"Thâm niên hoặc kinh nghiệm thực chiến cần tích lũy thêm ({exp_score:.1f}/100).")

        if proj_score >= 75.0:
            strengths.append(f"Dự án thực tế có độ tương quan tốt với phạm vi công việc ({proj_score:.1f}/100).")

        if edu_score >= 90.0:
            strengths.append("Trình độ học vấn và chuyên môn đáp ứng đầy đủ tiêu chuẩn đề ra.")

        # Process reason codes
        for code in reasons:
            desc = REASON_CODE_DESCRIPTIONS.get(code)
            if desc:
                if "STRONG" in code or "MATCHED" in code or "BONUS" in code or "HIGH" in code:
                    if desc not in strengths:
                        strengths.append(desc)
                elif "MISSING" in code or "BELOW" in code or "PARTIAL" in code:
                    if desc not in improvements:
                        improvements.append(desc)

        # Fallbacks if lists are empty
        if not strengths:
            strengths.append("Hồ sơ ứng viên có các điểm cơ bản phù hợp với mô tả công việc.")
        if not improvements:
            improvements.append("Cần tiếp tục cập nhật thêm các chứng chỉ chuyên ngành và dự án mới.")

        strengths_str = "\n".join(f"- {s}" for s in strengths[:3])
        improvements_str = "\n".join(f"- {i}" for i in improvements[:3])

        return (
            f"Ứng viên đạt **{overall:.1f}/100** điểm phù hợp cho vị trí **{job_title}**.\n\n"
            f"### Điểm mạnh\n"
            f"{strengths_str}\n\n"
            f"### Điểm cần cải thiện\n"
            f"{improvements_str}"
        )
