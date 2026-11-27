"""Read-only model provenance; never returns URLs, API keys or document content."""


def runtime_configuration(settings):
    return {
        "status": "LOADED",
        "configurationSource": "WORKER_ENVIRONMENT",
        "restartRequiredForChanges": True,
        "primary": {"enabled": settings.LLM_PRIMARY_ENABLED,
                    "provider": settings.LLM_PRIMARY_PROVIDER,
                    "model": settings.LLM_PRIMARY_MODEL},
        "embedding": {"provider": "openai_compatible", "model": settings.EMBEDDING_MODEL,
                      "dimension": settings.EMBEDDING_DIMENSION},
        "mockMode": False,
    }
