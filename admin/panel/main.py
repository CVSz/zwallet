# admin/panel/main.py
# Minimal Admin Control Panel (FastAPI)

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

app = FastAPI(title="zWallet Admin Panel")
security = HTTPBearer()

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "change-me")


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")


@app.get("/admin/health")
def health(_: None = Depends(verify_admin)):
    return {"status": "ok"}


import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
r = redis.from_url(REDIS_URL, decode_responses=True)

@app.get("/admin/security/metrics")
def security_metrics(_: None = Depends(verify_admin)):
    # Actual implementation: Fetch counters from Redis
    return {
        "blocked_requests": int(r.get("metrics:blocked_requests") or 0),
        "rate_limited": int(r.get("metrics:rate_limited") or 0),
        "shadow_banned": int(r.get("metrics:shadow_banned") or 0)
    }


@app.post("/admin/security/unblock")
def unblock(identity: str, _: None = Depends(verify_admin)):
    # Implemented: Redis delete block key
    key = f"rl:global:{identity}"
    deleted = r.delete(key)
    return {"unblocked": identity, "key_removed": deleted > 0}
