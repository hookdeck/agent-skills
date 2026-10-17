---
name: hookdeck
description: "Routes to the correct Hookdeck product skill. Covers Event Gateway (inbound: receive webhooks, webhook endpoints, local dev, event queue), Outpost (outbound: send webhooks to customers) and Inspect (free webhook test URLs with no account: see what a webhook sent). Use when working with any Hookdeck product and unsure which skill to use."
---

# Hookdeck

| What you want to do | Skill |
|---------------------|-------|
| **Receive and process webhooks** | event-gateway |
| **Route events between third-party services** | event-gateway |
| **Build asynchronous APIs (IoT, SDKs, web analytics)** | event-gateway |
| **Test and debug webhooks on localhost** | event-gateway |
| **Send webhooks/events to customers** | outpost |
| **Get a free webhook test URL, or see what a webhook sent (no account)** | inspect |

## Event Gateway

Inbound [event infrastructure](https://hookdeck.com/docs/). One skill covers all use cases:
staged integration workflow, connections, rules, authentication,
local dev, monitoring, and API.

For Event Gateway operations and analysis, prefer `hookdeck gateway ...`; root `hookdeck connection ...` remains a deprecated compatibility alias.

- Skill: [event-gateway](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md)
- Install: `npx skills add hookdeck/agent-skills --skill event-gateway`
- Docs: https://hookdeck.com/docs/

## Outpost

Outbound event delivery to HTTP, SQS, RabbitMQ, Pub/Sub, and more.

- Skill: [outpost](https://github.com/hookdeck/agent-skills/blob/main/skills/outpost/SKILL.md)
- Install: `npx skills add hookdeck/agent-skills --skill outpost`
- Docs: https://hookdeck.com/docs/outpost

## Inspect

Free webhook test URLs, with no account or login: create a URL with one HTTP call,
wait for webhooks to arrive, and read their headers and exact bodies as JSON.

- Skill: [inspect](https://github.com/hookdeck/agent-skills/blob/main/skills/inspect/SKILL.md)
- Install: `npx skills add hookdeck/agent-skills --skill inspect`
- Docs: https://inspect.hookdeck.com/llms.txt

## Provider Webhook Skills

For provider-specific webhook knowledge (Stripe, Shopify, GitHub, etc.),
see [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills).
The [event-gateway](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md) skill references these during the scaffold stage. **Non-interactive install:** use `-y -g` on `npx skills add hookdeck/webhook-skills --skill <provider>-webhooks` so the [Skills CLI](https://github.com/vercel-labs/skills) does not prompt (details: [provider-webhooks-checklist.md](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/references/provider-webhooks-checklist.md)).
