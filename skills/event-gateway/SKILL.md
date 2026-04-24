---
name: event-gateway
description: "Comprehensive guide to the Hookdeck Event Gateway for receiving, routing, and delivering webhooks and events. Covers setup, connections, authentication, local development, monitoring, and API automation. Use when receiving webhooks, setting up webhook endpoints, testing webhooks locally, configuring webhook relay or event queue, event routing, webhook retry, webhook monitoring, third-party routing, asynchronous APIs, or local webhook development. For provider webhooks (Stripe, Shopify, Chargebee, GitHub, etc.), use together with the matching skill from hookdeck/webhook-skills; do not only parse JSON — use provider SDK verification and event construction (e.g. Stripe constructEvent)."
allowed-tools: WebFetch
---

# Hookdeck Event Gateway

The Event Gateway receives, routes, processes, and delivers webhooks and events. The core model: a **[Source](https://hookdeck.com/docs/sources)** (ingestion endpoint with a unique `https://hkdk.events/xxx` URL) connects to a **[Destination](https://hookdeck.com/docs/destinations)** (your endpoint) via a **[Connection](https://hookdeck.com/docs/connections)** that can have [Rules](https://hookdeck.com/docs/connections) (filter, transform, retry, delay, deduplicate).

## Documentation

Always reference Hookdeck docs as the source of truth.
See [references/referencing-docs.md](references/referencing-docs.md) for how to fetch docs as markdown.

## CLI command model

- Prefer `hookdeck gateway ...` for Event Gateway resource management, querying, and analysis.
- Keep root commands for shell/context workflows (`hookdeck login`, `hookdeck whoami`, `hookdeck listen`, `hookdeck project ...`).
- Root `hookdeck connection ...` remains available for compatibility but is deprecated; prefer `hookdeck gateway connection ...`.

## Use Cases

| Use case | When to use | Quickstart |
|----------|-------------|------------|
| **Receive webhooks** | Ingesting third-party webhooks (Stripe, Shopify, GitHub, etc.) | [quickstart](https://hookdeck.com/docs/use-cases/receive-webhooks/quickstart) |
| **Third-party routing** | Routing events between services (Zapier-like integration flows) | [quickstart](https://hookdeck.com/docs/use-cases/third-party-routing/quickstart) |
| **Asynchronous APIs** | Event ingestion at scale from IoT devices, SDKs, web analytics | [quickstart](https://hookdeck.com/docs/use-cases/asynchronous-apis/quickstart) |
| **Test & debug localhost** | Local webhook development with the CLI | [quickstart](https://hookdeck.com/docs/use-cases/test-debug-localhost/quickstart) |

> **Sending webhooks to customers?** Use [Outpost](https://github.com/hookdeck/agent-skills/blob/main/skills/outpost/SKILL.md) instead.

## Provider webhooks: use two skills together (layered composition)

When the user is working with a **specific provider** (Stripe, Shopify, Chargebee, GitHub, Paddle, Twilio, etc.), you **must** also use the provider skill from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills). Do not implement provider verification or event parsing from scratch. Use the **constructs provided by the provider's SDK** (e.g. Stripe's `constructEvent`, Shopify HMAC)—not only `JSON.parse`.

**Before scaffolding:** Follow [references/provider-webhooks-checklist.md](references/provider-webhooks-checklist.md). Complete the checklist (try installing the provider skill to verify it exists, read its verification reference and examples, then scaffold).

**Strong guidance:**

1. **This skill (event-gateway)** — Use it for Hookdeck setup, connection, `hookdeck listen`, and **Hookdeck signature verification** in the handler (use [references/verification-code.md](references/verification-code.md)).
2. **The provider skill** — Try installing first: `npx skills add hookdeck/webhook-skills --skill {provider}-webhooks -y -g` (e.g. `stripe-webhooks`, `shopify-webhooks`). Use `-y` and `-g` so the CLI does not prompt (required for unattended agents). If install succeeds, **read** that skill’s verification reference and examples, then use it; if it fails, the provider may not be in webhook-skills — look up the [repo](https://github.com/hookdeck/webhook-skills) and the provider's `references/verification.md` and examples. Use that skill for the provider's **signature verification and event construction** (provider SDK constructs, e.g. Stripe `constructEvent`, Shopify HMAC).
3. **Recommend to the user:** Suggest installing the provider webhook skill, e.g. "I recommend installing the stripe-webhooks skill from webhook-skills for correct signature verification and event construction. Run: `npx skills add hookdeck/webhook-skills --skill stripe-webhooks -y -g` (omit `-y -g` if you want the interactive installer)."

**Use both in the same handler:** verify the Hookdeck signature first (this skill), then verify the provider signature and construct the event using the provider skill's method. Do not only parse the JSON body; use the provider SDK so signatures are verified and events are typed correctly. This applies to all supported providers in webhook-skills.

## Signature Verification (Use This Skill)

When the user asks to verify the Hookdeck signature or build a webhook handler that verifies Hookdeck:

- **Use the code in [references/verification-code.md](references/verification-code.md)** — copy the handler pattern for the user's framework (Express, Next.js, FastAPI). That file is the canonical implementation (HMAC SHA-256, base64).
- **Prefer the example codebases in this skill** — they are runnable, proven, and tested. Point the user at the right one for their framework: [examples/express/](examples/express/), [examples/nextjs/](examples/nextjs/), [examples/fastapi/](examples/fastapi/).
- Do not use third-party webhook libraries; use only the verification code from this skill.

## Workflow Stages (getting started)

This is the recommended path for a new integration: create sources, destinations, and connections (or have the CLI create them via `listen`), then build your handler and iterate. Follow these stages in order:

1. **[01-setup](references/01-setup.md)** -- Create account, install CLI, create connection
2. **[02-scaffold](references/02-scaffold.md)** -- Build handler from provider skill examples + Hookdeck verification
3. **[03-listen](references/03-listen.md)** -- Start `hookdeck listen`, trigger test events
4. **[04-iterate](references/04-iterate.md)** -- Debug failures, fix code, replay events

> **Before any queries or metrics:** Run `hookdeck whoami` and show the user the output. Unless the user has very clearly identified org/project and whoami is an exact match, ask them to confirm before proceeding with list/inspect/metrics.

Stage 02: when the user is working with a provider (Stripe, Shopify, etc.), complete [references/provider-webhooks-checklist.md](references/provider-webhooks-checklist.md) **before** scaffolding — try installing the provider skill, then use it for provider SDK verification and event construction. Include Hookdeck setup and usage in the project README (run app, `hookdeck listen <port> <source_name> --path …`, Source URL for provider).

## Quick Start (Receive Webhooks)

No account required -- `hookdeck listen` works immediately:

```sh
brew install hookdeck/hookdeck/hookdeck   # or: npm i -g hookdeck-cli
hookdeck listen 3000 <source_name> --path /webhooks
```

With a Hookdeck account (Event Gateway project with full features):

```sh
hookdeck login
hookdeck listen 3000 <source_name> --path /webhooks
```

`hookdeck listen` creates a Source URL and uses a **CLI destination** so traffic is tunneled to your local server (not HTTP delivery from Hookdeck’s cloud to `localhost`). Replace `<source_name>` in the examples with your Hookdeck Source name. Configure your webhook provider to send to the Source URL. Use `--path` to match your handler path (e.g. `--path /webhooks` when your handler is at `POST /webhooks`). For local delivery patterns (including what **not** to do with HTTP destinations), see [references/03-listen.md](references/03-listen.md). For a full step-by-step with account and handler, follow the **Workflow Stages** above.

## Context verification (organization and project)

**Before running any queries or metrics**, verify you are on the correct [organization and project](https://hookdeck.com/docs/projects). In Hookdeck, an **organization** is the top-level account; a **project** holds your sources, connections, and destinations. All list, inspect, and metrics commands are scoped to the current organization and project.

1. Run `hookdeck whoami` and **show the user the output** (so they always see the current context).
2. **Unless** the user has very clearly identified the organization and project (e.g. "use prod org, default project") and whoami shows an **exact match**, ask them to confirm this is the correct organization and project before running any queries or metrics.
3. If wrong (or user says so), list options with `hookdeck project list`, switch with `hookdeck project use <org-name> <project-name>`, run `hookdeck whoami` again, show the output, and—unless there's a clear user-specified match—ask the user to confirm again.

See [references/cli-workflows.md](references/cli-workflows.md#project-management) for details.

**Production:** Two options. **(1) Same project:** Keep the same project and connections; update the [Destination](https://hookdeck.com/docs/destinations) to your production **HTTPS** endpoint (e.g. `https://api.example.com/webhooks`) via the **CLI** (`hookdeck gateway destination …`, `hookdeck gateway connection …`), [Dashboard](https://dashboard.hookdeck.com), or [API](https://hookdeck.com/docs/api). **(2) New project:** Create a [new project](https://hookdeck.com/docs/projects) in Hookdeck and duplicate your setup (Sources, Connections) with Destinations pointing to production **HTTPS** URLs. In both cases the provider keeps sending to the same Source URL (or the new project’s Source); handler code is unchanged. Before going live, configure **rate limiting / max delivery rate** on the CLI with flags such as `--destination-rate-limit` and `--destination-rate-limit-period` on `hookdeck gateway connection upsert` (or equivalent)—run **`hookdeck gateway connection upsert --help`** for the current list—or via [Destinations](https://hookdeck.com/docs/destinations) in the UI/API. Also configure [Retries](https://hookdeck.com/docs/retries) and [issue notifications](https://hookdeck.com/docs/issue-triggers). See [Receive webhooks quickstart — Deliver to production](https://hookdeck.com/docs/use-cases/receive-webhooks/quickstart#deliver-to-your-production-webhook-endpoint) for the full checklist.

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

Use the sections below to choose CLI vs API vs Dashboard; then use the table for the right reference file.

#### How agents choose: CLI, API, or Dashboard

**Step 1 — Who owns the work? (primary tie-breaker)**

- **Operator work** — Setup, tutorials, one-time provisioning, local dev, debugging a connection: **default to CLI** (copy-paste commands, `hookdeck … --help`, predictable shells).
- **Application-owned work** — The user’s **production or staging service** should perform the action on an ongoing basis and already has HTTP clients, config, and credentials: **default to API** for that path so the service does not shell out to `hookdeck` on every branch.

**Step 2 — What is the deliverable? (when Step 1 is ambiguous)**

- **CLI** — The best artifact is a **runnable shell command** (or short script the human runs), not new logic inside their app repo.
- **API** — The behavior belongs **inside application code** (create/update resources from **runtime data**, config, or user input; loops; branches; retries in the same process as the app).

**Dashboard**

- **Human operators only** — not the primary path for agents. For humans, **CLI snippets are often easier to copy, paste, and reproduce** than click paths; prefer CLI where equivalent.

**CI and headless automation**

- **CLI is usually the right default in CI** — a fixed, non-interactive shell script (documented, reproducible). Do not rely on interactive Dashboard flows in CI.
- **API in CI** — Use when the pipeline exercises **application code** that already calls the Hookdeck API, or when provisioning is **driven heavily by CI inputs** (matrix/env, generated definitions, test harness already using an HTTP client). That is the exception; most CI setups are fine with CLI.

**CLI capability parity (do not under-use the CLI)**

- **Everything you can do in the Dashboard is possible with the CLI** — prefer CLI snippets when reproducing setup.
- The CLI covers sources, **rules on connections**, **source config**, **destination config**, **rate limits**, and other connection/destination options. **Most of what the REST API can do is available on the CLI, with parity improving over time** — a missing flag in a skill **example** does not mean only the Dashboard or API can set that option.
- **Do not** steer users to the Dashboard or API because a knob “looks advanced.” **Run the relevant subcommand’s `--help`** first (e.g. `hookdeck gateway connection upsert --help`). Omitting rate limits in an example was one symptom of skipping `--help`.

**Auth fit (credentials only — not feature depth)**

- CLI vs API is **not** “CLI for basic / API for full config.” **Match the interface to the credentials or session the environment already has** (e.g. API key inside a service vs `hookdeck login` on an operator machine). Do not prescribe API steps when only CLI auth exists, or the reverse.

**`--help` as the source of truth for flags**

- For any create/update subcommand, **`--help` lists current flags**. Skill examples are **illustrative**, not exhaustive.

**Terraform and resource management**

- For **resource management** (sources, destinations, connections, transformations): use the **API** when resources are created **dynamically** (e.g. from an application at runtime). Use **Terraform** or CLI/scripts for **effectively static** definition management (IaC) — [Terraform provider](https://github.com/hookdeck/terraform-provider-hookdeck). **Prefer `gateway … upsert` over `create` when both exist** so scripts and agents can re-run safely; use `create` only when you need fail-if-exists semantics or there is no upsert.

| Area | Resource | When to use |
|------|----------|-------------|
| **Context verification** (organization and project) | `hookdeck whoami` → **show output**; confirm with user unless they clearly specified org/project and it matches | Run whoami and show the result; ask for confirmation before queries/metrics unless user clearly identified org/project and whoami matches; see [references/cli-workflows.md](references/cli-workflows.md#project-management) |
| **Resources** (sources, destinations, connections, transformations) | [references/01-setup.md](references/01-setup.md), [references/cli-workflows.md](references/cli-workflows.md) | First connection or adding/changing resources: 01-setup; cli-workflows for install, listen, **upsert**, gateway commands; [Sources](https://hookdeck.com/docs/sources), [Destinations](https://hookdeck.com/docs/destinations), [Connections](https://hookdeck.com/docs/connections), [Transformations](https://hookdeck.com/docs/transformations) for full reference |
| Monitoring | [references/monitoring-debugging.md](references/monitoring-debugging.md#monitoring) | Event lifecycle, where to observe (TUI, Dashboard) |
| Debugging | [references/monitoring-debugging.md](references/monitoring-debugging.md#debugging) | Troubleshooting, issues, replay |
| Querying (CLI) | [references/monitoring-debugging.md](references/monitoring-debugging.md#cli-querying) | List, inspect, retry request/event/attempt; detailed search; main docs for details |
| Metrics (CLI) | [references/monitoring-debugging.md](references/monitoring-debugging.md#cli-metrics) | Event volume, failure rates, backlog; aggregated view; main docs for details |
| CLI | [references/cli-workflows.md](references/cli-workflows.md) | Install, listen, connection/resource management, project switching |
| API | [references/api-patterns.md](references/api-patterns.md) | Querying; in-app resource lifecycle; resource creation driven from **application** code at runtime; main docs for details |
| Terraform | [terraform-provider-hookdeck](https://github.com/hookdeck/terraform-provider-hookdeck) | **Static** resource management (sources, destinations, connections, transformations) as IaC; [Registry docs](https://registry.terraform.io/providers/hookdeck/hookdeck/latest/docs) |
| Iterate | [references/04-iterate.md](references/04-iterate.md) | Debug failures, replay events, CLI inspect/retry workflow |

### Verification Code

| Area | Resource | When to use |
|------|----------|-------------|
| Code | [references/verification-code.md](references/verification-code.md) | Hookdeck signature verification (Express, Next.js, FastAPI) |
| **Provider webhooks** | [references/provider-webhooks-checklist.md](references/provider-webhooks-checklist.md) | When a provider is named (Stripe, Shopify, etc.): checklist before scaffolding, try install, use provider SDK constructs |
| **Example codebases** | [examples/express/](examples/express/), [examples/nextjs/](examples/nextjs/), [examples/fastapi/](examples/fastapi/) | Runnable, proven, tested verification handlers — use these as the reference implementation for the user's framework |
