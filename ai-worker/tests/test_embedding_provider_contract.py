import json

import httpx
import pytest

from app.config import settings
from app.services.embedding_service import EmbeddingError, ProviderEmbeddingService


def configure(monkeypatch, response):
    monkeypatch.setattr(settings, "EMBEDDING_API_KEY", "fixture-key")
    monkeypatch.setattr(settings, "EMBEDDING_BASE_URL", "https://embedding.example/v1")
    monkeypatch.setattr(settings, "EMBEDDING_MODEL", "fixture-vector-model")
    client = httpx.Client

    def handler(request):
        assert request.url.path == "/v1/embeddings"
        assert request.headers["Authorization"] == "Bearer fixture-key"
        assert json.loads(request.content)["dimensions"] == 1024
        return httpx.Response(200, json=response)

    monkeypatch.setattr(httpx, "Client", lambda **kwargs: client(
        transport=httpx.MockTransport(handler), trust_env=False, **kwargs
    ))


def test_provider_vectors_are_ordered_by_response_index(monkeypatch):
    first, second = [1.0] * 1024, [2.0] * 1024
    configure(monkeypatch, {
        "model": "fixture-vector-model",
        "data": [{"index": 1, "embedding": second}, {"index": 0, "embedding": first}],
    })
    assert ProviderEmbeddingService().embed_batch(["A", "B"]) == [first, second]


@pytest.mark.parametrize("model,vector", [
    ("different-model", [1.0] * 1024),
    ("fixture-vector-model", [1.0] * 768),
    ("fixture-vector-model", [0.0] * 1024),
    ("fixture-vector-model", ["1.0"] * 1024),
])
def test_provider_rejects_incompatible_vectors(monkeypatch, model, vector):
    configure(monkeypatch, {"model": model, "data": [{"index": 0, "embedding": vector}]})
    with pytest.raises(EmbeddingError, match="incompatible"):
        ProviderEmbeddingService().embed_batch(["candidate text"])
