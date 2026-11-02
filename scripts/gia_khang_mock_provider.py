"""Local-only synthetic OpenAI/Ollama contract stub. Never contacts an external service.

Not an AI model or accuracy benchmark. Tests exercise the real worker/backend/database around it.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import json
import math
import re
import threading
import time

delay_lock = threading.Lock()
delayed = False


def content(messages):
    system = messages[0].get("content", "") if messages else ""
    user = messages[-1].get("content", "") if messages else ""
    try:
        data = json.loads(user)
    except (ValueError, TypeError):
        data = {}
    if "source_text" in data:
        text = data["source_text"]
        return json.dumps({"edits": [{"before": before, "after": after} for before, after in
            [("deveIoper", "developer"), ("enginecr", "engineer"), ("expericnce", "experience")]
            if text.count(before) == 1]})
    if "template" in data:
        return json.dumps({"milestones": data["template"]})
    if "reason_codes" in data:
        return json.dumps({"reason_codes": data["reason_codes"]})
    if "Canonical ID" in user:
        return "NONE"
    legacy = re.search(r"<document>\s*(.*?)\s*</document>", user, re.S)
    if legacy:
        text = legacy.group(1)
        priority = "REQUIRED" if "Document kind: JD" in user else "MENTIONED"
        skills = [name for name in ["Java", "Docker", "PostgreSQL", "Python", "React"]
                  if re.search(r"(?<![\w+#])" + re.escape(name) + r"(?![\w+#])", text, re.I)]
        return json.dumps({"title": None, "summary": None,
            "skills": [{"name": name, "canonical": name, "priority": priority, "evidence": name} for name in skills],
            "experience": {"years": None, "evidence": None, "entries": []}, "education": [], "projects": [],
            "otherRequirements": [], "githubUsername": None,
            "profile": {"fullName": None, "email": None, "phone": None, "location": None}})
    match = re.search(r"<CV_TEXT>\s*(.*?)\s*</CV_TEXT>", user, re.S)
    raw = match.group(1) if match else ""
    names = [name for name in ["PHAM DUC THANG", "NGUYEN TUAN ANH", "SYNTHETIC DELAY CANDIDATE"] if name in raw]
    email = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", raw)
    skills = [name for name in ["Java", "JavaScript", "Spring Boot", "Python", "Docker", "PostgreSQL", "React", "TypeScript", "Next.js", "Node.js"]
              if re.search(r"(?<![\w+#])" + re.escape(name) + r"(?![\w+#])", raw, re.I)]
    return json.dumps({"personalInfo": {"fullName": names[0] if names else None, "email": email.group() if email else None},
        "summary": "Software deveIoper with tested API projects." if "Software deveIoper with tested API projects." in raw else None,
        "skills": [{"name": name} for name in skills], "experience": [], "education": [], "projects": [], "certifications": [], "languages": []})


def vector(text):
    # Stable synthetic features for cache/math contracts. They do not measure semantic model quality.
    values = [0.001] * 1024
    for token in re.findall(r"[\w+#]+", text.lower()):
        index = int.from_bytes(hashlib.sha256(token.encode()).digest()[:2], "big") % 1024
        values[index] += 1.0
    norm = math.sqrt(sum(value * value for value in values))
    return [value / norm for value in values]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def respond(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/tags":
            return self.respond(200, {"models": [{"name": "test-mock-1024"}, {"name": "mock-contract-model"}]})
        return self.respond(200, {"object": "list", "data": [{"id": "mock-contract-model"}]})

    def do_POST(self):
        global delayed
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        data = json.loads(body)
        if self.path.endswith("/embed"):
            texts = data.get("input", [])
            if isinstance(texts, str): texts = [texts]
            return self.respond(200, {"model": data["model"], "embeddings": [vector(text) for text in texts]})
        if self.headers.get("Authorization") == "Bearer mock-invalid":
            return self.respond(401, {"error": {"message": "Synthetic authentication failure"}})
        if b"MOCK_PRIMARY_503" in body and self.path.startswith("/v1/"):
            return self.respond(503, {"error": {"message": "Synthetic transient failure"}})
        with delay_lock:
            delay = b"MIDCV_DELAY_PROBE" in body and not delayed
            if delay: delayed = True
        if delay:
            print("Delaying one synthetic mock-provider request by 65 seconds", flush=True)
            time.sleep(65)
        output = content(data.get("messages", []))
        if self.path == "/api/chat":
            return self.respond(200, {"model": data["model"], "message": {"role": "assistant", "content": output}, "done": True})
        return self.respond(200, {"id": "mock-contract-response", "model": data["model"],
            "choices": [{"message": {"role": "assistant", "content": output}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}})


if __name__ == "__main__":
    print("Synthetic provider listening on port 18019. External calls: disabled.", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 18019), Handler).serve_forever()
