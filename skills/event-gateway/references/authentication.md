# Authentication

How the Hookdeck Event Gateway authenticates requests -- both inbound (from webhook providers) and outbound (to your application).

## Decision Tree

| Question | Answer |
|----------|--------|
| Want Hookdeck to verify provider signatures before forwarding? | **Source Authentication** |
| Want to verify requests from Hookdeck in your handler? | **Hookdeck Signature** (Destination Authentication) |
| Want maximum security? | **Both** -- Source Authentication at the edge, Hookdeck Signature in your handler |
| Just getting started? | Start with Hookdeck Signature only (simplest setup) |

## Source Authentication (Inbound)

[Source Authentication](https://hookdeck.com/docs/authentication) verifies incoming requests at the [Source](https://hookdeck.com/docs/sources) before they reach your Connection. Requests that fail authentication are rejected.

### Methods

| Method | Use case |
|--------|----------|
| **[Source Types](https://hookdeck.com/docs/sources#source-types)** | Provider presets (Stripe, Shopify, GitHub, etc.) that auto-configure verification. **Default choice.** |
| **API Key** | Provider sends a static key in a header or query parameter |
| **Basic Auth** | Provider sends Basic HTTP credentials |

### Source Types (Recommended)

Source Types are platform presets that auto-configure signature verification for a provider:

```sh
hookdeck connection create \
  --name "stripe-verified" \
  --source-name "stripe" \
  --source-type STRIPE \
  --source-webhook-secret "whsec_..." \
  --destination-name "my-api" \
  --destination-url http://localhost:3000/webhooks
```

When Source Authentication is enabled and verification succeeds, Hookdeck adds `x-hookdeck-verified: true` to the forwarded request. Your handler can check this header to confirm the provider's signature was verified.

For the full list of Source Types, fetch [/docs/sources.md](https://hookdeck.com/docs/sources.md) and look for the Source Types section.

### API Key Authentication

```sh
hookdeck connection create \
  --name "custom-auth" \
  --source-name "my-source" \
  --source-verification '{"type":"api_key","configs":{"header_key":"x-api-key","api_key":"my-secret-key"}}' \
  --destination-name "my-api" \
  --destination-url http://localhost:3000/webhooks
```

### What Happens When Authentication Fails

The request is rejected with a `403` response. It does not create a [Request](https://hookdeck.com/docs/requests) or [Event](https://hookdeck.com/docs/events) in Hookdeck.

## Destination Authentication (Outbound)

[Destination Authentication](https://hookdeck.com/docs/authentication#destination-authentication) controls how Hookdeck authenticates to your application when forwarding events.

### Methods

| Method | Description |
|--------|-------------|
| **Hookdeck Signature** (default) | HMAC SHA-256 signature in `x-hookdeck-signature` header |
| **Custom SHA-256** | Your own signing secret, same HMAC format |
| **Basic Auth** | HTTP Basic credentials |
| **API Key** | Static key in a configurable header |
| **Bearer Token** | Bearer token in the `Authorization` header |

### Hookdeck Signature (Default)

Enabled by default on all Destinations. Hookdeck adds an `x-hookdeck-signature` header (HMAC SHA-256, base64-encoded) to every forwarded request.

Your signing secret is at: [Dashboard > Settings > Secrets](https://dashboard.hookdeck.com/settings/project/secrets)

For verification code, see [verification-code.md](verification-code.md) and [examples/](../examples/).

## Can You Use Both?

Yes. Source Authentication and Destination Authentication serve different purposes:

- **Source Authentication**: Hookdeck verifies the provider's signature (e.g., Stripe's `stripe-signature`) before forwarding
- **Destination Authentication**: Your handler verifies Hookdeck's signature to confirm the request came from Hookdeck

Using both provides defense in depth. See [02-scaffold.md](02-scaffold.md) for the recommended pattern.

## Documentation

- [Authentication overview](https://hookdeck.com/docs/authentication)
- [Source Authentication](https://hookdeck.com/docs/authentication#source-authentication)
- [Source Types](https://hookdeck.com/docs/sources#source-types)
- [Destination Authentication](https://hookdeck.com/docs/authentication#destination-authentication)
- [Hookdeck Signature](https://hookdeck.com/docs/authentication#hookdeck-webhook-signature-verification)
