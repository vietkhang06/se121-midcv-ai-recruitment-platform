import logging
import re
import difflib
from typing import List, Dict, Optional, Tuple, Any
from app.schemas.taxonomy import (
    SkillNormalizeRequest,
    NormalizedSkillItem,
    SkillNormalizeResponse,
    AutocompleteItem,
    AutocompleteResponse
)
from app.services.llm.types import LLMClientProtocol, LLMResponse
from app.config import settings

logger = logging.getLogger(__name__)

# Standard Taxonomy Seed Catalog
TAXONOMY_CATALOG = [
    {
        "canonical_id": "SKILL_PROG_JAVA",
        "canonical_name": "Java",
        "category": "BACKEND",
        "aliases": ["java", "core java", "java 17", "java 21", "java 8", "lập trình java", "ngôn ngữ java"]
    },
    {
        "canonical_id": "SKILL_JAVA_SPRING_BOOT",
        "canonical_name": "Spring Boot",
        "category": "BACKEND",
        "aliases": ["spring boot", "springboot", "spring framework", "spring", "spring cloud", "spring mvc"]
    },
    {
        "canonical_id": "SKILL_PROG_PYTHON",
        "canonical_name": "Python",
        "category": "BACKEND",
        "aliases": ["python", "python3", "python 3", "lập trình python", "py"]
    },
    {
        "canonical_id": "SKILL_PROG_JAVASCRIPT",
        "canonical_name": "JavaScript",
        "category": "FRONTEND",
        "aliases": ["javascript", "js", "ecmascript", "es6", "vanilla js", "lập trình javascript"]
    },
    {
        "canonical_id": "SKILL_PROG_TYPESCRIPT",
        "canonical_name": "TypeScript",
        "category": "FRONTEND",
        "aliases": ["typescript", "ts", "lập trình typescript"]
    },
    {
        "canonical_id": "SKILL_FRONTEND_REACT",
        "canonical_name": "React.js",
        "category": "FRONTEND",
        "aliases": ["react", "reactjs", "react.js", "react js", "react native", "lập trình react"]
    },
    {
        "canonical_id": "SKILL_FRONTEND_VUE",
        "canonical_name": "Vue.js",
        "category": "FRONTEND",
        "aliases": ["vue", "vuejs", "vue.js", "vue 3", "vuex"]
    },
    {
        "canonical_id": "SKILL_FRONTEND_NEXTJS",
        "canonical_name": "Next.js",
        "category": "FRONTEND",
        "aliases": ["nextjs", "next.js", "next js", "next"]
    },
    {
        "canonical_id": "SKILL_DATABASE_POSTGRESQL",
        "canonical_name": "PostgreSQL",
        "category": "DATABASE",
        "aliases": ["postgresql", "postgres", "psql", "pgvector", "cơ sở dữ liệu postgresql"]
    },
    {
        "canonical_id": "SKILL_DATABASE_MYSQL",
        "canonical_name": "MySQL",
        "category": "DATABASE",
        "aliases": ["mysql", "mariadb", "cơ sở dữ liệu mysql"]
    },
    {
        "canonical_id": "SKILL_DATABASE_MONGODB",
        "canonical_name": "MongoDB",
        "category": "DATABASE",
        "aliases": ["mongodb", "mongo", "nosql", "cơ sở dữ liệu mongodb"]
    },
    {
        "canonical_id": "SKILL_DATABASE_REDIS",
        "canonical_name": "Redis",
        "category": "DATABASE",
        "aliases": ["redis", "in-memory cache", "redis cache"]
    },
    {
        "canonical_id": "SKILL_MSG_KAFKA",
        "canonical_name": "Apache Kafka",
        "category": "BACKEND",
        "aliases": ["kafka", "apache kafka", "kafka stream", "kafka broker"]
    },
    {
        "canonical_id": "SKILL_DEVOPS_DOCKER",
        "canonical_name": "Docker",
        "category": "DEVOPS",
        "aliases": ["docker", "containerization", "docker compose", "dockerfile", "đóng gói container"]
    },
    {
        "canonical_id": "SKILL_DEVOPS_KUBERNETES",
        "canonical_name": "Kubernetes",
        "category": "DEVOPS",
        "aliases": ["kubernetes", "k8s", "k8s cluster", "helm", "helm chart", "điều phối container"]
    },
    {
        "canonical_id": "SKILL_DEVOPS_CI_CD",
        "canonical_name": "CI/CD",
        "category": "DEVOPS",
        "aliases": ["ci/cd", "cicd", "continuous integration", "github actions", "gitlab ci", "jenkins"]
    },
    {
        "canonical_id": "SKILL_DEVOPS_TERRAFORM",
        "canonical_name": "Terraform",
        "category": "DEVOPS",
        "aliases": ["terraform", "iac", "infrastructure as code"]
    },
    {
        "canonical_id": "SKILL_CLOUD_AWS",
        "canonical_name": "Amazon Web Services",
        "category": "CLOUD",
        "aliases": ["aws", "amazon web services", "aws cloud", "ec2", "s3", "lambda", "ecs", "eks"]
    },
    {
        "canonical_id": "SKILL_CLOUD_GCP",
        "canonical_name": "Google Cloud Platform",
        "category": "CLOUD",
        "aliases": ["gcp", "google cloud", "google cloud platform", "bigquery", "gke"]
    },
    {
        "canonical_id": "SKILL_PROG_GOLANG",
        "canonical_name": "Go",
        "category": "BACKEND",
        "aliases": ["golang", "go language", "go", "lập trình go"]
    },
    {
        "canonical_id": "SKILL_AI_MACHINE_LEARNING",
        "canonical_name": "Machine Learning",
        "category": "DATA_AI",
        "aliases": ["machine learning", "ml", "học máy", "scikit-learn", "thuật toán machine learning"]
    },
    {
        "canonical_id": "SKILL_AI_DEEP_LEARNING",
        "canonical_name": "Deep Learning",
        "category": "DATA_AI",
        "aliases": ["deep learning", "dl", "học sâu", "pytorch", "tensorflow", "neural networks"]
    },
    {
        "canonical_id": "SKILL_API_REST",
        "canonical_name": "RESTful API",
        "category": "BACKEND",
        "aliases": ["rest api", "restful api", "restful", "rest", "web apis", "restful apis"]
    },
    {
        "canonical_id": "SKILL_ARCH_MICROSERVICES",
        "canonical_name": "Microservices",
        "category": "BACKEND",
        "aliases": ["microservices", "microservice", "kiến trúc microservices", "microservices architecture"]
    },
    {
        "canonical_id": "SKILL_PROG_C_SHARP",
        "canonical_name": "C#",
        "category": "BACKEND",
        "aliases": ["c#", ".net", "dotnet", "asp.net", "asp.net core", "csharp"]
    },
    {
        "canonical_id": "SKILL_PROG_RUST",
        "canonical_name": "Rust",
        "category": "BACKEND",
        "aliases": ["rust", "rustlang", "lập trình rust"]
    }
]

class TaxonomyNormalizer:
    """
    Multi-layer Taxonomy Normalization Engine.
    Layer 1: Exact Match (Confidence: 1.0)
    Layer 2: Alias Match (Confidence: 0.95 - 0.98)
    Layer 3: Fuzzy Match with Levenshtein Ratio >= 0.85 (Confidence: similarity ratio)
    Layer 4: Semantic Top-K & Bounded LLM Disambiguation
    """

    def __init__(self, llm_client: Optional[Any] = None):
        self.catalog = TAXONOMY_CATALOG
        self.exact_canonical_map: Dict[str, dict] = {}
        self.alias_map: Dict[str, dict] = {}
        self.skills_by_id: Dict[str, dict] = {}
        self.llm_client = llm_client

        self._build_indexes()

    def _build_indexes(self):
        for entry in self.catalog:
            cid = entry["canonical_id"]
            cname = entry["canonical_name"]
            self.skills_by_id[cid] = entry
            self.exact_canonical_map[cname.lower().strip()] = entry

            for alias in entry.get("aliases", []):
                norm_alias = alias.lower().strip()
                if norm_alias not in self.alias_map:
                    self.alias_map[norm_alias] = entry

    def normalize_skills(self, request: SkillNormalizeRequest) -> SkillNormalizeResponse:
        results: List[NormalizedSkillItem] = []

        for raw_skill in request.skills:
            if not raw_skill or not raw_skill.strip():
                continue

            cleaned_skill = raw_skill.strip()
            item = self._normalize_single_skill(cleaned_skill, request.context)
            results.append(item)

        return SkillNormalizeResponse(normalized_skills=results)

    def _normalize_single_skill(self, raw_skill: str, context: Optional[str] = None) -> NormalizedSkillItem:
        skill_lower = raw_skill.lower().strip()

        # Layer 1: Exact Canonical Match
        if skill_lower in self.exact_canonical_map:
            entry = self.exact_canonical_map[skill_lower]
            return NormalizedSkillItem(
                raw_name=raw_skill,
                canonical_id=entry["canonical_id"],
                canonical_name=entry["canonical_name"],
                match_type="EXACT",
                confidence=1.0,
                category=entry["category"]
            )

        # Layer 2: Alias Lookup
        if skill_lower in self.alias_map:
            entry = self.alias_map[skill_lower]
            # Higher confidence for short standard tech acronyms
            confidence = 0.98 if len(skill_lower) <= 5 else 0.95
            return NormalizedSkillItem(
                raw_name=raw_skill,
                canonical_id=entry["canonical_id"],
                canonical_name=entry["canonical_name"],
                match_type="ALIAS",
                confidence=confidence,
                category=entry["category"]
            )

        # Layer 3: Fuzzy Match (Levenshtein similarity >= 0.85)
        fuzzy_match = self._fuzzy_match(skill_lower)
        if fuzzy_match:
            entry, score = fuzzy_match
            return NormalizedSkillItem(
                raw_name=raw_skill,
                canonical_id=entry["canonical_id"],
                canonical_name=entry["canonical_name"],
                match_type="FUZZY",
                confidence=round(score, 2),
                category=entry["category"]
            )

        # Layer 4: Bounded Semantic & LLM Disambiguation
        top_candidates = self._find_top_k_candidates(skill_lower, k=5)
        if top_candidates and self.llm_client and self.llm_client.is_configured:
            disambiguated = self._disambiguate_with_llm(raw_skill, top_candidates, context)
            if disambiguated:
                return disambiguated

        # If best candidate has decent partial similarity (>= 0.70), return SEMANTIC match
        if top_candidates and top_candidates[0][1] >= 0.70:
            best_entry, best_score = top_candidates[0]
            return NormalizedSkillItem(
                raw_name=raw_skill,
                canonical_id=best_entry["canonical_id"],
                canonical_name=best_entry["canonical_name"],
                match_type="SEMANTIC",
                confidence=round(best_score, 2),
                category=best_entry["category"]
            )

        # Fallback: Unmapped / Custom Skill
        canonical_fallback_id = f"SKILL_CUSTOM_{re.sub(r'[^A-Z0-9]', '_', raw_skill.upper())[:30]}"
        return NormalizedSkillItem(
            raw_name=raw_skill,
            canonical_id=canonical_fallback_id,
            canonical_name=raw_skill,
            match_type="UNKNOWN",
            confidence=0.5,
            category="OTHER"
        )

    def _fuzzy_match(self, query: str) -> Optional[Tuple[dict, float]]:
        best_entry = None
        best_score = 0.0

        for candidate_name, entry in self.exact_canonical_map.items():
            ratio = difflib.SequenceMatcher(None, query, candidate_name).ratio()
            if ratio >= 0.85 and ratio > best_score:
                best_score = ratio
                best_entry = entry

        for alias, entry in self.alias_map.items():
            ratio = difflib.SequenceMatcher(None, query, alias).ratio()
            if ratio >= 0.85 and ratio > best_score:
                best_score = ratio
                best_entry = entry

        if best_entry and best_score >= 0.85:
            return best_entry, best_score
        return None

    def _find_top_k_candidates(self, query: str, k: int = 5) -> List[Tuple[dict, float]]:
        scored: List[Tuple[dict, float]] = []

        for cid, entry in self.skills_by_id.items():
            # Check ratio against canonical name
            cname_ratio = difflib.SequenceMatcher(None, query, entry["canonical_name"].lower()).ratio()
            # Check max ratio against aliases
            max_alias_ratio = max(
                (difflib.SequenceMatcher(None, query, a.lower()).ratio() for a in entry.get("aliases", [])),
                default=0.0
            )
            score = max(cname_ratio, max_alias_ratio)
            scored.append((entry, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:k]

    def _disambiguate_with_llm(
        self,
        raw_skill: str,
        candidates: List[Tuple[dict, float]],
        context: Optional[str]
    ) -> Optional[NormalizedSkillItem]:
        """
        AC-P4-02: Bounded LLM Disambiguation.
        Sends Top-K candidates (max 5) to LLM.
        Strict rule: LLM must only select from provided candidate IDs, never invent new IDs.
        """
        valid_ids = [c[0]["canonical_id"] for c in candidates]
        candidate_descriptions = "\n".join(
            f"- ID: {c[0]['canonical_id']} | Name: {c[0]['canonical_name']} | Category: {c[0]['category']}"
            for c in candidates
        )

        context_str = f' with context: "{context}"' if context else ''
        prompt = (
            f"You are a strict recruitment taxonomy classification engine.\n"
            f"Given the ambiguous extracted skill '{raw_skill}'{context_str},\n"
            f"Select the single best matching Canonical ID from this candidate list:\n"
            f"{candidate_descriptions}\n\n"
            f"CRITICAL RULES:\n"
            f"1. You MUST ONLY respond with exactly ONE Canonical ID from the list above, or 'NONE'.\n"
            f"2. You are STRICTLY FORBIDDEN from inventing, fabricating, or returning any ID not in the list.\n"
            f"3. Return ONLY the ID string without any explanation or punctuation."
        )

        try:
            if hasattr(self.llm_client, "chat_completion"):
                resp = self.llm_client.chat_completion(
                    system_prompt="You are a strict entity disambiguation classifier. Return only the matched ID from the allowed list, or NONE.",
                    user_prompt=prompt,
                    temperature=0.0
                )
            elif hasattr(self.llm_client, "chat_sync"):
                resp = self.llm_client.chat_sync(
                    messages=[
                        {"role": "system", "content": "You are a strict entity disambiguation classifier. Return only the matched ID from the allowed list, or NONE."},
                        {"role": "user", "content": prompt}
                    ]
                )
            else:
                resp = None

            if not resp or not resp.content:
                return None

            chosen_id = resp.content.strip().split()[0].replace('"', '').replace("'", "")
            if chosen_id in valid_ids:
                entry = self.skills_by_id[chosen_id]
                return NormalizedSkillItem(
                    raw_name=raw_skill,
                    canonical_id=entry["canonical_id"],
                    canonical_name=entry["canonical_name"],
                    match_type="LLM_DISAMBIGUATION",
                    confidence=0.88,
                    category=entry["category"]
                )
        except Exception as e:
            logger.warning(f"LLM Disambiguation failed for skill '{raw_skill}': {e}")

        return None

    def autocomplete(self, query: str, limit: int = 10) -> AutocompleteResponse:
        """
        AC-P4-03: Fast prefix and substring autocomplete suggestions.
        Target latency: <= 200ms.
        """
        if not query or not query.strip():
            # Return top default skills
            defaults = [
                AutocompleteItem(canonical_id=e["canonical_id"], canonical_name=e["canonical_name"], category=e["category"])
                for e in self.catalog[:limit]
            ]
            return AutocompleteResponse(query=query, suggestions=defaults)

        q = query.lower().strip()
        matched: List[AutocompleteItem] = []
        seen_ids = set()

        # 1. Prefix match on canonical name
        for entry in self.catalog:
            cname = entry["canonical_name"].lower()
            if cname.startswith(q) and entry["canonical_id"] not in seen_ids:
                seen_ids.add(entry["canonical_id"])
                matched.append(AutocompleteItem(
                    canonical_id=entry["canonical_id"],
                    canonical_name=entry["canonical_name"],
                    category=entry["category"],
                    match_type="PREFIX"
                ))
            if len(matched) >= limit:
                break

        # 2. Prefix match on aliases
        if len(matched) < limit:
            for entry in self.catalog:
                if entry["canonical_id"] in seen_ids:
                    continue
                for alias in entry.get("aliases", []):
                    if alias.lower().startswith(q):
                        seen_ids.add(entry["canonical_id"])
                        matched.append(AutocompleteItem(
                            canonical_id=entry["canonical_id"],
                            canonical_name=entry["canonical_name"],
                            category=entry["category"],
                            match_type="ALIAS_PREFIX"
                        ))
                        break
                if len(matched) >= limit:
                    break

        # 3. Substring match
        if len(matched) < limit:
            for entry in self.catalog:
                if entry["canonical_id"] in seen_ids:
                    continue
                if q in entry["canonical_name"].lower():
                    seen_ids.add(entry["canonical_id"])
                    matched.append(AutocompleteItem(
                        canonical_id=entry["canonical_id"],
                        canonical_name=entry["canonical_name"],
                        category=entry["category"],
                        match_type="SUBSTRING"
                    ))
                if len(matched) >= limit:
                    break

        return AutocompleteResponse(query=query, suggestions=matched[:limit])
