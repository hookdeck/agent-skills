# CLI Workflows

## Contents

- [Hookdeck CLI prerequisite](#hookdeck-cli-prerequisite)
- [Installation](#installation)
- [Authentication](#authentication)
- [Project Management](#project-management)
- [Listening for Events](#listening-for-events)
- [Connection Management](#connection-management)
- [Gateway resource management](#gateway-resource-management)

**When to use CLI vs API vs Dashboard:** see **[SKILL.md — Development & Operations](../SKILL.md#development--operations)** (canonical guidance for agents). This file covers installation, listening, connection and resource management, project switching, and querying. For the full CLI reference, fetch [/docs/cli.md](https://hookdeck.com/docs/cli.md).

**Command model:** use `hookdeck gateway ...` as the default for Event Gateway operations. Root commands remain for shell/context tasks (`login`, `whoami`, `listen`, `project`), and root `hookdeck connection ...` is a deprecated compatibility alias.

Prefer **`hookdeck gateway … upsert`** over `create` when both exist so workflows are idempotent; run **`--help`** on each subcommand for the full flag list (rate limits, rules, source/destination options).

## Hookdeck CLI prerequisite {#hookdeck-cli-prerequisite}

**Canonical rule for agents:** Before you **run** or **document** any `hookdeck …` command for the user (`listen`, `login`, `gateway …`, etc.), **ensure the Hookdeck CLI is installed** and **say so in user-facing text** (README, runbook, chat) the first time such a command appears—do not assume `hookdeck` is on PATH.

**Copy-paste install examples:** `brew install hookdeck/hookdeck/hookdeck` or `npm i -g hookdeck-cli`. More options (devDependency, `npx hookdeck`, verify with `hookdeck version`) are in [Installation](#installation) below.

**Official install (all platforms):** [hookdeck.com/docs/cli.md#installation](https://hookdeck.com/docs/cli.md#installation) — same content as the [CLI overview](https://hookdeck.com/docs/cli); the full CLI reference lives on that page / in [cli.md](https://hookdeck.com/docs/cli.md).

**In-repo (commands + context):** [01-setup — Install the CLI](01-setup.md#install-the-cli).

## Installation

```sh
brew install hookdeck/hookdeck/hookdeck
```

Or via npm:

```sh
npm i -g hookdeck-cli
```

Or as a project dependency:

```sh
npm i hookdeck-cli --save-dev
npx hookdeck --help
```

Verify:

```sh
hookdeck version
```

## Authentication

```sh
hookdeck login     # Browser-based login
hookdeck logout    # Clear credentials
hookdeck whoami    # Show current user and project
```

## Project Management {#project-management}

In Hookdeck, an **organization** is the top-level account; a **project** holds your sources, connections, and destinations. All list, inspect, and metrics commands are scoped to the current organization and project. **Verify before any queries or metrics:** run whoami and **show the user the output**. Unless the user has very clearly identified the organization and project (e.g. "use prod org, default project") and whoami shows an **exact match**, ask them to confirm before running queries or metrics. See [Projects](https://hookdeck.com/docs/projects) for details.

**Check current context:**

```sh
hookdeck whoami
```

Output shows the current user, organization, and project. **Always show this output to the user.** Unless they have clearly specified org/project and it matches, ask them to confirm it is the correct organization and project before running any queries or metrics. If the user says it's wrong (or you see a different organization or project than they asked for), switch before querying.

**List available organizations and projects:**

```sh
hookdeck project list
```

**Switch to a specific organization and project:**

```sh
hookdeck project use <org-name> <project-name>
```

Example: `hookdeck project use prod "Default Project"`. Then run `hookdeck whoami` again to confirm.

For the full project reference, fetch [/docs/cli/project.md](https://hookdeck.com/docs/cli/project.md).

## Listening for Events

`hookdeck listen` is the primary command. It creates a tunnel from a public Hookdeck URL to your local server.

### No-Account Mode

No signup required:

```sh
hookdeck listen 3000
```

Provides tunneling, CLI TUI for inspection, and a web console link.

### Event Gateway Project Mode

After logging in, `hookdeck listen` uses your Event Gateway project with persistent connections and full Dashboard access:

```sh
hookdeck login
hookdeck listen 3000
```

### Path-Specific Tunneling

When your webhook handler is at a path like `/webhooks`, use `--path` so the Source URL maps to it:

```sh
hookdeck listen 3000 <source_name> --path /webhooks
```

For provider-specific paths (e.g. `/webhooks/stripe`):

```sh
hookdeck listen 3000 <source_name> --path /webhooks/stripe
```

### Multiple Sources

Listen to specific sources (comma-separated in the `[source]` argument; see `hookdeck listen --help`):

```sh
hookdeck listen 3000 stripe,shopify
```

For the full listen reference, fetch [/docs/cli/listen.md](https://hookdeck.com/docs/cli/listen.md).

## Connection Management

Use `hookdeck gateway connection` (canonical). The root alias `hookdeck connection` is deprecated but still works.

**Local dev with `hookdeck listen`:** use a **CLI** destination (or let `listen` create one)—**not** `--destination-type HTTP` with `http://localhost:…` (Hookdeck’s cloud cannot deliver to loopback). See [03-listen.md](03-listen.md#local-delivery-listen-vs-http-destinations).

**Production / public HTTP destinations:** URLs must be **publicly reachable HTTPS** (or equivalent). Example uses **`upsert`** so the command is idempotent:

```sh
hookdeck gateway connection upsert stripe-to-api \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url https://api.example.com/webhooks
```

With Source Authentication:

```sh
hookdeck gateway connection upsert stripe-verified \
  --source-name "stripe" \
  --source-type STRIPE \
  --source-webhook-secret "whsec_..." \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url https://api.example.com/webhooks
```

With rules (filter, retry, transform) and optional rate limiting (verify exact flags with `hookdeck gateway connection upsert --help`):

```sh
hookdeck gateway connection upsert filtered \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "payments" \
  --destination-type HTTP \
  --destination-url https://api.example.com/webhooks \
  --destination-rate-limit 100 \
  --destination-rate-limit-period minute \
  --rules '[{"type":"filter","body":{"type":{"$eq":"payment_intent.succeeded"}}}]'
```

List, pause, and unpause connections:

```sh
hookdeck gateway connection list
hookdeck gateway connection pause web_xxx
hookdeck gateway connection unpause web_xxx
```

For the full connection reference, fetch [/docs/cli/connection.md](https://hookdeck.com/docs/cli/connection.md).

## Gateway resource management

Event Gateway resources (sources, destinations, connections, transformations, and the request→event→attempt flow) are managed under `hookdeck gateway`. Use these commands for scripting, CI, or when you need to inspect or retry without the Dashboard.

**Connection** (canonical form; `hookdeck connection` at root is a deprecated alias):

```sh
hookdeck gateway connection list
hookdeck gateway connection get web_xxx
hookdeck gateway connection upsert my-conn --source-name my-source --source-type WEBHOOK --destination-name my-dest --destination-type HTTP --destination-url https://example.com
hookdeck gateway connection create --source-name my-source --source-type WEBHOOK --destination-name my-dest --destination-type HTTP --destination-url https://example.com
hookdeck gateway connection update web_xxx --description "Updated"
hookdeck gateway connection delete web_xxx
hookdeck gateway connection enable web_xxx
hookdeck gateway connection disable web_xxx
hookdeck gateway connection pause web_xxx
hookdeck gateway connection unpause web_xxx
```

**Source** / **sources**:

```sh
hookdeck gateway source list
hookdeck gateway source get src_xxx
hookdeck gateway source create --name x --type WEBHOOK
hookdeck gateway source upsert my-source --type WEBHOOK
hookdeck gateway source update src_xxx --name new-name
hookdeck gateway source delete src_xxx
hookdeck gateway source enable src_xxx
hookdeck gateway source disable src_xxx
hookdeck gateway source count
```

**Destination** / **destinations**:

```sh
hookdeck gateway destination list
hookdeck gateway destination get dst_xxx
hookdeck gateway destination create --name x --type HTTP --url https://example.com
hookdeck gateway destination upsert my-dest --type HTTP --url https://example.com
hookdeck gateway destination update dst_xxx --name new-name
hookdeck gateway destination delete dst_xxx
hookdeck gateway destination enable dst_xxx
hookdeck gateway destination disable dst_xxx
hookdeck gateway destination count
```

**Transformation** / **transformations**:

```sh
hookdeck gateway transformation list
hookdeck gateway transformation get tfm_xxx
hookdeck gateway transformation create --name x --code "..."
hookdeck gateway transformation upsert my-transform ...
hookdeck gateway transformation run --id tfm_xxx --request '{}'
hookdeck gateway transformation executions list tfm_xxx
```

**Request** / **requests** (raw inbound webhooks; first in data flow):

```sh
hookdeck gateway request list
hookdeck gateway request get req_xxx
hookdeck gateway request retry req_xxx
hookdeck gateway request events req_xxx
hookdeck gateway request ignored-events req_xxx
hookdeck gateway request raw-body req_xxx
```

**Event** / **events** (processed deliveries):

```sh
hookdeck gateway event list
hookdeck gateway event list --status FAILED --limit 20
hookdeck gateway event get evt_xxx
hookdeck gateway event retry evt_xxx
hookdeck gateway event raw-body evt_xxx
hookdeck gateway event mute evt_xxx
hookdeck gateway event cancel evt_xxx
```

**Attempt** / **attempts** (delivery tries for an event):

```sh
hookdeck gateway attempt list --event-id evt_xxx
hookdeck gateway attempt get att_xxx
```

**Metrics** (events, requests, attempts, transformations over time): for questions like *which connections had the most events?*, *what's our failure rate?*, or *where is backlog building?*, use `hookdeck gateway metrics` with subcommands `events`, `requests`, `attempts`, `transformations`. Required: `--start`, `--end`, `--measures`. See [monitoring-debugging.md](monitoring-debugging.md#cli-metrics) or [Metrics docs](https://hookdeck.com/docs/metrics) for examples. For the full CLI metrics reference, fetch [/docs/cli/metrics.md](https://hookdeck.com/docs/cli/metrics.md).

```sh
hookdeck gateway metrics events --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures count,failed_count,error_rate
hookdeck gateway metrics attempts --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures count,response_latency_avg
```

For full flag and option details, fetch [/docs/cli.md](https://hookdeck.com/docs/cli.md) or the per-command pages: [/docs/cli/source.md](https://hookdeck.com/docs/cli/source.md), [/docs/cli/destination.md](https://hookdeck.com/docs/cli/destination.md), [/docs/cli/transformation.md](https://hookdeck.com/docs/cli/transformation.md), [/docs/cli/request.md](https://hookdeck.com/docs/cli/request.md), [/docs/cli/event.md](https://hookdeck.com/docs/cli/event.md), [/docs/cli/attempt.md](https://hookdeck.com/docs/cli/attempt.md), [/docs/cli/metrics.md](https://hookdeck.com/docs/cli/metrics.md).

## Documentation

- [CLI reference](https://hookdeck.com/docs/cli) (overview; per-command content is served as Markdown)
- [Listen](https://hookdeck.com/docs/cli/listen.md) · [Connection](https://hookdeck.com/docs/cli/connection.md) · [Project](https://hookdeck.com/docs/cli/project.md)
- [Source](https://hookdeck.com/docs/cli/source.md) · [Destination](https://hookdeck.com/docs/cli/destination.md) · [Transformation](https://hookdeck.com/docs/cli/transformation.md) · [Request](https://hookdeck.com/docs/cli/request.md) · [Event](https://hookdeck.com/docs/cli/event.md) · [Attempt](https://hookdeck.com/docs/cli/attempt.md) · [Metrics](https://hookdeck.com/docs/cli/metrics.md)
