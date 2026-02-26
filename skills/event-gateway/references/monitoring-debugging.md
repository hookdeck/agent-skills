# Monitoring & Debugging

## Contents

- [Monitoring](#monitoring)
  - [Event Lifecycle](#event-lifecycle)
  - [Data Model](#data-model)
  - [Event Statuses](#event-statuses)
  - [Where to look](#where-to-look)
- [Debugging](#debugging)
  - [Troubleshooting Flowchart](#troubleshooting-flowchart)
  - [Issues and Notifications](#issues-and-notifications)
  - [Replay](#replay)
- [CLI: list and inspect](#cli-querying)
- [CLI: metrics](#cli-metrics)
- [Documentation](#documentation)

How to monitor webhook deliveries, debug failures, and replay events. For monitoring and debugging, the CLI is often the right first touch for tasks and simple scripts (TUI, list/get, metrics, retry); use it to explore when unsure. The API is valid for querying and for complex scripts or automation. When in doubt, start with the CLI to explore. See SKILL.md for when-to-use guidance and main documentation for details. Querying (events, requests, attempts, metrics) can also be done via the API — see the [API inspect docs](https://hookdeck.com/docs/api/inspect).

## Monitoring {#monitoring}

Event lifecycle, data model, event statuses, and where to look (CLI TUI, Web Console, Dashboard).

### Event Lifecycle

1. Webhook provider sends a request to your Source URL (`https://hkdk.events/xxx`)
2. Hookdeck creates a [Request](https://hookdeck.com/docs/requests) (the raw inbound data)
3. Each Connection on that Source creates an [Event](https://hookdeck.com/docs/events) (processed, routed delivery)
4. Hookdeck delivers the Event to the Destination, creating an [Attempt](https://hookdeck.com/docs/events)
5. If delivery fails (non-2xx), Hookdeck retries according to the Connection's retry rules

### Data Model

| Entity | What it is |
|--------|------------|
| [Request](https://hookdeck.com/docs/requests) | Raw inbound webhook received by a Source |
| [Event](https://hookdeck.com/docs/events) | Processed delivery routed through a Connection |
| [Attempt](https://hookdeck.com/docs/events) | A single delivery try to a Destination |

One Request can produce multiple Events (fan-out). Each Event has one or more Attempts.

### Event Statuses

| Status | Meaning |
|--------|---------|
| `SUCCESSFUL` | Destination returned a 2xx response |
| `FAILED` | All retry attempts exhausted, destination still returning non-2xx |
| `QUEUED` | Scheduled for delivery or retry |
| `HOLD` | Paused by a delay rule or manual hold |

### Where to look

#### CLI TUI

Built into `hookdeck listen`. View events in real time, inspect request/response details, replay events -- all in the terminal.

#### Web Console

When not using an Event Gateway project, the CLI provides a link to a web interface for event inspection and replay.

#### Dashboard

When using an Event Gateway project, the [Hookdeck Dashboard](https://dashboard.hookdeck.com) provides:

- **Events view**: Inspect Event payloads, headers, response, and Attempts
- **Requests view**: See raw inbound webhooks before routing
- **Issues**: Track patterns of failures (delivery issues, transformation errors, backpressure)
- **Replay**: Re-deliver individual Events or bulk replay filtered sets
- **Bookmarks**: Save representative Requests for repeated testing

## Debugging {#debugging}

Troubleshooting flowchart, issues and notifications, and replay.

### Troubleshooting Flowchart

**Events not arriving?**

1. Is the provider sending to the correct Source URL?
2. Is `hookdeck listen` running?
3. If Source Authentication is configured, are the credentials correct? Failed auth returns `403` and no Event is created.

**Events arriving but delivery failing?**

1. Check the Attempt response in the CLI TUI or web UI
2. Is your handler running and listening on the correct port?
3. Is the endpoint path correct (e.g., `/webhooks` vs `/webhook`)?
4. Is the handler returning a 2xx status? Non-2xx triggers retries.

**Signature verification failing in your handler?**

1. Is `HOOKDECK_WEBHOOK_SECRET` set correctly?
2. Are you using the raw request body (not parsed JSON)?
3. Are you using base64 encoding (not hex)?
4. See [verification-code.md](verification-code.md) for debugging code

### Issues and Notifications

[Issues](https://hookdeck.com/docs/issues) are automatically created when problems are detected:

| Issue type | Trigger |
|------------|---------|
| Delivery | Consecutive failed delivery attempts |
| Transformation | JavaScript errors in transform rules |
| Backpressure | Events queuing faster than they can be delivered |

Issue lifecycle: `OPENED` -> `ACKNOWLEDGED` -> `RESOLVED` or `IGNORED`

[Issue triggers](https://hookdeck.com/docs/issue-triggers) control what creates issues. [Notifications](https://hookdeck.com/docs/issue-triggers) can be sent to Email, Slack, PagerDuty, Microsoft Teams, or a webhook.

### Replay

**Single event replay**: Use the CLI TUI, web console, or Dashboard to replay any event.

**Bulk retry via API**:

```sh
curl -X POST https://api.hookdeck.com/$API_VERSION/bulk/events/retry \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": {"webhook_id": "web_xxx", "status": "FAILED"}}'
```

**[Bookmarks](https://hookdeck.com/docs/bookmarks)**: Save a Request as a bookmark in the Dashboard, then replay it whenever you need to re-test.

## CLI: list and inspect {#cli-querying}

When to use: detailed search, inspecting or retrying individual request, event, or attempt. From the terminal you can list, inspect, and retry without opening the Dashboard. Order reflects data flow: request → events → attempts.

```sh
hookdeck gateway request list
hookdeck gateway request get req_xxx
hookdeck gateway request retry req_xxx
hookdeck gateway event list
hookdeck gateway event get evt_xxx
hookdeck gateway event retry evt_xxx
hookdeck gateway attempt list --event-id evt_xxx
hookdeck gateway attempt get att_xxx
```

See [Request commands](https://hookdeck.com/docs/cli/request.md), [Event commands](https://hookdeck.com/docs/cli/event.md), and [Attempt commands](https://hookdeck.com/docs/cli/attempt.md) for full options. For aggregated metrics (volume, failure rate, backlog), see [CLI: metrics](#cli-metrics) in this file.

## CLI: metrics {#cli-metrics}

When to use: event volume, failure rates, which connections had the most events, backlog. Questions like *which connections had the most events?*, *what's our failure rate?*, or *where is backlog building?* are answered from the terminal with the metrics subcommands below. For listing or inspecting individual requests, events, or attempts, see [CLI: list and inspect](#cli-querying). Metrics over time are also available in the [Dashboard](https://dashboard.hookdeck.com) ([Metrics page](https://dashboard.hookdeck.com/metrics) and Source/Connection/Destination pages). The CLI uses `hookdeck gateway metrics` and its subcommands. All CLI commands require a date range (`--start`, `--end`, ISO 8601) and at least one `--measures` value; optional filters include `--granularity`, `--dimensions`, `--source-id`, `--destination-id`, `--connection-id`, and `--status`. See [Metrics](https://hookdeck.com/docs/metrics) and the [CLI metrics reference](https://hookdeck.com/docs/cli/metrics.md) for full reference.

| Subcommand | Purpose |
|------------|---------|
| `metrics events` | Event volume, success/failure counts, error rate over time |
| `metrics requests` | Request acceptance vs rejection counts |
| `metrics attempts` | Delivery latency and success/failure |
| `metrics queue-depth` | Queue backlog per destination (e.g. max_depth, max_age) |
| `metrics pending` | Pending events timeseries |
| `metrics events-by-issue` | Events grouped by issue (debugging); requires issue ID as argument |
| `metrics transformations` | Transformation run counts and error rate |

**Example commands (use cases):**

Event volume and failure rate over time:

```sh
hookdeck gateway metrics events --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --granularity 1d --measures count,failed_count,error_rate
```

Request acceptance vs rejection:

```sh
hookdeck gateway metrics requests --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures count,accepted_count,rejected_count
```

Delivery latency (attempts):

```sh
hookdeck gateway metrics attempts --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures response_latency_avg,response_latency_p95
```

Queue backlog per destination:

```sh
hookdeck gateway metrics queue-depth --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures max_depth,max_age --destination-id dest_xxx
```

Pending events over time:

```sh
hookdeck gateway metrics pending --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --granularity 1h --measures count
```

Events grouped by issue (debugging):

```sh
hookdeck gateway metrics events-by-issue iss_xxx --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures count
```

Transformation errors:

```sh
hookdeck gateway metrics transformations --start 2026-02-01T00:00:00Z --end 2026-02-25T00:00:00Z --measures count,failed_count,error_rate
```

## Documentation

- [Events & Attempts](https://hookdeck.com/docs/events)
- [Requests](https://hookdeck.com/docs/requests)
- [Issues](https://hookdeck.com/docs/issues)
- [Issue triggers](https://hookdeck.com/docs/issue-triggers)
- [Metrics](https://hookdeck.com/docs/metrics)
- [Bookmarks](https://hookdeck.com/docs/bookmarks)
- CLI: [request](https://hookdeck.com/docs/cli/request.md) · [event](https://hookdeck.com/docs/cli/event.md) · [attempt](https://hookdeck.com/docs/cli/attempt.md) · [source](https://hookdeck.com/docs/cli/source.md) · [destination](https://hookdeck.com/docs/cli/destination.md) · [transformation](https://hookdeck.com/docs/cli/transformation.md) · [metrics](https://hookdeck.com/docs/cli/metrics.md)
