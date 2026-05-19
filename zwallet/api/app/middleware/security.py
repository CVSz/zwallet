# api/app/middleware/security.py
# Full runtime security layer: body limit + rate limit + basic WAF

import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

MAX_BODY_SIZE = 5 * 1024 * 1024  # 5MB
RATE_LIMIT = 100  # requests
RATE_WINDOW = 60  # seconds

# simple in-memory store (replace with Redis in production)
request_log = defaultdict(list)

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        # ---- Body size limit ----
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_BODY_SIZE:
                    return Response("Payload too large", status_code=413)
            except ValueError:
                return Response("Invalid Content-Length", status_code=400)

        # ---- Rate limiting ----
        now = time.time()
        window_start = now - RATE_WINDOW

        request_log[client_ip] = [t for t in request_log[client_ip] if t > window_start]
        if len(request_log[client_ip]) >= RATE_LIMIT:
            return Response("Too many requests", status_code=429)

        request_log[client_ip].append(now)

        # ---- Basic WAF (very minimal rules) ----
        path = request.url.path.lower()
        if any(x in path for x in ["../", "<script>", "%3cscript%3e", "union select"]):
            return Response("Blocked by WAF", status_code=403)

        return await call_next(request)
