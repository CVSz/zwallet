# api/app/middleware/security_advanced.py
# Advanced runtime security: streaming body guard + token-based rate limit

import os
import re
import jwt
import aioredis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

MAX_BODY_SIZE = 5 * 1024 * 1024
RATE_LIMIT = 200
RATE_WINDOW = 60
JWT_SECRET = os.getenv("JWT_SECRET", "secret")
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


def extract_identity(request):
    auth = request.headers.get("authorization")
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return payload.get("sub", "anon")
        except Exception:
            return "invalid"
    return request.headers.get("x-forwarded-for", request.client.host if request.client else "anon")


class AdvancedSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        identity = extract_identity(request)

        # ---- streaming body guard ----
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BODY_SIZE:
                return Response("Payload too large", status_code=413)

        # ---- distributed rate limit ----
        r = await get_redis()
        key = f"rate:{identity}"

        count = await r.incr(key)
        if count == 1:
            await r.expire(key, RATE_WINDOW)

        if count > RATE_LIMIT:
            return Response("Too many requests", status_code=429)

        # ---- WAF ----
        path = request.url.path.lower()
        if any(p.search(path) for p in BLOCK_PATTERNS) or contains_active_markup(path):
            return Response("Blocked", status_code=403)

        return await call_next(request)
