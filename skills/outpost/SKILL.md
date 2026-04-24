---
name: outpost
description: "Sets up and configures Hookdeck Outpost for outbound event delivery to customer endpoints. Use when sending webhooks to customers, building webhook delivery infrastructure, managing tenants and destinations with supported types (webhooks, Hookdeck Event Gateway, AWS SQS/Kinesis/S3, Azure Service Bus, GCP Pub/Sub, RabbitMQ, Kafka), or aligning topics and publishes. EventBridge support is tracked in GitHub issues."
allowed-tools: WebFetch
---

# Hookdeck Outpost

Outbound event delivery: publish platform events to **tenants’ destinations** (webhooks, queues, cloud buses—see [supported destinations](https://hookdeck.com/docs/outpost/overview#supported-destinations)). [Open source on GitHub](https://github.com/hookdeck/outpost); managed on Hookdeck Cloud or self-hosted.

**Single source of truth:** Use [Hookdeck Outpost documentation](https://hookdeck.com/docs/outpost) for concepts, API, quickstarts, and UI guidance. This skill links there and adds agent workflow notes under `references/`.

## Documentation index for agents

- **`llms.txt`:** [https://hookdeck.com/docs/outpost/llms.txt](https://hookdeck.com/docs/outpost/llms.txt) — plain-text map of doc pages as `.md` URLs; fetch once when you need the full tree or many pages.
- **Concepts:** [Tenants, destinations, topics, publish](https://hookdeck.com/docs/outpost/concepts)
- **API reference:** [REST / OpenAPI](https://hookdeck.com/docs/outpost/api); self-hosted spec file: `https://github.com/hookdeck/outpost/blob/main/docs/apis/openapi.yaml`
- **SDKs:** [Overview](https://hookdeck.com/docs/outpost/sdks) — for TypeScript, Python, or Go, follow that language’s **quickstart** for correct signatures.
- **Building your own UI:** [Guide](https://hookdeck.com/docs/outpost/guides/building-your-own-ui) — screen flow, BFF pattern, implementation checklists.
- **Destinations / topics:** [Destination types](https://hookdeck.com/docs/outpost/destinations) · [Topics and subscriptions](https://hookdeck.com/docs/outpost/features/topics)

## Quickstarts (smallest path first)

Use the official managed-Outpost walkthroughs before opening full-stack examples in this repo:

| | |
|--|--|
| curl (HTTP only) | [Hookdeck Outpost curl quickstart](https://hookdeck.com/docs/outpost/quickstarts/hookdeck-outpost-curl) |
| TypeScript | [TypeScript quickstart](https://hookdeck.com/docs/outpost/quickstarts/hookdeck-outpost-typescript) |
| Python | [Python quickstart](https://hookdeck.com/docs/outpost/quickstarts/hookdeck-outpost-python) |
| Go | [Go quickstart](https://hookdeck.com/docs/outpost/quickstarts/hookdeck-outpost-go) |

Compact link list: [references/outpost-quickstarts.md](references/outpost-quickstarts.md).

## Fast path for agents

1. Start with [references/outpost-scope.md](references/outpost-scope.md) to pick Quick path vs New minimal app vs Existing app.
2. If scope is ambiguous, default to the smallest quickstart-shaped artifact.
3. Fetch only the language quickstart you need (curl, TypeScript, Python, Go).
4. Use [references/outpost-verify.md](references/outpost-verify.md) before finishing.
5. Open full-stack examples only when the task clearly requires BFF/UI integration patterns.

## Scope and verification (agent workflow)

Dashboard-style guidance (no `{{PLACEHOLDERS}}` — those stay dashboard-only):

- [references/outpost-scope.md](references/outpost-scope.md) — three-path ladder, default-to-smallest, language vs architecture, topic reconciliation, SDK vs OpenAPI / BFF pointers with links to **Building your own UI** anchors.
- [references/outpost-verify.md](references/outpost-verify.md) — trimmed “before you stop” checklist.

**BFF / wire JSON:** [Authentication](https://hookdeck.com/docs/outpost/guides/building-your-own-ui#authentication) · [Wire JSON, SDK responses, and your UI](https://hookdeck.com/docs/outpost/guides/building-your-own-ui#wire-json-sdk-responses-and-your-ui)

## Supported destination types

**Available:** Webhooks (HTTP), Hookdeck Event Gateway, AWS SQS, AWS Kinesis, AWS S3, Azure Service Bus, GCP Pub/Sub, RabbitMQ (AMQP), Kafka

**Planned:** [AWS EventBridge](https://github.com/hookdeck/outpost/issues/201)

## Deployment and API pointers

- **Managed:** [Hookdeck Outpost docs](https://hookdeck.com/docs/outpost) and per-language quickstarts.
- **Self-hosted quickstarts:** [Docker](https://hookdeck.com/docs/outpost/self-hosting/quickstarts/docker), [Kubernetes](https://hookdeck.com/docs/outpost/self-hosting/quickstarts/kubernetes), [Railway](https://hookdeck.com/docs/outpost/self-hosting/quickstarts/railway), [Configuration](https://hookdeck.com/docs/outpost/self-hosting/configuration).
- **API reference:** [Outpost REST / OpenAPI](https://hookdeck.com/docs/outpost/api).
- **Base URL note:** Managed API base is project-specific (quickstarts currently show `https://api.outpost.hookdeck.com/2025-07-01`); verify live docs/project settings if unsure.

## Full-stack reference examples (advanced)

**Use only when** the task needs realistic BFF + dashboard patterns—not for “smallest example” (use **Quickstarts** and **`llms.txt`** first).

**Integration maps (read before opening trees):**

- Next.js: [references/nextjs-saas-integration-map.md](references/nextjs-saas-integration-map.md)
- FastAPI: [references/fastapi-saas-integration-map.md](references/fastapi-saas-integration-map.md)

**Treat examples as references, not copy-paste scaffolds.** Prefer the user’s codebase and use maps for Outpost-specific behavior (server-only admin key, tenant mapping, BFF routes, domain `publish`).

| Example | Stack | Location |
|---------|--------|----------|
| SaaS (Next.js) | App Router + `@hookdeck/outpost-sdk` + dashboard UI | [examples/nextjs-saas/](examples/nextjs-saas/) — [README](examples/nextjs-saas/README.md) |
| SaaS (FastAPI + React) | FastAPI BFF (`httpx` → Outpost) + template UI | [examples/fastapi-saas/](examples/fastapi-saas/) — [README](examples/fastapi-saas/README.md) |

Dependency and version pins live in the example manifests (`package.json`, `pyproject.toml`).

**How agents should use them:** [PostHog-style progressive disclosure](https://posthog.com/handbook/engineering/ai/writing-skills) — overview and maps first; open only files that match the task.

**Tests:** `npm test` in `nextjs-saas` (Vitest); `pytest test_outpost_wire.py` in `fastapi-saas/backend` via `./scripts/test-examples.sh outpost`. Next.js example uses **npm**.

## Future skills

Destination-specific skills (`outpost-webhooks`, `outpost-sqs`, …) may be added as documentation matures.

## Related skills

- [hookdeck](https://github.com/hookdeck/agent-skills/blob/main/skills/hookdeck/SKILL.md) — skill router for Hookdeck products
- [event-gateway](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md) — Hookdeck Event Gateway (inbound webhooks)
