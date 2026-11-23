import logging
import json
from typing import List, Dict, Any, Optional, Set

from app.schemas.roadmap import (
    SkillGapItem,
    RoadmapMilestone,
    SkillGapAnalysisRequest,
    SkillGapAnalysisResponse
)
from app.services.taxonomy_normalizer import TaxonomyNormalizer, TAXONOMY_CATALOG

logger = logging.getLogger(__name__)


# Domain knowledge for related skill expansion
RELATED_SKILLS_MAP = {
    "Java": ["Spring Boot", "Kafka", "Hibernate"],
    "Spring Boot": ["Docker", "Kubernetes", "PostgreSQL"],
    "Python": ["FastAPI", "Docker", "PostgreSQL"],
    "React.js": ["TypeScript", "Next.js", "Tailwind CSS"],
    "PostgreSQL": ["Redis", "Elasticsearch", "SQL Optimization"],
    "Docker": ["Kubernetes", "CI/CD", "AWS"],
    "Kubernetes": ["Terraform", "Prometheus", "Helm"],
}


class SkillGapService:
    """
    Phase 8: Skill Gap Breakdown & Tailored Roadmap Recommendations.
    Strictly conforms to:
    - AC-P8-01: 5-Category Gap Classification (MET, MISSING_MANDATORY, MISSING_PREFERRED,
      RELATED_TO_LEARN, EVIDENCE_MISSING).
    - AC-P8-02: Anti-Auto-Injection rule (Candidate profile is read-only).
    - AC-P8-03: Tailored Roadmap Generation (target missing skills with practical projects).
    """

    def __init__(
        self,
        normalizer: Optional[TaxonomyNormalizer] = None,
        llm_client: Optional[Any] = None
    ):
        self.normalizer = normalizer or TaxonomyNormalizer()
        self.llm_client = llm_client

    def analyze_gap_and_generate_roadmap(
        self,
        request: SkillGapAnalysisRequest
    ) -> SkillGapAnalysisResponse:
        """
        Executes 5-category skill gap classification and builds targeted roadmap.
        Never alters or mutates candidate profile input.
        """
        # 1. Normalize skill sets to canonical identifiers
        cand_norm_map = self._normalize_list(request.candidate_skills)
        verified_norm_map = self._normalize_list(request.candidate_verified_skills)
        req_norm_map = self._normalize_list(request.jd_required_skills)
        pref_norm_map = self._normalize_list(request.jd_preferred_skills)

        gap_items: List[SkillGapItem] = []
        seen_canonical: Set[str] = set()

        # 2. Check Required Skills (Mandatory)
        for raw, item in req_norm_map.items():
            cid = item.canonical_id
            cname = item.canonical_name
            seen_canonical.add(cid)

            if cid in cand_norm_map:
                if request.candidate_verified_skills and cid not in verified_norm_map:
                    # Candidate claimed it in CV but no GitHub/cert evidence
                    gap_items.append(SkillGapItem(
                        skill_name=cname,
                        canonical_id=cid,
                        category="EVIDENCE_MISSING",
                        importance="HIGH",
                        reason="Kỹ năng bắt buộc đã khai báo trong CV nhưng chưa có bằng chứng xác thực (GitHub/chứng chỉ)."
                    ))
                else:
                    gap_items.append(SkillGapItem(
                        skill_name=cname,
                        canonical_id=cid,
                        category="MET",
                        importance="HIGH",
                        reason="Kỹ năng bắt buộc hoàn toàn đáp ứng yêu cầu của JD."
                    ))
            else:
                gap_items.append(SkillGapItem(
                    skill_name=cname,
                    canonical_id=cid,
                    category="MISSING_MANDATORY",
                    importance="HIGH",
                    reason="JD yêu cầu bắt buộc nhưng hồ sơ ứng viên chưa thể hiện."
                ))

        # 3. Check Preferred Skills (Nice to have)
        for raw, item in pref_norm_map.items():
            cid = item.canonical_id
            cname = item.canonical_name
            if cid in seen_canonical:
                continue
            seen_canonical.add(cid)

            if cid in cand_norm_map:
                gap_items.append(SkillGapItem(
                    skill_name=cname,
                    canonical_id=cid,
                    category="MET",
                    importance="MEDIUM",
                    reason="Kỹ năng ưu tiên đã được đáp ứng, gia tăng lợi thế cạnh tranh."
                ))
            else:
                gap_items.append(SkillGapItem(
                    skill_name=cname,
                    canonical_id=cid,
                    category="MISSING_PREFERRED",
                    importance="MEDIUM",
                    reason="Kỹ năng ưu tiên giúp mở rộng năng lực nhưng hồ sơ chưa có."
                ))

        # 4. Related to Learn Skills (Domain expansion from taxonomy)
        missing_skills = [
            item.skill_name for item in gap_items
            if item.category in ("MISSING_MANDATORY", "MISSING_PREFERRED")
        ]
        cand_skill_names = [item.canonical_name for item in cand_norm_map.values()]

        related_to_learn: List[str] = []
        for s in missing_skills + cand_skill_names[:3]:
            for rel in RELATED_SKILLS_MAP.get(s, []):
                norm_rel = self.normalizer._normalize_single_skill(rel)
                if norm_rel.canonical_id not in seen_canonical and norm_rel.canonical_id not in cand_norm_map and norm_rel.canonical_name not in related_to_learn:
                    related_to_learn.append(norm_rel.canonical_name)
                    if len(related_to_learn) >= 2:
                        break
            if len(related_to_learn) >= 2:
                break

        for rel_name in list(related_to_learn)[:2]:
            gap_items.append(SkillGapItem(
                skill_name=rel_name,
                category="RELATED_TO_LEARN",
                importance="LOW",
                reason="Kỹ năng mở rộng liên quan trực tiếp trong hệ sinh thái công nghệ của vị trí."
            ))

        # 5. Count 5 categories
        met_c = sum(1 for i in gap_items if i.category == "MET")
        miss_mand_c = sum(1 for i in gap_items if i.category == "MISSING_MANDATORY")
        miss_pref_c = sum(1 for i in gap_items if i.category == "MISSING_PREFERRED")
        rel_c = sum(1 for i in gap_items if i.category == "RELATED_TO_LEARN")
        ev_miss_c = sum(1 for i in gap_items if i.category == "EVIDENCE_MISSING")

        # 6. Generate Tailored Learning Roadmap
        roadmap = self._build_tailored_roadmap(
            target_job_title=request.target_job_title or "Target Position",
            missing_mandatory=[i.skill_name for i in gap_items if i.category == "MISSING_MANDATORY"],
            missing_preferred=[i.skill_name for i in gap_items if i.category == "MISSING_PREFERRED"],
            evidence_missing=[i.skill_name for i in gap_items if i.category == "EVIDENCE_MISSING"],
            locale=request.locale
        )

        return SkillGapAnalysisResponse(
            gap_breakdown=gap_items,
            met_count=met_c,
            missing_mandatory_count=miss_mand_c,
            missing_preferred_count=miss_pref_c,
            related_to_learn_count=rel_c,
            evidence_missing_count=ev_miss_c,
            tailored_roadmap=roadmap
        )

    def _normalize_list(self, raw_skills: List[str]) -> Dict[str, Any]:
        result = {}
        for s in raw_skills:
            if s and s.strip():
                norm = self.normalizer._normalize_single_skill(s.strip())
                result[norm.canonical_id] = norm
        return result

    def _build_tailored_roadmap(
        self,
        target_job_title: str,
        missing_mandatory: List[str],
        missing_preferred: List[str],
        evidence_missing: List[str],
        locale: str,
    ) -> List[RoadmapMilestone]:
        """Build practice steps for recorded gaps across industries."""
        gaps = list(dict.fromkeys(missing_mandatory + missing_preferred + evidence_missing))
        if not gaps:
            return []
        vi = locale == "vi"
        priority = missing_mandatory or missing_preferred or evidence_missing
        stages = [
            (
                "Học các kỹ năng ưu tiên" if vi else "Learn the priority skills",
                priority, 2,
                ["Tìm tài liệu nhập môn theo từng kỹ năng.", "Thực hành một nhiệm vụ nhỏ và tự đánh giá."]
                if vi else ["Find an introductory resource for each skill.", "Practise a small task and assess your result."],
                "Tạo một sản phẩm mẫu cho từng kỹ năng ưu tiên."
                if vi else "Create one work sample for each priority skill.",
            ),
            (
                "Áp dụng vào công việc" if vi else "Apply the skills at work",
                gaps, 3,
                ["Chọn một nhiệm vụ từ JD và xác định đầu ra.", "Ghi lại cách áp dụng từng kỹ năng."]
                if vi else ["Select a task from the JD and define the deliverable.", "Record how you applied each skill."],
                f"Mô phỏng một nhiệm vụ của vị trí {target_job_title}."
                if vi else f"Simulate a task from the {target_job_title} role.",
            ),
            (
                "Hoàn thiện minh chứng" if vi else "Document your evidence",
                gaps, 2,
                ["Xin phản hồi về sản phẩm mẫu.", "Ghi lại vai trò, kết quả và minh chứng có thể chia sẻ."]
                if vi else ["Ask for feedback on the work sample.", "Record your role, outcome and shareable evidence."],
                "Hoàn thiện một hồ sơ minh chứng ngắn từ bài thực hành."
                if vi else "Assemble a short portfolio entry from the practice task.",
            ),
        ]
        return [
            RoadmapMilestone(
                milestone_number=index, title=title, target_skills=skills, estimated_weeks=weeks,
                learning_objectives=objectives, practice_project=project
            )
            for index, (title, skills, weeks, objectives, project) in enumerate(stages, start=1)
        ]
