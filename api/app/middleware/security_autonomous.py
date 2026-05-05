# api/app/middleware/security_autonomous.py
# Autonomous defense middleware: anomaly + circuit breaker + adaptive rate

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.security.adaptive_rate_limiter import check_rate
from app.security.bot_detection import is_bot
from app.security.anomaly_detector import is_anomalous
from app.security.circuit_breaker import is_blocked, block

MAX_BODY_SIZE = 5 * 1024 * 1024

class AutonomousSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        identity = request.headers.get("x-forwarded-for", request.client.host if request.client else "anon")

        # ---- circuit breaker (pre-check) ----
        if await is_blocked(identity):
            return Response("Blocked (circuit breaker)", status_code=403)

        # ---- bot detection ----
        if is_bot(request):
            await block(identity)
            return Response("Bot detected", status_code=403)

        # ---- streaming body guard ----
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BODY_SIZE:
                await block(identity)
                return Response("Payload too large", status_code=413)

        # ---- anomaly detection ----
        if await is_anomalous(identity):
            await block(identity)
            return Response("Anomalous behavior detected", status_code=429)

        # ---- adaptive rate limit ----
        allowed = await check_rate(identity)
        if not allowed:
            await block(identity)
            return Response("Too many requests", status_code=429)

        return await call_next(request)
