# api/app/observability/structured_logger.py
# JSON structured logging for SIEM

import json
import logging

logger = logging.getLogger("app")


def log_event(event: str, **kwargs):
    payload = {
        "event": event,
        **kwargs
    }
    logger.info(json.dumps(payload))
