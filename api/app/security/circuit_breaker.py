# api/app/security/circuit_breaker.py
# Circuit breaker for isolating abusive identities

import aioredis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
BLOCK_TTL = 300  # 5 minutes

redis = None

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis

async def is_blocked(identity: str) -> bool:
    r = await get_redis()
    try:
        return await r.exists(f"block:{identity}") > 0
    except Exception:
        return False

async def block(identity: str):
    r = await get_redis()
    try:
        await r.set(f"block:{identity}", "1", ex=BLOCK_TTL)
    except Exception:
        return
