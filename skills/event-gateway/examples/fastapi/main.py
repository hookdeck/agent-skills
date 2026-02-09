# Hookdeck Event Gateway webhook handler — FastAPI
# Adapted from: https://github.com/hookdeck/webhook-skills

import os
import hmac
import hashlib
import base64
import json
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException

load_dotenv()

app = FastAPI()

hookdeck_secret = os.environ.get("HOOKDECK_WEBHOOK_SECRET")


def verify_hookdeck_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    """Verify Hookdeck webhook signature."""
    if not signature or not secret:
        return False

    computed = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            raw_body,
            hashlib.sha256
        ).digest()
    ).decode('utf-8')

    return hmac.compare_digest(computed, signature)


@app.post("/webhooks")
async def webhook(request: Request):
    # Get the raw body for signature verification
    raw_body = await request.body()
    signature = request.headers.get("x-hookdeck-signature")
    event_id = request.headers.get("x-hookdeck-eventid")
    source_name = request.headers.get("x-hookdeck-source-name")
    attempt_count = request.headers.get("x-hookdeck-attempt-count")

    # Verify Hookdeck signature
    if not verify_hookdeck_signature(raw_body, signature, hookdeck_secret):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse the payload after verification
    payload = json.loads(raw_body)

    print(f"Received event {event_id} from source {source_name} (attempt {attempt_count})")

    # Handle based on the original event type
    event_type = payload.get("type") or payload.get("topic") or "unknown"
    print(f"Event type: {event_type}")

    # Return 200 to acknowledge receipt — Hookdeck retries on non-2xx
    return {"received": True, "eventId": event_id}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
