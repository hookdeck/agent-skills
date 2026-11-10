# Recovering missed webhooks

## Contents

- [Before the retry](#before-the-retry)
- [Size the backlog and pick a rate limit](#size-the-backlog-and-pick-a-rate-limit)
- [Bulk retry with MCP](#bulk-retry-with-mcp)
- [Bulk retry with the API](#bulk-retry-with-the-api)
- [Bulk retry in the dashboard](#bulk-retry-in-the-dashboard)
- [Verify the replay](#verify-the-replay)
- [Several providers](#several-providers)

Detail for phase 3 of [SKILL.md](../SKILL.md). The order is always: pause the connection, edit the destination, plan, retry, verify.

## Before the retry

Check all three, or the retry goes to the wrong place:

```sh
hookdeck gateway connection get shopify-backup --output json
```

- `paused_at` is set (the connection is paused).
- `destination.type` is `HTTP` and `destination.config.url` is the real endpoint, including its path.
- `destination.config.delivery_policy.rate` is the rate limit you chose.

Timestamps in every filter are ISO 8601 in UTC, for example `2026-11-27T14:05:00Z`. Convert the user's local times before filtering.

## Size the backlog and pick a rate limit

Count what the window holds before choosing a rate limit:

```sh
hookdeck gateway metrics events --connection-id <connection-id> \
  --start <outage-start> --end <window-end> --measures count --granularity 1h
```

Divide the total by the rate to estimate the catch-up time, and tell the user. For example, 90,000 events at 25 per second take an hour. Choose a rate the endpoint handled comfortably before the incident, not its theoretical maximum. Use `--rate-limit-period concurrent` instead if the endpoint is limited by in-flight requests (slow handlers, database connections) rather than throughput. To change the rate mid-replay, run `hookdeck gateway destination update <destination-id> --rate-limit <n>` again.

## Bulk retry with MCP

Start the server with writes enabled for this step: `hookdeck gateway mcp --allow-write`. If the user's MCP client is already configured read-only, `plan` still works and they can run `create` through the API or dashboard instead.

`gateway_bulk_read` with action `plan` (no side effects):

```json
{
  "action": "plan",
  "operation": "events_retry",
  "query": {
    "connection_id": "web_xxx",
    "created_at": { "gte": "2026-11-27T14:05:00Z", "lte": "2026-11-27T16:40:00Z" }
  }
}
```

The reply has `estimated_count`. Show it to the user with the window and the destination URL, and get a yes before continuing. If the count is zero, the window or connection ID is wrong; don't run `create`.

`gateway_bulk_write` with action `create` and the same `operation` and `query`. The reply contains the bulk job `id` (`bch_...`).

`gateway_bulk_read` with action `get` and that `id` reports progress. The job is done when `completed_at` is set, but with a rate limit the deliveries can still be draining; see [Verify the replay](#verify-the-replay). `gateway_bulk_write` with action `cancel` and the `id` stops it.

Leave out `status` from the query. Every event in the window was delivered to the mock, so they are all `SUCCESSFUL`; filtering on `FAILED` matches nothing.

## Bulk retry with the API

The API calls the connection ID `webhook_id`. Use a Project API key (from the project's settings, not the CLI's key) and the current API version from the [API reference](https://hookdeck.com/docs/api.md). The plan endpoint is a `GET` that takes the query in bracket notation; the run endpoint is a `POST` with a JSON body.

```sh
# Estimate
curl -G "https://api.hookdeck.com/$API_VERSION/bulk/events/retry/plan" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  --data-urlencode 'query[webhook_id]=web_xxx' \
  --data-urlencode 'query[created_at][gte]=2026-11-27T14:05:00Z' \
  --data-urlencode 'query[created_at][lte]=2026-11-27T16:40:00Z'

# Run
curl -X POST "https://api.hookdeck.com/$API_VERSION/bulk/events/retry" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" -H "Content-Type: application/json" \
  -d '{"query": {"webhook_id": "web_xxx",
                 "created_at": {"gte": "2026-11-27T14:05:00Z", "lte": "2026-11-27T16:40:00Z"}}}'
```

Full reference: [bulk operations](https://hookdeck.com/docs/api/bulk.md).

## Bulk retry in the dashboard

For users who prefer clicking through it: **Events**, filter by the connection, set the date range to the window, then **Bulk Retry**, **Retry All**. Ongoing retries can be cancelled from the **Ongoing** tab of the same dialog. See [retry many events](https://hookdeck.com/docs/retries#retry-many-events).

## Verify the replay

```sh
# Each replayed event gains an attempt; look for non-2xx responses
hookdeck gateway event list --connection-id <connection-id> \
  --created-after <outage-start> --created-before <window-end> --status FAILED
```

Run it again with `--status QUEUED` and `--status SCHEDULED`. Until both come back empty, deliveries are still going out at the rate limit.

- No `FAILED`, `QUEUED` or `SCHEDULED` events: the replay landed. Ask the user to spot-check a few records in their system.
- `FAILED` events: inspect one with `hookdeck gateway attempt list --event-id <event-id>` to see the response the endpoint returned. Fix the cause, then re-run the bulk retry with `"status": "FAILED"` added to the query, so only the failures go again.

## Several providers

Repeat the whole of phase 3 per connection. Each provider has its own outage window if direct delivery failed at different times, and its own endpoint URL. Run them one after another unless the user's endpoints are separate services that can take the load in parallel.
