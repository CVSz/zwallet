# api/app/security/shadow_ban.py
# Shadow banning (stealth deny / slow responses)

import aioredis
import os
import asyncio

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
BAN_TTL = 600

redis = None

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis

async def shadow_ban(identity: str):
    r = await get_redis()
    try:
        await r.set(f"shadow:{identity}", "1", ex=BAN_TTL)
    except Exception:
        return

async def is_shadow_banned(identity: str) -> bool:
    r = await get_redis()
    try:
        return await r.exists(f"shadow:{identity}") > 0
    except Exception:
        return False

async def apply_shadow_behavior():
    # slow down response (tarpit)
    await asyncio.sleep(2)
