# Express Hookdeck Webhook Handler

Express.js webhook handler with Hookdeck signature verification.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Hookdeck webhook signing secret
npm start
```

## Hookdeck CLI

### Install

Install the Hookdeck CLI on your machine before the steps below. Official guide (all platforms): **[Install the Hookdeck CLI](https://hookdeck.com/docs/cli#installation)** · [Hookdeck CLI overview](https://hookdeck.com/docs/cli).

```bash
brew install hookdeck/hookdeck/hookdeck
# or
npm install -g hookdeck-cli
```

Run `hookdeck version` to confirm the binary is on your PATH. For Windows, Linux, Docker, and other options, use the official installation page linked above.

### Forward webhooks locally

```bash
hookdeck listen 3000 <source_name> --path /webhooks
```

Replace `<source_name>` with your Hookdeck Source name (e.g. `stripe`).

## Adapted from

[hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills/tree/main/skills/hookdeck-event-gateway-webhooks/examples/express)
