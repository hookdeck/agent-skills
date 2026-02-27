# API Patterns

## Contents

- [Authentication](#authentication)
- [Core Resources](#core-resources)
- [Create a Connection](#create-a-connection)
- [Publish API](#publish-api)
- [Event Inspection](#event-inspection)
- [Bulk Operations](#bulk-operations)
- [Pagination](#pagination)
- [Rate Limits](#rate-limits)

Common patterns for the Hookdeck [REST API](https://hookdeck.com/docs/api). For the full API reference, fetch [/docs/api.md](https://hookdeck.com/docs/api.md).

## Authentication

All API requests require a Bearer token:

```sh
curl https://api.hookdeck.com/$API_VERSION/connections \
  -H "Authorization: Bearer $HOOKDECK_API_KEY"
```

Get your API key from [Dashboard > Settings > Secrets](https://dashboard.hookdeck.com/settings/project/secrets).

To find the current API version, fetch the [OpenAPI spec](https://api.hookdeck.com/latest/openapi) and check the `servers` section.

## Core Resources

| Resource | Create | List | Get | Update | Delete |
|----------|--------|------|-----|--------|--------|
| [Connections](https://hookdeck.com/docs/api/connections.md) | PUT | GET | GET /:id | PUT | DELETE /:id |
| [Sources](https://hookdeck.com/docs/api/sources.md) | POST | GET | GET /:id | PUT /:id | DELETE /:id |
| [Destinations](https://hookdeck.com/docs/api/destinations.md) | POST | GET | GET /:id | PUT /:id | DELETE /:id |
| [Events](https://hookdeck.com/docs/api/inspect.md) | -- | GET | GET /:id | -- | -- |
| [Requests](https://hookdeck.com/docs/api/inspect.md) | -- | GET | GET /:id | -- | -- |

## Create a Connection

Connections use `PUT` (upsert by name):

```sh
curl -X PUT https://api.hookdeck.com/$API_VERSION/connections \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "stripe-to-api",
    "source": {
      "name": "stripe"
    },
    "destination": {
      "name": "my-api",
      "config": {
        "url": "https://api.example.com/webhooks"
      }
    }
  }'
```

**Note:** Destination URL is nested under `config`: `destination.config.url`, not `destination.url`.

## Publish API

Send events programmatically through a separate endpoint:

```sh
curl -X POST https://hkdk.events/v1/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "x-hookdeck-source-name: my-source" \
  -d '{"type": "test.event", "data": {"message": "hello"}}'
```

The Publish API has no rate limit and uses a different base URL (`https://hkdk.events/v1/publish`) from the REST API.

## Event Inspection

List events with filters:

```sh
# Recent events for a specific connection
curl "https://api.hookdeck.com/$API_VERSION/events?webhook_id=web_xxx&status=FAILED" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY"
```

**Note:** The query parameter is `webhook_id`, not `connection_id` (historical naming -- connections were previously called "webhooks"). Connection IDs start with `web_`.

Retry a specific event:

```sh
curl -X POST https://api.hookdeck.com/$API_VERSION/events/{event_id}/retry \
  -H "Authorization: Bearer $HOOKDECK_API_KEY"
```

## Bulk Operations

Bulk retry failed events:

```sh
curl -X POST https://api.hookdeck.com/$API_VERSION/bulk/events/retry \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": {"webhook_id": "web_xxx", "status": "FAILED"}}'
```

Estimate before executing:

```sh
curl -X POST https://api.hookdeck.com/$API_VERSION/bulk/events/retry/plan \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": {"webhook_id": "web_xxx", "status": "FAILED"}}'
```

For full bulk operations reference, fetch [/docs/api/bulk.md](https://hookdeck.com/docs/api/bulk.md).

## Pagination

The API uses cursor-based pagination:

```sh
# First page
curl "https://api.hookdeck.com/$API_VERSION/events?limit=25" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY"

# Response includes pagination.next cursor
# Use it for the next page
curl "https://api.hookdeck.com/$API_VERSION/events?limit=25&next=cursor_xxx" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY"
```

## Rate Limits

- REST API: 240 requests per minute
- Publish API: No rate limit

## Documentation

- [API overview](https://hookdeck.com/docs/api.md)
- [Connections API](https://hookdeck.com/docs/api/connections.md)
- [Inspect API (requests, events, attempts)](https://hookdeck.com/docs/api/inspect.md)
- [Bulk operations](https://hookdeck.com/docs/api/bulk.md)
- [Publish API](https://hookdeck.com/docs/api/publish.md)
