# infra/observability/alerts/webhook_alert.py
# Real alerting (Slack/Webhook)

import os
import httpx

WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL")

async def send_alert(message: str):
    if not WEBHOOK_URL:
        return

    async with httpx.AsyncClient() as client:
        await client.post(WEBHOOK_URL, json={"text": message})
