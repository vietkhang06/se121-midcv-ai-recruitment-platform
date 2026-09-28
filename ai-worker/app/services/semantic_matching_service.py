import math
import re
import time
import logging
from typing import List, Dict, Any, Optional
import httpx

from app.config import settings
from app.schemas.matching import SemanticCompareRequest, SemanticCompareResponse

logger = logging.getLogger(__name__)


# Stop words for local semantic concept extraction
STOP_WORDS = {
    "the", "and", "a", "an", "in", "on", "at", "for", "with", "to", "of", "by",
    "from", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "using", "used", "via", "as", "or", "our", "we",
    "experience", "years", "year", "strong", "work", "working", "responsibilities",
    "requirements", "requirement", "candidate", "role", "position", "seeking", "looking"
}

# Concept clusters mapping diverse wording to shared semantic representations
CONCEPT_PATTERNS = [
    (r"develop.*|build.*|built|creat.*|architect.*|design.*|implement.*", "sem_construct"),
    (r"backend|back-end|server.*|service.*|api.*|microservice.*|rest.*", "sem_backend"),
    (r"frontend|front-end|client.*|web|ui|ux|interface|react.*|vue|angular", "sem_frontend"),
    (r"java.*|spring.*|springboot|jvm|hibernate", "sem_java"),
    (r"python.*|django|fastapi|flask|numpy|pandas", "sem_python"),
    (r"postgres.*|pgvector|sql|mysql|oracle|database|db|nosql|mongodb", "sem_database"),
    (r"docker|k8s|kubernetes|aws|cloud|container.*|devops|ci\/cd|pipeline", "sem_cloud_infra"),
    (r"test.*|qa|unit.*|integration.*|e2e|cypress|jest|pytest", "sem_testing"),
    (r"security|auth.*|oauth.*|jwt|encryption|vulnerability", "sem_security"),
    (r"lead.*|manage.*|mentor.*|agile|scrum|team", "sem_leadership"),
    (r"marketing|seo|ga4|ads|campaign|content", "sem_marketing"),
    (r"sales|telesales|selling|buyer.*|property|real\s+estate", "sem_sales"),
    (r"finance|account.*|tax|audit|reporting|ledger", "sem_finance"),
]


class SemanticMatchingService:
    """
    Phase 5: Target JD Semantic Matching & Multi-Vector Pipeline.
    Strictly conforms to:
    - AC-P5-01: Explicit target JD matching.
    - AC-P5-02: Decomposition of requirements, experience, and projects.
    - AC-P5-03: Uniform dimension embedding vectors and cosine similarity in [0.0, 1.0].
    - Robust resilience: Primary OpenAI-compatible -> Fallback Ollama -> Deterministic semantic vector fallback.
    """

    _class_primary_available: Optional[bool] = None
    _class_ollama_available: Optional[bool] = None

    def __init__(
        self,
        primary_base_url: Optional[str] = None,
        primary_api_key: Optional[str] = None,
        primary_embedding_model: str = "text-embedding-3-small",
        ollama_base_url: Optional[str] = None,
        ollama_model: Optional[str] = None,
        timeout: float = 30.0
    ):
        self.primary_base_url = (primary_base_url or settings.LLM_PRIMARY_BASE_URL).rstrip("/")
        self.primary_api_key = primary_api_key or settings.LLM_PRIMARY_API_KEY
        self.primary_embedding_model = primary_embedding_model
        self.ollama_base_url = (ollama_base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.ollama_model = ollama_model or settings.OLLAMA_EMBEDDING_MODEL
        self.timeout = httpx.Timeout(1.0, connect=0.2)

    def compare_semantic(self, request: SemanticCompareRequest) -> SemanticCompareResponse:
        """
        Executes multi-vector semantic comparison between candidate chunks and JD chunks.
        Computes:
        - overall_similarity
        - experience_similarity (if experience & requirements/responsibilities exist)
        - project_similarity (if projects & responsibilities/requirements exist)
        """
        cand_chunks = request.candidate_text_chunks or {}
        jd_chunks = request.jd_text_chunks or {}

        scores: Dict[str, float] = {}

        # 1. Overall comparison: combine all chunks for each entity
        cand_full = " ".join(filter(None, cand_chunks.values())).strip()
        jd_full = " ".join(filter(None, jd_chunks.values())).strip()

        scores["overall_similarity"] = self.compute_similarity(cand_full, jd_full)

        # 2. Experience similarity: candidate experience vs JD requirements/overview
        cand_exp = cand_chunks.get("experience", "")
        jd_req = jd_chunks.get("requirements", jd_chunks.get("responsibilities", jd_chunks.get("overview", "")))
        if cand_exp and jd_req:
            scores["experience_similarity"] = self.compute_similarity(cand_exp, jd_req)
        else:
            scores["experience_similarity"] = scores["overall_similarity"]

        # 3. Project similarity: candidate projects vs JD responsibilities/requirements
        cand_proj = cand_chunks.get("projects", "")
        jd_resp = jd_chunks.get("responsibilities", jd_chunks.get("requirements", ""))
        if cand_proj and jd_resp:
            scores["project_similarity"] = self.compute_similarity(cand_proj, jd_resp)
        else:
            scores["project_similarity"] = scores["overall_similarity"]

        return SemanticCompareResponse(similarity_scores=scores)

    def compute_similarity(self, text_a: str, text_b: str) -> float:
        """
        Computes cosine similarity between two texts in range [0.0, 1.0].
        Tries:
        1. Primary OpenAI-compatible embedding endpoint
        2. Ollama embedding endpoint
        3. Deterministic semantic concept vector fallback
        """
        if not text_a or not text_b or not text_a.strip() or not text_b.strip():
            return 0.0

        # Try live vector embeddings first
        vec_a = self._get_embedding_safe(text_a)
        vec_b = self._get_embedding_safe(text_b)

        if vec_a and vec_b and len(vec_a) == len(vec_b):
            sim = self._cosine_similarity(vec_a, vec_b)
            # Clip strictly to [0.0, 1.0] and round to 2 decimal places
            return round(max(0.0, min(1.0, sim)), 2)

        # Fallback to local concept vector cosine calculation
        return self._compute_concept_cosine(text_a, text_b)

    def _get_embedding_safe(self, text: str) -> Optional[List[float]]:
        """Attempts to obtain dense embedding vector via Primary or Fallback Ollama."""
        # Try Primary OpenAI-compatible if configured and not previously marked unavailable
        if settings.LLM_PRIMARY_ENABLED and self.primary_api_key and SemanticMatchingService._class_primary_available is not False:
            try:
                emb = self._embed_openai_compatible(text)
                SemanticMatchingService._class_primary_available = True
                return emb
            except Exception as e:
                SemanticMatchingService._class_primary_available = False
                logger.debug(f"Primary embedding failed, trying Ollama: {e}")

        # Try Ollama fallback if not previously marked unavailable
        if settings.LLM_FALLBACK_ENABLED and SemanticMatchingService._class_ollama_available is not False:
            try:
                emb = self._embed_ollama(text)
                SemanticMatchingService._class_ollama_available = True
                return emb
            except Exception as e:
                SemanticMatchingService._class_ollama_available = False
                logger.debug(f"Ollama embedding failed, falling back to concept vector: {e}")

        return None

    def _embed_openai_compatible(self, text: str) -> List[float]:
        url = f"{self.primary_base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.primary_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.primary_embedding_model,
            "input": text
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["embedding"]

    def _embed_ollama(self, text: str) -> List[float]:
        url = f"{self.ollama_base_url}/api/embed"
        payload = {
            "model": self.ollama_model,
            "input": text
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            embeddings = data.get("embeddings", [])
            if embeddings:
                return embeddings[0]
            raise ValueError("Ollama returned empty embeddings array.")

    @staticmethod
    def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    def _compute_concept_cosine(self, text_a: str, text_b: str) -> float:
        """
        Deterministic semantic concept vector cosine similarity.
        Guarantees repeatability, non-empty score, and clipping within [0.0, 1.0].
        """
        vec_a = self._extract_concept_vector(text_a)
        vec_b = self._extract_concept_vector(text_b)

        if not vec_a or not vec_b:
            return 0.0

        dot_product = 0.0
        norm_a = 0.0
        norm_b = 0.0

        for concept, weight_a in vec_a.items():
            norm_a += weight_a * weight_a
            if concept in vec_b:
                dot_product += weight_a * vec_b[concept]

        for weight_b in vec_b.values():
            norm_b += weight_b * weight_b

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        cosine = dot_product / (math.sqrt(norm_a) * math.sqrt(norm_b))
        # Clip strictly to [0.0, 1.0] and round to 2 decimal places
        clamped = max(0.0, min(1.0, cosine))
        return round(clamped, 2)

    def _extract_concept_vector(self, text: str) -> Dict[str, float]:
        clean = re.sub(r"[^a-zA-Z0-9\s\+\#\-\.]", " ", text.lower())
        tokens = clean.split()

        vector: Dict[str, float] = {}
        for token in tokens:
            if not token or token in STOP_WORDS or len(token) < 2:
                continue

            concept = self._map_to_concept(token)
            vector[concept] = vector.get(concept, 0.0) + 1.0

        return vector

    @staticmethod
    def _map_to_concept(token: str) -> str:
        for pattern, cluster_id in CONCEPT_PATTERNS:
            if re.match(pattern, token):
                return cluster_id
        return token
