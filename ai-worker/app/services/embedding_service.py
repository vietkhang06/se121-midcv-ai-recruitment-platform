"""Dense vectors from the configured OpenAI-compatible embedding endpoint."""

import math

import httpx

from app.config import settings


class EmbeddingError(Exception):
    pass


class ProviderEmbeddingService:
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if any(not text.strip() for text in texts):
            raise EmbeddingError("Embedding input must contain text.")
        if not settings.EMBEDDING_API_KEY:
            raise EmbeddingError("Embedding provider API key is missing.")

        try:
            with httpx.Client(timeout=settings.EMBEDDING_TIMEOUT_SECONDS) as client:
                response = client.post(
                    settings.EMBEDDING_BASE_URL.rstrip("/") + "/embeddings",
                    headers={"Authorization": f"Bearer {settings.EMBEDDING_API_KEY}"},
                    json={"model": settings.EMBEDDING_MODEL, "input": texts,
                          "dimensions": settings.EMBEDDING_DIMENSION},
                )
                response.raise_for_status()
                payload = response.json()
            if payload.get("model") != settings.EMBEDDING_MODEL:
                raise ValueError("Embedding model mismatch")
            rows = sorted(payload["data"], key=lambda row: row["index"])
            if [row["index"] for row in rows] != list(range(len(texts))):
                raise ValueError("Embedding response indices mismatch")
            vectors = [row["embedding"] for row in rows]
            for vector in vectors:
                if len(vector) != settings.EMBEDDING_DIMENSION or not all(
                    isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
                    for value in vector
                ) or not any(vector):
                    raise ValueError("Invalid embedding vector")
            return vectors
        except (httpx.HTTPError, ValueError, TypeError, AttributeError, KeyError, OverflowError) as error:
            raise EmbeddingError("Embedding provider failed or returned incompatible vectors.") from error


embedding_service = ProviderEmbeddingService()
