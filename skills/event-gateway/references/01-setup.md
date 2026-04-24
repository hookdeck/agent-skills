# 01 -- Setup

## Contents

- [Install the CLI](#install-the-cli)
- [No-Account Mode (Quickest Start)](#no-account-mode-quickest-start)
- [Event Gateway Project Mode](#event-gateway-project-mode)
- [Create a Connection](#create-a-connection)
- [Configure Source Authentication (Optional)](#configure-source-authentication-optional)
- [Environment Variables](#environment-variables)

Get from zero to a working Hookdeck connection. Default path: **receive webhooks**.

**Idempotency:** Where the CLI offers **`hookdeck gateway … upsert`**, **prefer upsert over create** for scripts and agent-generated steps so re-runs stay safe. Use **`create`** only when you need fail-if-exists semantics or there is no upsert.

**Flags:** Skill examples are illustrative. Run **`hookdeck gateway connection upsert --help`** (and other subcommands’ `--help`) for the full list—including **rate limits** (`--destination-rate-limit`, `--destination-rate-limit-period`), rules, and source/destination options. **Everything configurable in the Dashboard is settable via the CLI**; do not assume a knob is Dashboard-only without checking `--help`.

## Install the CLI

```sh
brew install hookdeck/hookdeck/hookdeck
```

Or via npm:

```sh
npm i -g hookdeck-cli
```

Verify:

```sh
hookdeck version
```

See the official [Installation](https://hookdeck.com/docs/cli.md#installation) section (all platforms) and [cli-workflows — prerequisite](cli-workflows.md#hookdeck-cli-prerequisite) for how agents should phrase this in user-facing docs.

## No-Account Mode (Quickest Start)

**Prerequisite:** [Hookdeck CLI installed](cli-workflows.md#hookdeck-cli-prerequisite) (commands also in [Install the CLI](#install-the-cli) above).

No signup required. Run immediately:

```sh
hookdeck listen 3000
```

The CLI creates a Source URL, tunnels to `localhost:3000`, and gives you a TUI for inspecting events plus a link to a web console.

## Event Gateway Project Mode

**Prerequisite:** [Hookdeck CLI installed](cli-workflows.md#hookdeck-cli-prerequisite).

For full features (persistent connections, dashboard, bookmarks, project management):

```sh
hookdeck login
hookdeck listen 3000
```

Or create a [Hookdeck account](https://dashboard.hookdeck.com) first, then log in.

## Create a Connection

**Prerequisite:** [Hookdeck CLI installed](cli-workflows.md#hookdeck-cli-prerequisite).

The simplest approach — **`hookdeck listen`** creates (or attaches to) a **CLI** destination and tunnels to your app. If your webhook handler is at `/webhooks`, use `--path` so the Source URL maps to it:

```sh
hookdeck listen 3000 <source_name> --path /webhooks
```

Replace `<source_name>` with the Hookdeck **Source** name for this flow (e.g. `stripe`); it must match the source on the connection you are forwarding to locally.

(Use `hookdeck listen 3000 <source_name>` without `--path` only if your app serves webhooks at the root path.)

**Do not** manually create **`--destination-type HTTP`** with **`http://localhost:…`** expecting Hookdeck’s cloud to deliver there. For why, and the pre-created CLI pattern, see [03-listen.md](03-listen.md#local-delivery-listen-vs-http-destinations).

For explicit control **before** `listen` (e.g. multiple sources with different paths), use a **CLI** destination and **`upsert`**:

```sh
hookdeck gateway connection upsert stripe-local \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "cli-stripe-local" \
  --destination-type CLI \
  --destination-cli-path /webhooks/stripe
```

Then run `hookdeck listen 3000 <source_name>` (use the same **source** name as in the connection; see [03-listen.md](03-listen.md)).

The CLI outputs your **Source URL** (e.g., `https://hkdk.events/xxx`). Configure your webhook provider to send to this URL.

### Branching by Use Case

**Receive webhooks** (default): One Source per provider, one or more Connections to your API endpoints.

Example with a **public HTTPS** destination (production-style)—not localhost over HTTP from the cloud:

```sh
hookdeck gateway connection upsert stripe-webhooks \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "payments-api" \
  --destination-type HTTP \
  --destination-url https://api.example.com/webhooks/stripe
```

**Third-party routing**: Source receives events, Connection transforms and routes to an external service.

**Asynchronous APIs**: Source receives high-volume events from your own SDKs/devices, Connections fan out to multiple processors.

**Localhost only:** Use `hookdeck listen <port>` (the CLI will prompt for a source name) or `hookdeck listen <port> <source>` to name the source up front — no further setup needed. For multiple providers with different local paths, use one Connection per Source with **CLI** destinations, then listen in a single session (see [03-listen.md](03-listen.md)).

**Production:** **(1) Same project:** Keep the same project and connections; update the destination to your production **HTTPS** URL via **CLI**, [Dashboard](https://dashboard.hookdeck.com), or [API](https://hookdeck.com/docs/api). **(2) New project:** [Create a new project](https://hookdeck.com/docs/projects) and duplicate setup with production **HTTPS** destinations. Before going live: set **rate limits** and other options with CLI flags from **`hookdeck gateway connection upsert --help`** (or update via Dashboard/API), plus [retries](https://hookdeck.com/docs/retries) and [issue triggers](https://hookdeck.com/docs/issue-triggers). See [Receive webhooks quickstart — Deliver to production](https://hookdeck.com/docs/use-cases/receive-webhooks/quickstart#deliver-to-your-production-webhook-endpoint).

See [connection-architecture.md](connection-architecture.md) for detailed patterns (fan-out, fan-in, use-case-specific architectures).

## Configure Source Authentication (Optional, but highly recommended)

If your provider signs webhooks (Stripe, Shopify, GitHub, etc.), configure [Source Authentication](https://hookdeck.com/docs/authentication) so Hookdeck verifies signatures before forwarding.

Local dev with **`listen`**: use a **CLI** destination (same as above)—**not** HTTP to localhost:

```sh
hookdeck gateway connection upsert stripe-verified-local \
  --source-name "stripe" \
  --source-type STRIPE \
  --source-webhook-secret "whsec_..." \
  --destination-name "cli-local" \
  --destination-type CLI \
  --destination-cli-path /webhooks
```

The `--source-type` flag uses a [Source Type](https://hookdeck.com/docs/sources#source-types) preset that auto-configures verification for that provider. See [authentication.md](authentication.md) for all options.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `HOOKDECK_API_KEY` | API key for programmatic access. Found in [Dashboard > Settings > Secrets](https://dashboard.hookdeck.com/settings/project/secrets). |
| `HOOKDECK_WEBHOOK_SECRET` | Signing secret for verifying the [Hookdeck Signature](https://hookdeck.com/docs/authentication#hookdeck-webhook-signature-verification) on forwarded events. Found in the same settings page. |

Set these in your environment or `.env` file. The CLI uses browser-based auth via `hookdeck login` and does not require `HOOKDECK_API_KEY` for interactive CLI use.

## Next Step

Proceed to [02-scaffold.md](02-scaffold.md) to build your webhook handler.
