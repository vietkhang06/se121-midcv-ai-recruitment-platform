"""Check chat model discovery and generate a test vector without personal data."""

from app.services.embedding_service import EmbeddingError, embedding_service
from app.services.provider_health import check_primary_provider


if __name__ == "__main__":
    chat_ready = check_primary_provider()["reachable"]
    print(f"Chat model available: {chat_ready}")
    try:
        vector, = embedding_service.embed_batch(["MidCV provider connectivity check"])
        print(f"Embedding verified: {len(vector)} dimensions")
    except EmbeddingError as error:
        print(error)
        raise SystemExit(1)
    raise SystemExit(0 if chat_ready else 1)
