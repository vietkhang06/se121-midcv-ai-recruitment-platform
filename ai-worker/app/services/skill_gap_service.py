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

        related_to_learn: Set[str] = set()
        for s in missing_skills + cand_skill_names[:3]:
            for rel in RELATED_SKILLS_MAP.get(s, []):
                norm_rel = self.normalizer._normalize_single_skill(rel)
                if norm_rel.canonical_id not in seen_canonical and norm_rel.canonical_id not in cand_norm_map:
                    related_to_learn.add(norm_rel.canonical_name)
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
            evidence_missing=[i.skill_name for i in gap_items if i.category == "EVIDENCE_MISSING"]
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
        evidence_missing: List[str]
    ) -> List[RoadmapMilestone]:
        """Builds a structured 3-milestone actionable learning path targeting gap skills."""
        milestones: List[RoadmapMilestone] = []

        # Milestone 1: Mandatory Foundations
        m1_skills = missing_mandatory[:2] if missing_mandatory else (missing_preferred[:2] if missing_preferred else ["Kiến thức chuyên sâu"])
        m1_title = f"Giai đoạn 1: Nền tảng kỹ năng cốt lõi cho {target_job_title}"
        milestones.append(RoadmapMilestone(
            milestone_number=1,
            title=m1_title,
            target_skills=m1_skills,
            estimated_weeks=3,
            learning_objectives=[
                f"Nắm vững cú pháp và kiến trúc căn bản của {', '.join(m1_skills)}",
                "Hiểu rõ quy chuẩn thiết kế và best practices chuẩn công nghiệp",
                "Hoàn thành các bài tập lập trình cơ bản có kiểm thử unit test"
            ],
            practice_project=f"Xây dựng module dịch vụ mẫu áp dụng {', '.join(m1_skills)} và cấu hình CI tự động."
        ))

        # Milestone 2: Advanced Integration & Evidence Building
        m2_skills = missing_preferred[:2] if missing_preferred else evidence_missing[:2]
        if not m2_skills:
            m2_skills = ["Tối ưu hiệu năng và giám sát"]
        milestones.append(RoadmapMilestone(
            milestone_number=2,
            title=f"Giai đoạn 2: Tích hợp hệ thống và xây dựng bằng chứng năng lực",
            target_skills=m2_skills,
            estimated_weeks=4,
            learning_objectives=[
                f"Tích hợp {', '.join(m2_skills)} vào quy trình nghiệp vụ thực tế",
                "Thiết lập cơ chế xử lý lỗi, logging tập trung và đo lường độ trễ",
                "Đẩy mã nguồn sạch lên GitHub với README tài liệu hóa đầy đủ"
            ],
            practice_project=f"Triển khai dự án tích hợp {', '.join(m2_skills)} có tài liệu kiến trúc và hướng dẫn cài đặt."
        ))

        # Milestone 3: Production Capstone & Full Architecture
        all_gap_skills = (missing_mandatory + missing_preferred)[:3]
        if not all_gap_skills:
            all_gap_skills = ["Microservices Architecture", "Cloud Deployment"]
        milestones.append(RoadmapMilestone(
            milestone_number=3,
            title=f"Giai đoạn 3: Dự án thực chiến Capstone theo tiêu chuẩn tuyển dụng",
            target_skills=all_gap_skills,
            estimated_weeks=5,
            learning_objectives=[
                "Thiết kế kiến trúc phân tán đáp ứng tải thực tế",
                "Đóng gói container Docker và cấu hình kịch bản tự động hóa",
                "Tạo báo cáo kỹ thuật và video demo sản phẩm hoàn thiện"
            ],
            practice_project=f"Xây dựng hệ thống hoàn chỉnh phục vụ vị trí {target_job_title}, đóng gói Docker và publish repository công khai."
        ))

        return milestones
