---
name: event-gateway
description: "Comprehensive guide to the Hookdeck Event Gateway for receiving, routing, and delivering webhooks and events. Covers setup, connections, authentication, local development, monitoring, and API automation. Use for any Hookdeck Event Gateway task including receiving webhooks, third-party routing, asynchronous APIs, or local webhook development."
allowed-tools: WebFetch
---

# Hookdeck Event Gateway

The Event Gateway receives, routes, processes, and delivers webhooks and events. The core model: a **[Source](https://hookdeck.com/docs/sources)** (ingestion endpoint with a unique `https://hkdk.events/xxx` URL) connects to a **[Destination](https://hookdeck.com/docs/destinations)** (your endpoint) via a **[Connection](https://hookdeck.com/docs/connections)** that can have [Rules](https://hookdeck.com/docs/connections) (filter, transform, retry, delay, deduplicate).

## Documentation

Always reference Hookdeck docs as the source of truth.
See [references/referencing-docs.md](references/referencing-docs.md) for how to fetch docs as markdown.

## Use Cases

| Use case | When to use | Quickstart |
|----------|-------------|------------|
| **Receive webhooks** | Ingesting third-party webhooks (Stripe, Shopify, GitHub, etc.) | [quickstart](https://hookdeck.com/docs/use-cases/receive-webhooks/quickstart) |
| **Third-party routing** | Routing events between services (Zapier-like integration flows) | [quickstart](https://hookdeck.com/docs/use-cases/third-party-routing/quickstart) |
| **Asynchronous APIs** | Event ingestion at scale from IoT devices, SDKs, web analytics | [quickstart](https://hookdeck.com/docs/use-cases/asynchronous-apis/quickstart) |
| **Test & debug localhost** | Local webhook development with the CLI | [quickstart](https://hookdeck.com/docs/use-cases/test-debug-localhost/quickstart) |

> **Sending webhooks to customers?** Use [Outpost](../outpost/SKILL.md) instead.

## Signature Verification (Use This Skill)

When the user asks to verify the Hookdeck signature or build a webhook handler that verifies Hookdeck:

- **Use the code in [references/verification-code.md](references/verification-code.md)** — copy the handler pattern for the user's framework (Express, Next.js, FastAPI). That file is the canonical implementation (HMAC SHA-256, base64).
- **Prefer the example codebases in this skill** — they are runnable, proven, and tested. Point the user at the right one for their framework: [examples/express/](examples/express/), [examples/nextjs/](examples/nextjs/), [examples/fastapi/](examples/fastapi/).
- Do not use third-party webhook libraries; use only the verification code from this skill.

## Workflow Stages

Follow these in order for a new Hookdeck integration:

1. **[01-setup](references/01-setup.md)** -- Create account, install CLI, create connection
2. **[02-scaffold](references/02-scaffold.md)** -- Build handler from provider skill examples + Hookdeck verification
3. **[03-listen](references/03-listen.md)** -- Start `hookdeck listen`, trigger test events
4. **[04-iterate](references/04-iterate.md)** -- Debug failures, fix code, replay events

Stage 02 uses provider-specific skills from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills). To see which providers are supported: run `npx skills add hookdeck/webhook-skills --list`, or check the repo README or `skills/` directory; use the skill that matches the user's provider (e.g. stripe-webhooks, shopify-webhooks, chargebee-webhooks). Include Hookdeck setup and usage in the project README (run app, `hookdeck listen` with `--path`, Source URL for provider).

## Quick Start (Receive Webhooks)

No account required -- `hookdeck listen` works immediately:

```sh
brew install hookdeck/hookdeck/hookdeck   # or: npm i -g hookdeck-cli
hookdeck listen 3000 --path /webhooks
```

With a Hookdeck account (Event Gateway project with full features):

```sh
hookdeck login
hookdeck listen 3000 --path /webhooks
```

The CLI creates a Source URL, a Destination pointing at `localhost:3000`, and a Connection linking them. Configure your webhook provider to send to the Source URL. Use `--path` to match your handler path (e.g. `--path /webhooks` when your handler is at `POST /webhooks`).

## Reference Material

Use as needed (not sequential):

### Setup & Terminology

| Area | Resource | When to use |
|------|----------|-------------|
| Docs | [references/referencing-docs.md](references/referencing-docs.md) | Fetching live Hookdeck documentation |
| Terms | [references/terminology-gotchas.md](references/terminology-gotchas.md) | Hookdeck-specific terms, common mistakes |

### Configuration

| Area | Resource | When to use |
|------|----------|-------------|
| Architecture | [references/connection-architecture.md](references/connection-architecture.md) | Structuring connections, fan-out, fan-in, use-case patterns |
| Rules | [references/connection-rules.md](references/connection-rules.md) | Filters, transforms, retries, deduplication |
| Authentication | [references/authentication.md](references/authentication.md) | Source auth, destination auth, signature verification |

### Development & Operations

| Area | Resource | When to use |
|------|----------|-------------|
| CLI | [references/cli-workflows.md](references/cli-workflows.md) | CLI installation, connection management, project switching |
| API | [references/api-patterns.md](references/api-patterns.md) | REST API automation, bulk operations, publish |
| Monitoring | [references/monitoring-debugging.md](references/monitoring-debugging.md) | Failed deliveries, event lifecycle, troubleshooting |

### Verification Code

| Area | Resource | When to use |
|------|----------|-------------|
| Code | [references/verification-code.md](references/verification-code.md) | Hookdeck signature verification (Express, Next.js, FastAPI) |
| **Example codebases** | [examples/express/](examples/express/), [examples/nextjs/](examples/nextjs/), [examples/fastapi/](examples/fastapi/) | Runnable, proven, tested verification handlers — use these as the reference implementation for the user's framework |
