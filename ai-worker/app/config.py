import os
from pathlib import Path
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    base_dir = Path(__file__).resolve().parent.parent
    local_env = base_dir / ".env"
    root_env = base_dir.parent / ".env"
    if local_env.exists():
        load_dotenv(local_env, override=True)
    elif root_env.exists():
        load_dotenv(root_env, override=True)
    else:
        load_dotenv(override=True)
except ImportError:
    pass

class Settings(BaseModel):
    PROJECT_NAME: str = "MatchJD AI Worker"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/internal/ai"
    
    # Provider selection: 'ollama' (default runtime), 'openai', or 'mock'
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "ollama").lower()
    
    # Ollama Local Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "dna5rm/granite4.2:3b-8k")
    OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "mock-openai-key")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL") or os.getenv("LLM_MODEL", "gpt-4o-mini")
    
    # Mock fallback gating (strictly only used when explicit test mode)
    USE_MOCK_LLM: bool = os.getenv("USE_MOCK_LLM", "false").lower() == "true"
    
    # GitHub Integration
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    USE_MOCK_GITHUB: bool = os.getenv("USE_MOCK_GITHUB", "false").lower() == "true"

settings = Settings()
