# api/app/middleware/security_battle_ready.py
# Battle-ready security: adaptive rate + bot detection + streaming guard

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.security.adaptive_rate_limiter import check_rate
from app.security.bot_detection import is_bot

MAX_BODY_SIZE = 5 * 1024 * 1024

class BattleReadySecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        identity = request.headers.get("x-forwarded-for", request.client.host if request.client else "anon")

        # ---- bot detection ----
        if is_bot(request):
            return Response("Bot detected", status_code=403)

        # ---- streaming body guard ----
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BODY_SIZE:
                return Response("Payload too large", status_code=413)

        # ---- adaptive rate limit ----
        allowed = await check_rate(identity)
        if not allowed:
            return Response("Too many requests", status_code=429)

        return await call_next(request)
