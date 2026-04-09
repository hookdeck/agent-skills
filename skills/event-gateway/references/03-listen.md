# 03 -- Listen for Events

Start receiving webhooks locally with `hookdeck listen`.

## Local delivery: `listen` vs HTTP destinations {#local-delivery-listen-vs-http-destinations}

| Pattern | What to do |
|--------|------------|
| **Auto** | `hookdeck listen <port> <source_name> --path /webhooks/...` — creates or uses a **CLI** destination and tunnels to your local server. |
| **Pre-created** | `hookdeck gateway connection upsert …` with `--destination-type CLI` and `--destination-cli-path` matching your handler path, then `hookdeck listen <port> <source_name>` (see [Multi-Provider Routing](#multi-provider-routing-per-source-paths) below). |
| **Do not** | **`--destination-type HTTP` with `http://localhost:…`** (or any URL Hookdeck’s cloud cannot reach) **as if** Hookdeck will POST there from the cloud—and **do not** pair that broken pattern with `hookdeck listen` as a “fix.” **`listen` is for CLI destinations**, not HTTP-to-localhost delivery. |

**Never use an HTTP destination type pointing at localhost for Gateway cloud delivery.** For real HTTP destinations, use a **publicly reachable** URL (deployed host, tunnel, etc.).

## No Account Required

`hookdeck listen` works without any Hookdeck account. No signup, no login -- just tunneling, inspection, and replay:

```sh
hookdeck listen 3000
```

This creates a public Source URL, tunnels to `localhost:3000`, and opens a TUI (terminal UI) for inspecting events.

## With an Event Gateway Project

After `hookdeck login`, `hookdeck listen` runs in Event Gateway mode with persistent connections, project management, and full Dashboard access:

```sh
hookdeck login
hookdeck listen 3000
```

## Path-Specific Tunneling

When your webhook handler is not at the root path, use `--path` so the Source URL maps to that path. For a handler at `POST /webhooks`, use:

```sh
hookdeck listen 3000 <source_name> --path /webhooks
```

For provider-specific paths (e.g. `/webhooks/stripe`):

```sh
hookdeck listen 3000 <source_name> --path /webhooks/stripe
```

## Multiple Sources

Listen to multiple sources in one session by passing **comma-separated** source names in the `[source]` argument (see `hookdeck listen --help`).

```sh
hookdeck listen 3000 stripe,shopify --path /webhooks
```

## Multi-Provider Routing (Per-Source Paths)

When receiving webhooks from multiple providers and each needs a different local path, create one Connection per Source with its own CLI Destination path.

### Configure Connections

In the [Hookdeck Dashboard](https://dashboard.hookdeck.com), create one Connection per Source (for example `slack` and `github`) and set distinct CLI Destination paths (`/slack`, `/github`).

Or create them with the CLI (prefer **`upsert`** so re-runs stay idempotent):

```sh
hookdeck gateway connection upsert slack-local \
  --source-name "slack" \
  --source-type WEBHOOK \
  --destination-name "cli-slack-local" \
  --destination-type CLI \
  --destination-cli-path /slack

hookdeck gateway connection upsert github-local \
  --source-name "github" \
  --source-type WEBHOOK \
  --destination-name "cli-github-local" \
  --destination-type CLI \
  --destination-cli-path /github
```

### Listen in One Session

Listen to specific sources in one session:

```sh
hookdeck listen 3000 slack,github
```

Or listen to all sources:

```sh
hookdeck listen 3000 '*'
```

Each Source routes to its configured local destination path (`localhost:3000/slack`, `localhost:3000/github`).

## CLI TUI (Terminal UI)

When `hookdeck listen` is running, the CLI shows an embedded terminal interface:

- **Event list**: All received events, updated in real time
- **Inspect**: Select an event to view the full request and response (headers, body, status)
- **Replay**: Replay any event directly from the terminal

This is always available, regardless of whether you have an account.

## Web UI

The CLI provides a link to a web interface for event inspection:

- **Without an Event Gateway project**: The web console provides event inspection and replay in a browser.
- **With an Event Gateway project**: You use the [Hookdeck Dashboard](https://dashboard.hookdeck.com) with full features -- events, requests, bookmarks, replay, project management, and more.

## Triggering Test Events

### From Your Provider

Most providers have a "Send test webhook" button in their dashboard. Use this with your Hookdeck Source URL.

### Via cURL

Send a test event directly to your Source URL:

```sh
curl -X POST https://hkdk.events/YOUR_SOURCE_ID \
  -H "Content-Type: application/json" \
  -d '{"type": "test.event", "data": {"message": "hello"}}'
```

### Via the Publish API

Send events programmatically through the [Publish API](https://hookdeck.com/docs/publish):

```sh
curl -X POST https://hkdk.events/v1/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "x-hookdeck-source-name: my-source" \
  -d '{"type": "test.event", "data": {"message": "hello"}}'
```

## Next Step

Proceed to [04-iterate.md](04-iterate.md) to debug and iterate on your handler.
