from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.events.idempotency import IdempotencyStore


class GlobalIdempotencyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.store = IdempotencyStore()

    async def dispatch(self, request, call_next):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            key = request.headers.get("Idempotency-Key")
            if not key:
                return Response("Missing Idempotency-Key", status_code=400)
            first_use = await self.store.register_once(f"http:{request.method}:{request.url.path}:{key}")
            if not first_use:
                return Response("Duplicate request", status_code=409)

        return await call_next(request)
