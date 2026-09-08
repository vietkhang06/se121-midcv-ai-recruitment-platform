"""
MatchJD - Ollama Local Health Check Script
Verifies:
1. Ollama server reachable on OLLAMA_BASE_URL (http://localhost:11434)
2. LLM model available (dna5rm/granite4.2:3b-8k)
3. Embedding model available (nomic-embed-text:latest)

Exit code: 0 if PASS, 1 if FAIL
"""

import os
import sys
from pathlib import Path

# Add ai-worker to sys.path
root_dir = Path(__file__).resolve().parent.parent
ai_worker_dir = root_dir / "ai-worker"
if ai_worker_dir.exists():
    sys.path.insert(0, str(ai_worker_dir))

import httpx
from app.config import settings

def run_health_check() -> int:
    base_url = settings.OLLAMA_BASE_URL
    expected_llm = settings.OLLAMA_MODEL
    expected_embed = settings.OLLAMA_EMBEDDING_MODEL

    server_status = "FAIL"
    llm_status = "FAIL"
    embed_status = "FAIL"

    try:
        resp = httpx.get(f"{base_url}/api/tags", timeout=10.0)
        if resp.status_code == 200:
            server_status = "PASS"
            data = resp.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            
            # Check LLM model
            if any(expected_llm in m or m.startswith(expected_llm.split(":")[0]) for m in models):
                llm_status = "PASS"
            
            # Check embedding model
            if any(expected_embed in m or m.startswith(expected_embed.split(":")[0]) for m in models):
                embed_status = "PASS"
    except Exception as e:
        print(f"[ERROR] Failed to communicate with Ollama: {e}", file=sys.stderr)

    print(f"OLLAMA_SERVER={server_status}")
    print(f"LLM_MODEL={llm_status}")
    print(f"EMBEDDING_MODEL={embed_status}")

    if server_status == "PASS" and llm_status == "PASS" and embed_status == "PASS":
        return 0
    return 1

if __name__ == "__main__":
    sys.exit(run_health_check())
