# Terminology & Gotchas

Hookdeck-specific terminology and common mistakes agents and developers encounter.

## Terminology

Always use these exact terms when working with the Hookdeck Event Gateway.

| Correct term | Description | NOT |
|-------------|-------------|-----|
| **[Source Authentication](https://hookdeck.com/docs/authentication)** | Feature for authenticating inbound requests at the Source. Encompasses signature verification, Basic Auth, and API Key. | "Source Verification" (even though the API property is `source.verification`) |
| **[Source Types](https://hookdeck.com/docs/sources#source-types)** | Platform presets (Stripe, Shopify, GitHub) that auto-configure Source Authentication | "source templates", "source providers" |
| **[Destination Authentication](https://hookdeck.com/docs/authentication#destination-authentication)** | How Hookdeck authenticates to your application when forwarding events | "Destination Verification" |
| **[Hookdeck Signature](https://hookdeck.com/docs/authentication#hookdeck-webhook-signature-verification)** | The `x-hookdeck-signature` HMAC-SHA256 header Hookdeck adds to forwarded requests | "webhook signature" (ambiguous -- could mean the provider's signature) |
| **[Connection](https://hookdeck.com/docs/connections)** | The route between a Source and a Destination, with optional Rules | "route", "pipeline", "channel" |
| **[Event](https://hookdeck.com/docs/events)** | A processed, routed webhook delivery within Hookdeck | "message", "notification" |
| **[Request](https://hookdeck.com/docs/requests)** | The raw inbound webhook received by a Source | "incoming webhook" (when referring to the Hookdeck data model) |
| **[Attempt](https://hookdeck.com/docs/events)** | A single delivery try to a Destination | "delivery" (when referring to the Hookdeck data model) |
| **[Rules](https://hookdeck.com/docs/connections)** | Processing logic on a Connection: filter, transform, retry, delay, deduplicate | "middleware", "plugins" |

## Common Gotchas

### Connection IDs start with `web_`

Connection IDs use the prefix `web_` (e.g., `web_abc123`), not `conn_` or `connection_`. This is historical -- Connections were previously called "webhooks" in the API. The query parameter for filtering by connection is also `webhook_id`, not `connection_id`.

### Hookdeck Signatures are base64, not hex

The `x-hookdeck-signature` header is HMAC SHA-256 encoded in **base64**. Use `.digest('base64')` (Node.js) or `base64.b64encode()` (Python), not hex encoding.

### Raw body required for signature verification

You must verify against the **raw request body** bytes, not parsed JSON. In Express, use `express.raw({ type: 'application/json' })` instead of `express.json()`. In Next.js App Router, use `request.text()`. In FastAPI, use `request.body()`.

### `source.verification` vs "Source Authentication"

The API model uses `source.verification` as the JSON property name for configuring Source Authentication. But the feature name in docs and UI is "Source Authentication." Use the correct feature name in descriptions, use the correct property name in code.

### Transformation rule type is `transformation`, not `transform`

In the API, the rule type for transformations is `"type": "transformation"`, not `"type": "transform"`.

### Destination URL is nested under config

When creating Connections via the API, the destination URL is at `destination.config.url`, not `destination.url`:

```json
{
  "destination": {
    "name": "my-api",
    "config": {
      "url": "https://api.example.com/webhooks"
    }
  }
}
```

### Deduplicate rule has no `strategy` field

Unlike retries, the deduplicate rule uses `window`, `include_fields`, and `exclude_fields` -- there is no `strategy` field.

### Publish API uses a different base URL

The [Publish API](https://hookdeck.com/docs/publish) endpoint is `https://hkdk.events/v1/publish`, separate from the REST API base URL (`https://api.hookdeck.com/`).

### Timing-safe comparison for signatures

Always use `crypto.timingSafeEqual` (Node.js) or `hmac.compare_digest` (Python) for signature comparison to prevent timing attacks.
