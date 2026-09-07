import hashlib
import time
from typing import Any, Optional, Dict

class MemoryCacheService:
    """
    In-memory LRU/TTL Cache Service to reduce LLM and parsing latency
    for duplicate or identical CV / JD ingestion requests.
    """
    def __init__(self, default_ttl_seconds: int = 3600):
        self.default_ttl_seconds = default_ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _compute_key(self, namespace: str, content: str) -> str:
        h = hashlib.sha256(content.encode("utf-8")).hexdigest()
        return f"{namespace}:{h}"

    def get(self, namespace: str, content: str) -> Optional[Any]:
        key = self._compute_key(namespace, content)
        item = self._cache.get(key)
        if not item:
            return None
        
        if time.time() > item["expires_at"]:
            del self._cache[key]
            return None
        
        return item["value"]

    def set(self, namespace: str, content: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        key = self._compute_key(namespace, content)
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        self._cache[key] = {
            "value": value,
            "expires_at": time.time() + ttl,
            "stored_at": time.time()
        }

    def clear(self) -> None:
        self._cache.clear()

    def size(self) -> int:
        # Purge expired before returning count
        now = time.time()
        expired_keys = [k for k, v in self._cache.items() if now > v["expires_at"]]
        for k in expired_keys:
            del self._cache[k]
        return len(self._cache)

cache_service = MemoryCacheService()
