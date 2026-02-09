# Connection Architecture

How to structure [Connections](https://hookdeck.com/docs/connections) for different use cases. A Connection links a [Source](https://hookdeck.com/docs/sources) to a [Destination](https://hookdeck.com/docs/destinations) with optional [Rules](https://hookdeck.com/docs/connections).

## Core Model

```
Source ──> Connection (with Rules) ──> Destination
```

Every webhook flow in Hookdeck is one or more Connections. The Source provides an ingestion URL (`https://hkdk.events/xxx`); the Destination is where events are delivered.

## Patterns

### Fan-Out (One Source, Multiple Destinations)

One Source can have multiple Connections, each routing to a different Destination. Use this when multiple services need the same webhooks.

```
Stripe Source ──> Connection A ──> Payments Service
              ──> Connection B ──> Analytics Service
              ──> Connection C ──> Notification Service
```

Each Connection can have different Rules (e.g., Connection A filters for `payment_intent.*`, Connection C filters for `charge.failed`).

### Fan-In (Multiple Sources, One Destination)

Multiple Sources can route to the same Destination via separate Connections. Use this when one service handles webhooks from multiple providers.

```
Stripe Source  ──> Connection A ──> Webhook Handler
Shopify Source ──> Connection B ──> Webhook Handler
GitHub Source  ──> Connection C ──> Webhook Handler
```

### Use-Case-Specific Architectures

**Receive webhooks** (most common):

One Source per provider, one Connection to your API. Optionally add filters and transforms per Connection.

```sh
hookdeck connection create \
  --name "stripe-to-api" \
  --source-name "stripe" \
  --source-type STRIPE \
  --source-webhook-secret "whsec_..." \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks/stripe
```

**Third-party routing**:

Source receives events from service A, Connection transforms the payload and routes to service B.

```sh
hookdeck connection create \
  --name "crm-to-email" \
  --source-name "crm-events" \
  --source-type WEBHOOK \
  --destination-name "email-service" \
  --destination-type HTTP \
  --destination-url https://email-service.example.com/hooks \
  --rule-transform-code 'addHandler("transform", (request, context) => {
    request.body = { email: request.body.contact.email, event: request.body.type };
    return request;
  })'
```

**Asynchronous APIs**:

High-volume Source receives events from your own SDKs or devices. Multiple Connections fan out to different processing services.

```sh
# Source for all device events
hookdeck connection create \
  --name "devices-to-processor" \
  --source-name "device-events" \
  --source-type WEBHOOK \
  --destination-name "event-processor" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/process \
  --rules '[{"type":"filter","body":{"type":{"$in":["telemetry","heartbeat"]}}}]'
```

## Decision Tree

| Situation | Pattern |
|-----------|---------|
| One provider, one handler | Single Connection |
| One provider, multiple handlers | Fan-out (one Source, multiple Connections) |
| Multiple providers, one handler | Fan-in (multiple Sources, one Destination) |
| Route between services | Source -> Transform -> External Destination |
| High-volume ingestion | Source -> Fan-out with Filters to specialized processors |

## Documentation

- [Connections](https://hookdeck.com/docs/connections)
- [Sources](https://hookdeck.com/docs/sources)
- [Destinations](https://hookdeck.com/docs/destinations)
