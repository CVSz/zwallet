import os
from starlette.middleware.base import BaseHTTPMiddleware

from app.middleware.security_distributed import DistributedSecurityMiddleware
from app.middleware.security_autonomous import AutonomousSecurityMiddleware
from app.middleware.security_intelligent import IntelligentSecurityMiddleware


class UnifiedSecurityMiddleware(BaseHTTPMiddleware):
    """Single security pipeline that composes all hardened controls once."""

    async def dispatch(self, request, call_next):
        distributed = DistributedSecurityMiddleware(app=self.app)
        autonomous = AutonomousSecurityMiddleware(app=self.app)
        intelligent = IntelligentSecurityMiddleware(app=self.app)

        async def terminal(req):
            return await call_next(req)

        async def run_intelligent(req):
            return await intelligent.dispatch(req, terminal)

        async def run_autonomous(req):
            return await autonomous.dispatch(req, run_intelligent)

        return await distributed.dispatch(request, run_autonomous)


def enforce_runtime_prerequisites() -> None:
    """Enforce Vault and mTLS before serving traffic."""
    vault_required = os.getenv("VAULT_SECRETS_PATH", "/vault/secrets")
    if not os.path.isdir(vault_required):
        raise RuntimeError(f"Vault path missing: {vault_required}")

    mtls_mode = os.getenv("MTLS_MODE", "STRICT").upper()
    if mtls_mode != "STRICT":
        raise RuntimeError("mTLS must be STRICT")
