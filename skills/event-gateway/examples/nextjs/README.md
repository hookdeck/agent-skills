# Next.js Hookdeck Webhook Handler

Next.js App Router webhook handler with Hookdeck signature verification.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Hookdeck webhook signing secret
npm run dev
```

## Local development with Hookdeck CLI

```bash
hookdeck listen 3000 --path /webhooks
```

## Adapted from

[hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills/tree/main/skills/hookdeck-event-gateway-webhooks/examples/nextjs)
