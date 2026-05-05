# api/app/security/risk_engine.py
# Dynamic risk scoring + adaptive thresholds

import aioredis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
BASE_THRESHOLD = 50

redis = None

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis

async def update_score(identity: str, weight: int = 1) -> int:
    r = await get_redis()
    key = f"risk:{identity}"

    try:
        score = await r.incrby(key, weight)
        await r.expire(key, 120)
        return score
    except Exception:
        return 0

async def is_high_risk(identity: str) -> bool:
    score = await update_score(identity)
    dynamic_threshold = BASE_THRESHOLD

    # could plug ML/heuristics here
    return score > dynamic_threshold
