# api/app/middleware/security_intelligent.py
# Intelligent defense middleware: fingerprint + risk + shadow ban

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.security.fingerprint import build_fingerprint
from app.security.risk_engine import is_high_risk
from app.security.shadow_ban import shadow_ban, is_shadow_banned, apply_shadow_behavior

class IntelligentSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        identity = build_fingerprint(request)

        # ---- shadow ban check ----
        if await is_shadow_banned(identity):
            await apply_shadow_behavior()
            return Response("OK", status_code=200)

        # ---- risk engine ----
        if await is_high_risk(identity):
            await shadow_ban(identity)
            return Response("Suspicious activity", status_code=429)

        return await call_next(request)
