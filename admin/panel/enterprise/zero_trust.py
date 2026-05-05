# admin/panel/enterprise/zero_trust.py

from fastapi import Request, HTTPException

def enforce_zero_trust(request: Request, identity: str):
    if not identity or identity == "anon":
        raise HTTPException(403, "unauthenticated")

    ip = request.headers.get("x-forwarded-for")

    if not ip:
        raise HTTPException(403, "missing IP")

    return True
