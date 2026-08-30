import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "AI Recruitment Platform Worker"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/internal/ai"
    
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "mock-openai-key")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    USE_MOCK_LLM: bool = os.getenv("USE_MOCK_LLM", "true").lower() == "true"
    
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    USE_MOCK_GITHUB: bool = os.getenv("USE_MOCK_GITHUB", "true").lower() == "true"

settings = Settings()
