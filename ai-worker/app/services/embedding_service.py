import math
import time
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingError(Exception):
    """Exception raised when embedding generation fails."""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(f"Embedding generation error ({status_code}): {message}")


class OllamaEmbeddingService:
    """
    MatchJD Local Embedding Service utilizing Ollama nomic-embed-text:latest.
    Generates authentic 768-dimensional normalized dense vectors.
    """
    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: float = 60.0
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.OLLAMA_EMBEDDING_MODEL
        self.timeout = timeout

    def embed_text(self, text: str) -> List[float]:
        """
        Generates embedding vector for a single input text string.
        Returns a 768-dimensional float list.
        """
        if not text or not text.strip():
            raise EmbeddingError("Input text for embedding cannot be empty.", status_code=400)

        embeddings = self.embed_batch([text])
        if not embeddings:
            raise EmbeddingError("Ollama returned empty embedding response.", status_code=502)
        return embeddings[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates embedding vectors for a list of input texts.
        Uses Ollama's /api/embed endpoint.
        """
        if not texts:
            return []

        url = f"{self.base_url}/api/embed"
        payload = {
            "model": self.model_name,
            "input": texts
        }

        t0 = time.time()
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, json=payload)
        except Exception as e:
            logger.error(f"[Ollama Embedding] Connection to {url} failed: {e}")
            raise EmbeddingError(f"Failed to connect to Ollama embedding endpoint: {e}", status_code=503)

        if resp.is_error:
            logger.error(f"[Ollama Embedding] HTTP {resp.status_code}: {resp.text}")
            raise EmbeddingError(
                f"Ollama embedding request failed: {resp.text}",
                status_code=resp.status_code,
                details={"model": self.model_name}
            )

        data = resp.json()
        embeddings = data.get("embeddings", [])
        if not embeddings:
            raise EmbeddingError(f"No embeddings returned from model {self.model_name}", status_code=502)

        dimension = len(embeddings[0]) if embeddings else 0
        elapsed = time.time() - t0
        logger.info(
            f"[Ollama Embedding] Generated {len(embeddings)} vectors "
            f"(dim={dimension}) using {self.model_name} in {elapsed:.2f}s"
        )
        return embeddings

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """
        Calculates cosine similarity between two float vectors.
        Returns similarity score in range [-1.0, 1.0].
        """
        if not vec_a or not vec_b:
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return dot_product / (norm_a * norm_b)


# Global singleton instance
embedding_service = OllamaEmbeddingService()
