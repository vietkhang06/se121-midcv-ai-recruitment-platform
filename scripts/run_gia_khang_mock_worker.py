"""Run the local HTTP mock integration, without loading user API keys or starting Docker.

Usage: .venv/Scripts/python.exe scripts/run_gia_khang_mock_worker.py
Requires the existing project venv. Uses ports 18009/18019 exclusively and stops its children.
"""
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    for port in (18009, 18019):
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                raise SystemExit(f"Port {port} is occupied; refusing to reuse an unknown service")
    env = dict(os.environ)
    env.update(LLM_PRIMARY_ENABLED="true", LLM_PRIMARY_BASE_URL="http://127.0.0.1:18019/v1",
               LLM_PRIMARY_API_KEY="mock-local-only", LLM_PRIMARY_MODEL="mock-contract-model",
               LLM_PRIMARY_MAX_RETRIES="1", LLM_FALLBACK_ENABLED="true",
               OLLAMA_BASE_URL="http://127.0.0.1:18019", OLLAMA_CHAT_MODEL="mock-contract-model",
               OLLAMA_EMBEDDING_MODEL="test-mock-1024", EMBEDDING_MODEL="test-mock-1024",
               OPENAI_API_KEY="", USE_MOCK_LLM="false", PYTHON_DOTENV_DISABLED="1")
    # dotenv may override process variables in older installations. Fail closed before launch.
    subprocess.run([sys.executable, "-c", "from app.config import settings as s; "
                    "assert s.LLM_PRIMARY_BASE_URL == 'http://127.0.0.1:18019/v1'; "
                    "assert s.OLLAMA_BASE_URL == 'http://127.0.0.1:18019'; "
                    "assert s.LLM_PRIMARY_API_KEY == 'mock-local-only'; "
                    "assert s.LLM_PRIMARY_MODEL == 'mock-contract-model'"],
                   cwd=ROOT / "ai-worker", env=env, check=True)
    output = ROOT / "diagnostics/gia-khang"
    output.mkdir(parents=True, exist_ok=True)
    children, logs = [], []
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    try:
        for name, command, cwd in [
            ("mock-provider", [sys.executable, "-u", "scripts/gia_khang_mock_provider.py"], ROOT),
            ("worker-mock-native", [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "18009"], ROOT / "ai-worker"),
        ]:
            log = (output / f"{name}.log").open("w", encoding="utf-8")
            logs.append(log)
            children.append(subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, creationflags=flags))
        for _ in range(60):
            if any(child.poll() is not None for child in children):
                raise RuntimeError("Mock child exited before readiness; inspect diagnostics/gia-khang")
            try:
                urllib.request.urlopen("http://127.0.0.1:18009/openapi.json", timeout=1).close()
                break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError("Local worker did not become ready")
        return subprocess.run([sys.executable, "scripts/verify_gia_khang_mock_worker.py"], cwd=ROOT, env=env).returncode
    finally:
        for child in reversed(children):
            if os.name == "nt" and child.poll() is None:
                # The Windows venv launcher may own another Python process.
                subprocess.run(["taskkill", "/PID", str(child.pid), "/T", "/F"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
                child.wait(timeout=10)
                continue
            child.terminate()
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
        for log in logs:
            log.close()


if __name__ == "__main__":
    raise SystemExit(main())
