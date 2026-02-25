# Connection Rules

## Contents

- [Overview](#overview)
- [Filters](#filters)
- [Transformations](#transformations)
- [Retries](#retries)
- [Deduplication](#deduplication)
- [Delay](#delay)
- [Decision Tree](#decision-tree)

## Overview

[Rules](https://hookdeck.com/docs/connections) are processing logic attached to a Connection. Each Connection can have multiple Rules. Five types: filter, transform, retry, delay, deduplicate.

## Filters

Accept or reject [Events](https://hookdeck.com/docs/events) based on request properties (body, headers, query, path). Events that don't match the filter are rejected and not delivered.

**Top patterns:**

Filter by event type:

```sh
hookdeck gateway connection create \
  --name "stripe-payments" \
  --source-name "stripe" \
  --source-type WEBHOOK \
  --destination-name "payments" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks \
  --rules '[{"type":"filter","body":{"type":{"$eq":"payment_intent.succeeded"}}}]'
```

Filter by multiple types:

```json
{"type": "filter", "body": {"type": {"$in": ["payment_intent.succeeded", "invoice.paid"]}}}
```

Filter by nested field:

```json
{"type": "filter", "body": {"data": {"object": {"amount": {"$gte": 1000}}}}}
```

Logical operators: `$and`, `$or`, `$not`

```json
{"type": "filter", "$or": [
  {"body": {"type": {"$eq": "payment_intent.succeeded"}}},
  {"body": {"type": {"$eq": "invoice.paid"}}}
]}
```

**Available operators:** `$eq`, `$neq`, `$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte`, `$startsWith`, `$endsWith`, `$exist`

For full operator reference: fetch [/docs/filters.md](https://hookdeck.com/docs/filters.md)

## Transformations

Modify the Event payload, headers, or path using JavaScript (ES6, V8 isolate).

**Handler signature:**

```javascript
addHandler("transform", (request, context) => {
  // request: { headers, body, query, path, parsed_query }
  // context: { env (environment variables) }
  // Return the modified request
  return request;
});
```

**Top patterns:**

Restructure payload:

```javascript
addHandler("transform", (request, context) => {
  request.body = {
    event_type: request.body.type,
    data: request.body.data.object,
    timestamp: new Date().toISOString()
  };
  return request;
});
```

Add headers:

```javascript
addHandler("transform", (request, context) => {
  request.headers['x-api-key'] = context.env.DEST_API_KEY;
  return request;
});
```

Reject conditionally (return `undefined` or falsy to reject):

```javascript
addHandler("transform", (request, context) => {
  if (request.body.test_mode) return; // Reject test events
  return request;
});
```

**CLI usage:**

Inline code:

```sh
--rule-transform-code 'addHandler("transform", (request, context) => { ... return request; })'
```

Named transform (created via Dashboard or API):

```sh
--rule-transform-name my-transform
```

For full reference: fetch [/docs/transformations.md](https://hookdeck.com/docs/transformations.md)

## Retries

Automatically retry failed deliveries (non-2xx responses) with configurable backoff.

**Strategies:**

| Strategy | Behavior |
|----------|----------|
| `linear` | Fixed interval between retries |
| `exponential` | Doubling interval between retries |

**Configuration:**

| Field | Description |
|-------|-------------|
| `strategy` | `linear` or `exponential` |
| `interval` | Base interval in milliseconds |
| `count` | Maximum retry attempts (up to 50) |
| `response_status_codes` | HTTP status codes that trigger retry (default: all non-2xx) |

**CLI example:**

```sh
hookdeck gateway connection create \
  --name "with-retries" \
  --source-name "my-source" \
  --source-type WEBHOOK \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks \
  --rules '[{"type":"retry","strategy":"exponential","interval":60000,"count":5}]'
```

**Manual replay:** Use the CLI TUI, web console, or Dashboard to replay individual events. Use the API for bulk replay -- see [api-patterns.md](api-patterns.md).

For full reference: fetch [/docs/retries.md](https://hookdeck.com/docs/retries.md)

## Deduplication

Prevent duplicate Events from being delivered. Uses a time window to detect duplicates.

**Configuration:**

| Field | Description |
|-------|-------------|
| `window` | Time window in milliseconds to check for duplicates |
| `include_fields` | Specific fields to compare (e.g., `body.id`) |
| `exclude_fields` | Fields to ignore when comparing |

**Top patterns:**

Full payload match (default):

```json
{"type": "deduplicate", "window": 3600000}
```

Field-based deduplication:

```json
{"type": "deduplicate", "window": 3600000, "include_fields": ["body.id", "body.type"]}
```

**CLI example:**

```sh
hookdeck gateway connection create \
  --name "deduped" \
  --source-name "my-source" \
  --source-type WEBHOOK \
  --destination-name "my-api" \
  --destination-type HTTP \
  --destination-url http://localhost:3000/webhooks \
  --rules '[{"type":"deduplicate","window":3600000,"include_fields":["body.id"]}]'
```

For full reference: fetch [/docs/deduplication.md](https://hookdeck.com/docs/deduplication.md)

## Delay

Hold Events for a specified duration before delivery. Useful for rate-limiting or batching scenarios.

```json
{"type": "delay", "delay": 5000}
```

## Decision Tree

| Scenario | Rule |
|----------|------|
| Only process specific event types | Filter |
| Restructure payload before delivery | Transform |
| Add auth headers to destination requests | Transform (with `context.env`) |
| Handle transient destination failures | Retry |
| Rate-limit delivery to a destination | Delay |
| Provider sends duplicate webhooks | Deduplicate |
| Conditionally reject events based on complex logic | Transform (return falsy) |
