# CLI Workflows

## Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Listening for Events](#listening-for-events)
- [Connection Management](#connection-management)
- [Gateway resource management](#gateway-resource-management)
- [Project Management](#project-management)

Common workflows using the Hookdeck CLI. For the full CLI reference, fetch [/docs/cli.md](https://hookdeck.com/docs/cli.md).

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

For full flag and option details, fetch [/docs/cli.md](https://hookdeck.com/docs/cli.md) or the per-command pages: [/docs/cli/source.md](https://hookdeck.com/docs/cli/source.md), [/docs/cli/destination.md](https://hookdeck.com/docs/cli/destination.md), [/docs/cli/transformation.md](https://hookdeck.com/docs/cli/transformation.md), [/docs/cli/request.md](https://hookdeck.com/docs/cli/request.md), [/docs/cli/event.md](https://hookdeck.com/docs/cli/event.md), [/docs/cli/attempt.md](https://hookdeck.com/docs/cli/attempt.md).

## Project Management

Switch between projects:

```sh
hookdeck project list
hookdeck project use my-org my-project
```

For the full project reference, fetch [/docs/cli/project.md](https://hookdeck.com/docs/cli/project.md).

## Documentation

- [CLI reference](https://hookdeck.com/docs/cli)
- [Listen command](https://hookdeck.com/docs/cli/listen)
- [Connection commands](https://hookdeck.com/docs/cli/connection)
- [Project commands](https://hookdeck.com/docs/cli/project)
- [Source](https://hookdeck.com/docs/cli/source) · [Destination](https://hookdeck.com/docs/cli/destination) · [Transformation](https://hookdeck.com/docs/cli/transformation) · [Request](https://hookdeck.com/docs/cli/request) · [Event](https://hookdeck.com/docs/cli/event) · [Attempt](https://hookdeck.com/docs/cli/attempt)
