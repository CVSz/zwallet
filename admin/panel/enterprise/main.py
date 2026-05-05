# admin/panel/enterprise/main.py
# Enterprise Admin Control Plane (RBAC + JWT + Audit + Redis)

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
import os
import aioredis
import logging
from datetime import datetime

app = FastAPI(title="zWallet Enterprise Admin")
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis = None

async def get_redis():
    global redis
    if redis is None:
        redis = await aioredis.from_url(REDIS_URL)
    return redis


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid token")

    role = payload.get("role")
    if role not in ["admin", "operator", "readonly"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    return payload


def audit_log(action: str, actor: str, target: str | None = None):
    safe_actor = repr(str(actor))
    safe_action = repr(str(action))
    safe_target = repr(str(target)) if target is not None else "None"
    logging.info("[%s] %s -> %s -> %s", datetime.utcnow().isoformat(), safe_actor, safe_action, safe_target)


@app.get("/admin/health")
async def health(user=Depends(verify_admin)):
    return {"status": "ok", "role": user.get("role")}


@app.get("/admin/security/metrics")
async def metrics(user=Depends(verify_admin)):
    r = await get_redis()
    keys = await r.keys("*")
    return {
        "keys": len(keys),
        "timestamp": datetime.utcnow()
    }


@app.post("/admin/security/unblock")
async def unblock(identity: str, user=Depends(verify_admin)):
    if user.get("role") not in ["admin", "operator"]:
        raise HTTPException(status_code=403)

    r = await get_redis()
    await r.delete(f"block:{identity}")

    audit_log("unblock", user.get("sub"), identity)

    return {"unblocked": identity}


@app.post("/admin/security/shadow_unban")
async def shadow_unban(identity: str, user=Depends(verify_admin)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403)

    r = await get_redis()
    await r.delete(f"shadow:{identity}")

    audit_log("shadow_unban", user.get("sub"), identity)

    return {"shadow_unbanned": identity}


@app.get("/admin/audit/logs")
async def audit_logs(user=Depends(verify_admin)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403)

    # placeholder: integrate with ELK / DB
    return {"logs": "stream not implemented"}
