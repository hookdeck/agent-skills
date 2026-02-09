# Monitoring & Debugging

## Contents

- [Event Lifecycle](#event-lifecycle)
- [Data Model](#data-model)
- [Event Statuses](#event-statuses)
- [Debugging Surfaces](#debugging-surfaces)
- [Troubleshooting Flowchart](#troubleshooting-flowchart)
- [Issues and Notifications](#issues-and-notifications)
- [Replay](#replay)

How to monitor webhook deliveries, debug failures, and replay events.

## Event Lifecycle

1. Webhook provider sends a request to your Source URL (`https://hkdk.events/xxx`)
2. Hookdeck creates a [Request](https://hookdeck.com/docs/requests) (the raw inbound data)
3. Each Connection on that Source creates an [Event](https://hookdeck.com/docs/events) (processed, routed delivery)
4. Hookdeck delivers the Event to the Destination, creating an [Attempt](https://hookdeck.com/docs/events)
5. If delivery fails (non-2xx), Hookdeck retries according to the Connection's retry rules

## Data Model

| Entity | What it is |
|--------|------------|
| [Request](https://hookdeck.com/docs/requests) | Raw inbound webhook received by a Source |
| [Event](https://hookdeck.com/docs/events) | Processed delivery routed through a Connection |
| [Attempt](https://hookdeck.com/docs/events) | A single delivery try to a Destination |

One Request can produce multiple Events (fan-out). Each Event has one or more Attempts.

## Event Statuses

| Status | Meaning |
|--------|---------|
| `SUCCESSFUL` | Destination returned a 2xx response |
| `FAILED` | All retry attempts exhausted, destination still returning non-2xx |
| `QUEUED` | Scheduled for delivery or retry |
| `HOLD` | Paused by a delay rule or manual hold |

## Debugging Surfaces

### CLI TUI

Built into `hookdeck listen`. View events in real time, inspect request/response details, replay events -- all in the terminal.

### Web Console

When not using an Event Gateway project, the CLI provides a link to a web interface for event inspection and replay.

### Dashboard

When using an Event Gateway project, the [Hookdeck Dashboard](https://dashboard.hookdeck.com) provides:

- **Events view**: Inspect Event payloads, headers, response, and Attempts
- **Requests view**: See raw inbound webhooks before routing
- **Issues**: Track patterns of failures (delivery issues, transformation errors, backpressure)
- **Replay**: Re-deliver individual Events or bulk replay filtered sets
- **Bookmarks**: Save representative Requests for repeated testing

### REST API

Use the API programmatically -- see [api-patterns.md](api-patterns.md).

## Troubleshooting Flowchart

**Events not arriving?**

1. Is the provider sending to the correct Source URL?
2. Is `hookdeck listen` running?
3. If Source Authentication is configured, are the credentials correct? Failed auth returns `403` and no Event is created.

**Events arriving but delivery failing?**

1. Check the Attempt response in the CLI TUI or web UI
2. Is your handler running and listening on the correct port?
3. Is the route correct (e.g., `/webhooks` vs `/webhook`)?
4. Is the handler returning a 2xx status? Non-2xx triggers retries.

**Signature verification failing in your handler?**

1. Is `HOOKDECK_WEBHOOK_SECRET` set correctly?
2. Are you using the raw request body (not parsed JSON)?
3. Are you using base64 encoding (not hex)?
4. See [verification-code.md](verification-code.md) for debugging code

## Issues and Notifications

[Issues](https://hookdeck.com/docs/issues) are automatically created when problems are detected:

| Issue type | Trigger |
|------------|---------|
| Delivery | Consecutive failed delivery attempts |
| Transformation | JavaScript errors in transform rules |
| Backpressure | Events queuing faster than they can be delivered |

Issue lifecycle: `OPENED` -> `ACKNOWLEDGED` -> `RESOLVED` or `IGNORED`

[Issue triggers](https://hookdeck.com/docs/issue-triggers) control what creates issues. [Notifications](https://hookdeck.com/docs/issue-triggers) can be sent to Email, Slack, PagerDuty, Microsoft Teams, or a webhook.

## Replay

**Single event replay**: Use the CLI TUI, web console, or Dashboard to replay any event.

**Bulk retry via API**:

```sh
curl -X POST https://api.hookdeck.com/$API_VERSION/bulk/events/retry \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": {"webhook_id": "web_xxx", "status": "FAILED"}}'
```

**[Bookmarks](https://hookdeck.com/docs/bookmarks)**: Save a Request as a bookmark in the Dashboard, then replay it whenever you need to re-test.

## Documentation

- [Events & Attempts](https://hookdeck.com/docs/events)
- [Requests](https://hookdeck.com/docs/requests)
- [Issues](https://hookdeck.com/docs/issues)
- [Issue triggers](https://hookdeck.com/docs/issue-triggers)
- [Metrics](https://hookdeck.com/docs/metrics)
- [Bookmarks](https://hookdeck.com/docs/bookmarks)
