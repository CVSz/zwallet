# api/app/security/fingerprint.py
# Identity fingerprint (IP + UA + optional user id)

import hashlib

def build_fingerprint(request, user_id: str | None = None) -> str:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    ua = request.headers.get("user-agent", "")

    raw = f"{ip}:{ua}:{user_id or 'anon'}"
    return hashlib.sha256(raw.encode()).hexdigest()
