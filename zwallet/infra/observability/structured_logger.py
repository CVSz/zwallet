# api/app/observability/structured_logger.py

import json
import logging
from datetime import datetime

logger = logging.getLogger("app")

def log_event(event: str, **kwargs):
    payload = {
        "@timestamp": datetime.utcnow().isoformat(),
        "event": event,
        **kwargs
    }
    logger.info(json.dumps(payload))
