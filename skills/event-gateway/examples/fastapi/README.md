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
hookdeck listen 3000 <source_name> --path /webhooks
```

Replace `<source_name>` with your Hookdeck Source name (e.g. `stripe`).

## Adapted from

[hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills/tree/main/skills/hookdeck-event-gateway-webhooks/examples/fastapi)
