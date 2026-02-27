# CLI Workflows

## Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Project Management](#project-management)
- [Listening for Events](#listening-for-events)
- [Connection Management](#connection-management)
- [Gateway resource management](#gateway-resource-management)

For **tasks and simple scripts** (querying, metrics, monitoring, debugging), the CLI is a good first touch point; use it to explore when unsure. For complex scripts, applications, or automation, use the API. When in doubt, start with the CLI to explore. This file covers: installation, listening, connection and resource management, project switching, and querying (list commands and metrics). For the full CLI reference, fetch [/docs/cli.md](https://hookdeck.com/docs/cli.md).

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
hookdeck listen 3000 --path /webhooks
```

For provider-specific paths (e.g. `/webhooks/stripe`):

```sh
hookdeck listen 3000 --path /webhooks/stripe
```

### Multiple Sources

Listen to specific sources:

```sh
hookdeck listen 3000 stripe shopify
```

For the full listen reference, fetch [/docs/cli/listen.md](https://hookdeck.com/docs/cli/listen.md).

## Connection Management

Use `hookdeck gateway connection` (canonical). The root alias `hookdeck connection` is deprecated but still works.

Create a connection with explicit parameters:

```sh
hookdeck gateway connection create \
  --name "stripe-to-api" \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks
```

With Source Authentication:

```sh
hookdeck gateway connection create \
  --name "stripe-verified" \
  --source-name "stripe" \
  --source-type STRIPE \
  --source-webhook-secret "whsec_..." \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks
```

With rules (filter, retry, transform):

```sh
hookdeck gateway connection create \
  --name "filtered" \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "payments" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks \
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
hookdeck gateway connection create ...
hookdeck gateway connection upsert my-conn ...
hookdeck gateway connection update web_xxx ...
hookdeck gateway connection delete web_xxx
hookdeck gateway connection enable|disable|pause|unpause web_xxx
```

**Source** / **sources**:

```sh
hookdeck gateway source list
hookdeck gateway source get src_xxx
hookdeck gateway source create --name x --type WEBHOOK ...
hookdeck gateway source upsert my-source ...
hookdeck gateway source update src_xxx ...
hookdeck gateway source delete|enable|disable src_xxx
hookdeck gateway source count
```

**Destination** / **destinations**:

```sh
hookdeck gateway destination list
hookdeck gateway destination get dst_xxx
hookdeck gateway destination create --name x --type HTTP --url https://...
hookdeck gateway destination upsert my-dest ...
hookdeck gateway destination update dst_xxx ...
hookdeck gateway destination delete|enable|disable dst_xxx
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
hookdeck gateway event cancel|mute evt_xxx
```

**Attempt** / **attempts** (delivery tries for an event):

```sh
hookdeck gateway attempt list --event-id evt_xxx
hookdeck gateway attempt get att_xxx
```

**Metrics** (event/request/attempt/queue/pending/transformations over time): for questions like *which connections had the most events?*, *what's our failure rate?*, or *where is backlog building?*, use `hookdeck gateway metrics` with subcommands `events`, `requests`, `attempts`, `queue-depth`, `pending`, `events-by-issue`, `transformations`. Required: `--start`, `--end`, `--measures`. See [monitoring-debugging.md](monitoring-debugging.md#cli-metrics) or [Metrics docs](https://hookdeck.com/docs/metrics) for examples. For the full CLI metrics reference, fetch [/docs/cli/metrics.md](https://hookdeck.com/docs/cli/metrics.md).

```sh
hookdeck gateway metrics events --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures count,failed_count,error_rate
hookdeck gateway metrics queue-depth --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures max_depth,max_age
```

For full flag and option details, fetch [/docs/cli.md](https://hookdeck.com/docs/cli.md) or the per-command pages: [/docs/cli/source.md](https://hookdeck.com/docs/cli/source.md), [/docs/cli/destination.md](https://hookdeck.com/docs/cli/destination.md), [/docs/cli/transformation.md](https://hookdeck.com/docs/cli/transformation.md), [/docs/cli/request.md](https://hookdeck.com/docs/cli/request.md), [/docs/cli/event.md](https://hookdeck.com/docs/cli/event.md), [/docs/cli/attempt.md](https://hookdeck.com/docs/cli/attempt.md), [/docs/cli/metrics.md](https://hookdeck.com/docs/cli/metrics.md).

## Documentation

- [CLI reference](https://hookdeck.com/docs/cli) (overview; per-command content is served as Markdown)
- [Listen](https://hookdeck.com/docs/cli/listen.md) · [Connection](https://hookdeck.com/docs/cli/connection.md) · [Project](https://hookdeck.com/docs/cli/project.md)
- [Source](https://hookdeck.com/docs/cli/source.md) · [Destination](https://hookdeck.com/docs/cli/destination.md) · [Transformation](https://hookdeck.com/docs/cli/transformation.md) · [Request](https://hookdeck.com/docs/cli/request.md) · [Event](https://hookdeck.com/docs/cli/event.md) · [Attempt](https://hookdeck.com/docs/cli/attempt.md) · [Metrics](https://hookdeck.com/docs/cli/metrics.md)
