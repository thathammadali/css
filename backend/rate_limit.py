import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

_hits: dict[str, deque] = defaultdict(deque)
_lock = Lock()

TOO_MANY = "Too many attempts, please wait a minute and try again."


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _live_hits(key: str, now: float, window_seconds: int) -> deque:
    hits = _hits[key]
    while hits and now - hits[0] > window_seconds:
        hits.popleft()
    if not hits:
        _hits.pop(key, None)
    return hits


def is_limited(key: str, limit: int, window_seconds: int = 60) -> bool:
    with _lock:
        return len(_live_hits(key, time.monotonic(), window_seconds)) >= limit


def record(key: str, window_seconds: int = 60) -> None:
    with _lock:
        now = time.monotonic()
        _live_hits(key, now, window_seconds)
        _hits[key].append(now)


def enforce(key: str, limit: int, window_seconds: int = 60) -> None:
    with _lock:
        now = time.monotonic()
        if len(_live_hits(key, now, window_seconds)) >= limit:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=TOO_MANY)
        _hits[key].append(now)


def rate_limit(name: str, limit: int, window_seconds: int = 60):
    def dependency(request: Request) -> None:
        enforce(f"{name}:{client_ip(request)}", limit, window_seconds)

    return dependency
