# admin/panel/enterprise/audit_store.py

import hashlib
import json
from datetime import datetime
import aioredis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis = None

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis

async def append_audit(actor: str, action: str, target: str | None):
    r = await get_redis()

    entry = {
        "ts": datetime.utcnow().isoformat(),
        "actor": actor,
        "action": action,
        "target": target,
    }

    payload = json.dumps(entry, sort_keys=True)

    prev_hash = await r.get("audit:last_hash") or b""
    new_hash = hashlib.sha256(prev_hash + payload.encode()).hexdigest()

    record = {
        **entry,
        "prev_hash": prev_hash.decode() if prev_hash else None,
        "hash": new_hash,
    }

    # append-only key
    await r.xadd("audit_stream", record)  # Redis Stream (better than list)
    await r.set("audit:last_hash", new_hash)
