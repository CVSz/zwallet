# admin/panel/enterprise/security_hardening.py

from fastapi import Request, HTTPException
import os

ALLOWED_SUBJECTS = set(os.getenv("MTLS_ALLOWED_SUBJECTS", "admin-client").split(","))

def enforce_mtls(request: Request):
    # MUST be injected by trusted ingress (e.g. nginx / envoy)
    subject = request.headers.get("x-ssl-client-subject")

    if not subject:
        raise HTTPException(status_code=403, detail="mTLS required")

    if subject not in ALLOWED_SUBJECTS:
        raise HTTPException(status_code=403, detail="untrusted client")
