"""Read-only model provenance; never returns URLs, API keys or document content."""


def runtime_configuration(settings):
    return {
        "status": "LOADED",
        "configurationSource": "WORKER_ENVIRONMENT",
        "restartRequiredForChanges": True,
        "primary": {"enabled": settings.LLM_PRIMARY_ENABLED,
                    "provider": settings.LLM_PRIMARY_PROVIDER,
                    "model": settings.LLM_PRIMARY_MODEL},
        "fallback": {"enabled": settings.LLM_FALLBACK_ENABLED,
                     "provider": settings.LLM_FALLBACK_PROVIDER,
                     "model": settings.OLLAMA_CHAT_MODEL},
        "embedding": {"model": settings.EMBEDDING_MODEL,
                      "dimension": settings.EMBEDDING_DIMENSION},
        "mockMode": settings.USE_MOCK_LLM,
    }
