# FastAPI Hookdeck Webhook Handler

Python FastAPI webhook handler with Hookdeck signature verification.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Hookdeck webhook signing secret
python main.py
```

## Local development with Hookdeck CLI

```bash
hookdeck listen 3000 --path /webhooks
```

## Adapted from

[hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills/tree/main/skills/hookdeck-event-gateway-webhooks/examples/fastapi)
