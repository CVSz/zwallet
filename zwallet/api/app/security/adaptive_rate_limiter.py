# api/app/security/adaptive_rate_limiter.py
# Adaptive + token/IP hybrid rate limiting with Redis

import os
import aioredis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
BASE_LIMIT = 100
BURST = 50
WINDOW = 60

redis = None

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis

async def check_rate(identity: str, weight: int = 1) -> bool:
    r = await get_redis()

    key = f"rate:{identity}"

    try:
        count = await r.incrby(key, weight)
        if count == weight:
            await r.expire(key, WINDOW)

        limit = BASE_LIMIT + BURST

        return count <= limit
    except Exception:
        # fail-open (availability > strict block)
        return True
