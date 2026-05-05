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


@app.get("/admin/security/metrics")
def security_metrics(_: None = Depends(verify_admin)):
    # placeholder: integrate Redis metrics / attack counters
    return {
        "blocked_requests": 0,
        "rate_limited": 0,
        "shadow_banned": 0
    }


@app.post("/admin/security/unblock")
def unblock(identity: str, _: None = Depends(verify_admin)):
    # TODO: integrate Redis delete block key
    return {"unblocked": identity}
