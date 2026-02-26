# 01 -- Setup

## Contents

- [Install the CLI](#install-the-cli)
- [No-Account Mode (Quickest Start)](#no-account-mode-quickest-start)
- [Event Gateway Project Mode](#event-gateway-project-mode)
- [Create a Connection](#create-a-connection)
- [Configure Source Authentication (Optional)](#configure-source-authentication-optional)
- [Environment Variables](#environment-variables)

Get from zero to a working Hookdeck connection. Default path: **receive webhooks**.

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

See [CLI docs](https://hookdeck.com/docs/cli) for all installation methods.

## No-Account Mode (Quickest Start)

No signup required. Run immediately:

```sh
hookdeck listen 3000
```

The CLI creates a Source URL, tunnels to `localhost:3000`, and gives you a TUI for inspecting events plus a link to a web console.

## Event Gateway Project Mode

For full features (persistent connections, dashboard, bookmarks, project management):

```sh
hookdeck login
hookdeck listen 3000
```

Or create a [Hookdeck account](https://dashboard.hookdeck.com) first, then log in.

## Create a Connection

The simplest approach -- `hookdeck listen` creates one automatically. If your webhook handler is at `/webhooks`, use `--path` so the Source URL maps to it:

```sh
hookdeck listen 3000 --path /webhooks
```

(Use `hookdeck listen 3000` without `--path` only if your app serves webhooks at the root path.)

For explicit control, use `hookdeck gateway connection create`:

```sh
hookdeck gateway connection create \
  --name "stripe-to-api" \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks
```

The CLI outputs your **Source URL** (e.g., `https://hkdk.events/xxx`). Configure your webhook provider to send to this URL.

### Branching by Use Case

**Receive webhooks** (default): One Source per provider, one or more Connections to your API endpoints.

```sh
hookdeck gateway connection create \
  --name "stripe-webhooks" \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "payments-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks/stripe
```

**Third-party routing**: Source receives events, Connection transforms and routes to an external service.

**Asynchronous APIs**: Source receives high-volume events from your own SDKs/devices, Connections fan out to multiple processors.

**Localhost only**: Just use `hookdeck listen <port>` (the CLI will prompt for a source name) or `hookdeck listen <port> <source>` to name the source up front -- no further setup needed. For multiple providers with different local paths, use one Connection per Source with CLI Destination paths, then listen in a single session (see [03-listen.md](03-listen.md)).

**Production:** **(1) Same project:** Keep the same project and connections; update the [Destination](https://hookdeck.com/docs/destinations) to your production HTTPS URL (Dashboard or [API](https://hookdeck.com/docs/api)). **(2) New project:** [Create a new project](https://hookdeck.com/docs/projects) and duplicate setup with Destinations pointing to production HTTPS. Before going live: configure [rate limiting / max delivery rate](https://hookdeck.com/docs/destinations), [retries](https://hookdeck.com/docs/retries), and [issue triggers / notifications](https://hookdeck.com/docs/issue-triggers). See [Receive webhooks quickstart — Deliver to production](https://hookdeck.com/docs/use-cases/receive-webhooks/quickstart#deliver-to-your-production-webhook-endpoint) and the linked docs — Hookdeck docs are the source of truth.

See [connection-architecture.md](connection-architecture.md) for detailed patterns (fan-out, fan-in, use-case-specific architectures).

## Configure Source Authentication (Optional, but highly recommended)

If your provider signs webhooks (Stripe, Shopify, GitHub, etc.), configure [Source Authentication](https://hookdeck.com/docs/authentication) so Hookdeck verifies signatures before forwarding:

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

The `--source-type` flag uses a [Source Type](https://hookdeck.com/docs/sources#source-types) preset that auto-configures verification for that provider. See [authentication.md](authentication.md) for all options.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `HOOKDECK_API_KEY` | API key for programmatic access. Found in [Dashboard > Settings > Secrets](https://dashboard.hookdeck.com/settings/project/secrets). |
| `HOOKDECK_WEBHOOK_SECRET` | Signing secret for verifying the [Hookdeck Signature](https://hookdeck.com/docs/authentication#hookdeck-webhook-signature-verification) on forwarded events. Found in the same settings page. |

Set these in your environment or `.env` file. The CLI uses browser-based auth via `hookdeck login` and does not require `HOOKDECK_API_KEY`.

## Next Step

Proceed to [02-scaffold.md](02-scaffold.md) to build your webhook handler.
