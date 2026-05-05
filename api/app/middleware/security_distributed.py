# api/app/middleware/security_distributed.py
# Distributed security layer using Redis

import os
import re
import aioredis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

MAX_BODY_SIZE = 5 * 1024 * 1024
RATE_LIMIT = 100
RATE_WINDOW = 60

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis = None

BLOCK_PATTERNS = [
    re.compile(r"(union\\s+select)", re.IGNORECASE),
    re.compile(r"\\.\\./"),
]



def contains_active_markup(value: str) -> bool:
    lower = value.lower()
    return '<script' in lower or '%3cscript' in lower

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis

class DistributedSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")

        # ---- body limit ----
        body = await request.body()
        if len(body) > MAX_BODY_SIZE:
            return Response("Payload too large", status_code=413)

        # ---- rate limit (redis) ----
        r = await get_redis()
        key = f"rate:{client_ip}"

        count = await r.incr(key)
        if count == 1:
            await r.expire(key, RATE_WINDOW)

        if count > RATE_LIMIT:
            return Response("Too many requests", status_code=429)

        # ---- waf ----
        path = request.url.path.lower()
        if any(p.search(path) for p in BLOCK_PATTERNS) or contains_active_markup(path):
            return Response("Blocked by WAF", status_code=403)

        return await call_next(request)
