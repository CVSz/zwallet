# api/app/security/bot_detection.py
# Basic bot detection (fingerprint + heuristics)

import re

SUSPICIOUS_UA = [
    re.compile(r"curl", re.IGNORECASE),
    re.compile(r"wget", re.IGNORECASE),
    re.compile(r"python-requests", re.IGNORECASE),
]


def is_bot(request) -> bool:
    ua = request.headers.get("user-agent", "")

    if any(p.search(ua) for p in SUSPICIOUS_UA):
        return True

    # missing headers heuristic
    if not request.headers.get("accept"):
        return True

    return False
