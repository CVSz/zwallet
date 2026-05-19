import os

import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
r = redis.from_url(REDIS_URL, decode_responses=True)


class IdempotencyStore:
    async def register_once(self, event_id: str, ttl_seconds: int = 86400) -> bool:
        if not event_id or not event_id.strip():
            raise ValueError("event_id must be non-empty")
        was_set = r.set(f"event:{event_id}", "1", ex=ttl_seconds, nx=True)
        return was_set is not None


def is_duplicate(event_id: str) -> bool:
    """Return True when event was already processed within TTL window."""
    if not event_id or not event_id.strip():
        raise ValueError("event_id must be non-empty")

    was_set = r.set(f"event:{event_id}", "1", ex=86400, nx=True)
    return was_set is None
