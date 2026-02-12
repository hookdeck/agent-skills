# CLI Workflows

## Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Listening for Events](#listening-for-events)
- [Connection Management](#connection-management)
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

Create a connection with explicit parameters:

```sh
hookdeck connection create \
  --name "stripe-to-api" \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks
```

With Source Authentication:

```sh
hookdeck connection create \
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
hookdeck connection create \
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
hookdeck connection list
hookdeck connection pause web_xxx
hookdeck connection unpause web_xxx
```

For the full connection reference, fetch [/docs/cli/connection.md](https://hookdeck.com/docs/cli/connection.md).

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
