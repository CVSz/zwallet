# api/app/security/anomaly_detector.py
# Behavioral anomaly detection (sliding window + scoring)

import aioredis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
WINDOW = 60
THRESHOLD = 50

redis = None

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis

async def record_request(identity: str) -> int:
    r = await get_redis()
    key = f"anomaly:{identity}"

    try:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, WINDOW)
        return count
    except Exception:
        return 0

async def is_anomalous(identity: str) -> bool:
    score = await record_request(identity)
    return score > THRESHOLD
