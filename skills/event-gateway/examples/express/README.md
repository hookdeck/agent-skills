# Express Hookdeck Webhook Handler

Express.js webhook handler with Hookdeck signature verification.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Hookdeck webhook signing secret
npm start
```

## Local development with Hookdeck CLI

```bash
hookdeck listen 3000 <source_name> --path /webhooks
```

Replace `<source_name>` with your Hookdeck Source name (e.g. `stripe`).

## Adapted from

[hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills/tree/main/skills/hookdeck-event-gateway-webhooks/examples/express)
