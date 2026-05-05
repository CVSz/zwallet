# api/app/observability/alerts.py
# Simple alerting hook (threshold-based)

import os
import logging

ALERT_THRESHOLD = int(os.getenv("ALERT_THRESHOLD", "100"))


def check_and_alert(metric_name: str, value: int):
    if value > ALERT_THRESHOLD:
        logging.warning(f"ALERT: {metric_name} exceeded threshold ({value})")
