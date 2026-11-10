---
name: event-gateway-webhook-backup
description: "Sets up the Hookdeck Event Gateway as a standby backup for teams that already receive webhooks on their own infrastructure, then recovers missed webhooks after an outage. Hookdeck captures a copy of every webhook in parallel and delivers nothing until needed; when the user's endpoint recovers, it replays the outage window at a rate limit the endpoint can take. Use when preparing for Black Friday / Cyber Monday (BFCM), a sale, launch, code freeze or other peak traffic; when the user wants a webhook backup, fallback or disaster-recovery plan without migrating; or during and after an incident where their webhook endpoint was down, overloaded or dropping events and they need to recover or replay missed webhooks from Shopify, Stripe, BigCommerce, PayPal or any other provider."
---

# Event Gateway webhook backup

For teams that **already receive webhooks directly** and want a safety net, not a migration. Each provider gets a second webhook subscription pointing at a Hookdeck [Source](https://hookdeck.com/docs/sources). The [Connection](https://hookdeck.com/docs/connections) behind it delivers to a mock [Destination](https://hookdeck.com/docs/destinations), so Hookdeck stores every webhook and touches nothing. When the user's endpoint fails, the stored [Events](https://hookdeck.com/docs/events) for the outage window are replayed to the real endpoint.

```
                ┌──────────────────────────────▶ Your endpoint  (primary, unchanged)
 Provider ──────┤
 (Shopify,      └──▶ Hookdeck Source ──▶ Connection ──▶ Mock destination   (normal times)
  Stripe, …)                                       └──▶ Your endpoint, rate limited (recovery only)
```

No application code changes. Hookdeck forwards the original body and headers, so the user's existing provider signature verification keeps working (see [Gotchas](#gotchas) for providers that sign the URL).

## Phases

| Phase | When | What happens |
|-------|------|--------------|
| [1. Arm](#1-arm-the-backup-before-the-peak) | Before the peak | One connection per provider, Hookdeck URL added as a second subscription, runbook written |
| [2. Incident](#2-during-an-incident) | Endpoint down or overloaded | Confirm Hookdeck is capturing, optionally stop direct delivery, note the outage start time |
| [3. Recover](#3-recover-the-missed-webhooks) | Endpoint healthy again | Pause, point the destination at the real endpoint with a rate limit, bulk retry the outage window |
| [4. Choose](#4-revert-or-stay-on-hookdeck) | After the replay | Revert to standby, or keep receiving through Hookdeck |

Work out which phase the user is in before acting. During an incident, skip straight to phase 2 or 3.

## Tools

- **Hookdeck CLI v3 or later** for setup and destination changes. The CLI must be installed first: `brew install hookdeck` or `npm i -g hookdeck-cli`, then `hookdeck version` ([install docs](https://hookdeck.com/docs/cli)). Sign in with `hookdeck login`; with no browser or TTY, use `hookdeck ci` with `HOOKDECK_API_KEY` set. Run `hookdeck whoami` and confirm the project before creating anything.
- **Event Gateway MCP server** (`hookdeck gateway mcp`) for the bulk retry. The CLI has no bulk retry command; the MCP `gateway_bulk_read` / `gateway_bulk_write` tools do, and `plan` counts the events a retry would touch without running it. Start the server with `--allow-write` for phase 3. Pause and unpause work in read-only mode. See [MCP docs](https://hookdeck.com/docs/mcp).
- Without MCP, use the [bulk retry API](https://hookdeck.com/docs/api/bulk.md) or the dashboard's **Bulk Retry** button. All three are in [references/recovery.md](references/recovery.md).

Add `--output json` to any `hookdeck gateway` command to parse IDs and URLs.

## 1. Arm the backup (before the peak)

Ask the user for, per provider: the provider name, and the full URL of their existing webhook endpoint. Run `hookdeck gateway connection list` first: `upsert` updates any existing connection with the same name, so pick names that are free. Then, per provider:

```sh
# One connection, source and destination per provider. Idempotent: safe to re-run.
hookdeck gateway connection upsert shopify-backup \
  --source-name shopify-backup --source-type WEBHOOK \
  --destination-name shopify-backup-dest --destination-type MOCK_API \
  --output json
```

- Use `MOCK_API`. The `upsert` help text lists `MOCK`, which the CLI rejects.
- Give each provider its **own destination**. Recovery edits the destination in place, and a shared destination would switch every provider at once.
- Leave [Source Authentication](https://hookdeck.com/docs/authentication) off; the user's endpoint already verifies the provider signature and still receives the original headers.
- From the JSON, record the connection `id`, `destination.id` and `source.url` (`https://hkdk.events/...`).

Next, add `source.url` **as-is, with no path** as an extra webhook subscription in the provider, subscribed to the same topics as the existing endpoint. Keep the existing subscription. Most providers allow several endpoints per topic; find where with the provider's skill from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills) (`npx skills add hookdeck/webhook-skills --skill <provider>-webhooks -y -g`). This step is in the provider's dashboard or API, so hand it to the user unless the agent has provider credentials. If the provider allows only one endpoint, this standby setup doesn't fit: Hookdeck has to sit in the delivery path full time (see the [event-gateway](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md) skill).

Verify capture once the provider is sending (or after the user triggers a test webhook):

```sh
hookdeck gateway event list --connection-id <connection-id> --limit 5
```

Events should show `SUCCESSFUL` (delivered to the mock). Finally, write the runbook from [references/runbook-template.md](references/runbook-template.md) into the user's repo so whoever is on call has the IDs and commands without re-running discovery.

Before the peak, tell the user:

- Rehearse phases 3 and 4 once against a staging endpoint, so the first replay isn't during a real incident.

- Recovery only reaches back as far as their plan's [retention window](https://hookdeck.com/pricing). Check it covers the outage they would plan for.
- Their handlers must be [idempotent](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency). The replay window overlaps events the endpoint may have processed, and providers keep retrying their own failed deliveries.

## 2. During an incident

1. Confirm Hookdeck is still capturing: `hookdeck gateway event list --connection-id <id> --limit 5` shows recent `created_at` times.
2. Find the **outage start**: the time of the last webhook the user's system processed successfully, from their logs or database. Hookdeck can't know this. Record it in UTC.
3. Recommend stopping direct delivery in the provider (disable or delete the original endpoint subscription) to take the load off the endpoint while it is fixed. Hookdeck keeps capturing. If the user leaves it on, the provider keeps retrying its failed deliveries, and some providers disable an endpoint by themselves after enough failures. Check its status before phase 4.

Nothing changes on the Hookdeck side yet. The mock destination keeps accepting events.

## 3. Recover the missed webhooks

Only once the user's endpoint is healthy. Decide the window end first; it depends on phase 4:

| Path | Window end |
|------|------------|
| **Revert to direct delivery** | First webhook the endpoint processed successfully after the fix. If direct delivery was stopped in phase 2, the user re-enables it now and the agent waits for that first success before planning the retry |
| **Stay on Hookdeck** | The moment the connection is paused in step 1 below |

```sh
# 1. Hold new events. Arriving events are stored as HOLD, not delivered.
hookdeck gateway connection pause shopify-backup

# 2. Point the SAME destination at the real endpoint, rate limited.
hookdeck gateway destination update <destination-id> \
  --type HTTP --url https://api.example.com/webhooks/shopify \
  --rate-limit 10 --rate-limit-period second
```

Then bulk retry the window with MCP: `plan` first, show the user the count, `create` after they confirm.

```json
{"tool": "gateway_bulk_read", "arguments": {"action": "plan", "operation": "events_retry",
  "query": {"connection_id": "<connection-id>",
            "created_at": {"gte": "<outage-start>", "lte": "<window-end>"}}}}
```

Repeat with `gateway_bulk_write` and `"action": "create"`, then poll `gateway_bulk_read` with `"action": "get"` and the returned `bch_...` ID until `completed_at` is set. Deliveries can still be draining at the rate limit after that; check the events themselves before moving on. API and dashboard equivalents, choosing the rate limit and checking the result are in [references/recovery.md](references/recovery.md).

Bulk retries **are delivered while the connection is paused**, using the destination's current config. Events held by the pause stay held.

## 4. Revert or stay on Hookdeck

**Revert to direct delivery** (once every replayed event is delivered, and the provider's original subscription is active and delivering again):

```sh
hookdeck gateway destination update <destination-id> --type MOCK_API --rate-limit 0
hookdeck gateway connection unpause shopify-backup
```

`--rate-limit 0` clears the limit. Events held during the pause go to the mock, and the backup is armed again.

**Stay on Hookdeck** (the destination already points at the real endpoint):

```sh
hookdeck gateway connection unpause shopify-backup
```

Held events and all new ones are delivered at the rate limit. The user must now **remove the provider's direct subscription** or every webhook arrives twice. From here the connection is a normal Event Gateway setup: add [retries](https://hookdeck.com/docs/retries) and [issue notifications](https://hookdeck.com/docs/issues) with the [event-gateway](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md) skill.

## Gotchas

- **Edit the destination, don't replace it.** Each stored event records the destination it was created for, and a retry uses that destination's current settings. Edit it in place with `destination update`; don't attach a different destination to the connection.
- **Path forwarding.** Hookdeck appends the request path received by the source to the destination URL. Register the bare `https://hkdk.events/...` URL with the provider and put the full endpoint path in `--url`.
- **Providers that sign the URL** (for example Square and Twilio) compute the signature over the URL they posted to, which is the Hookdeck URL. Replayed webhooks will fail the user's verification unless it checks against the Hookdeck source URL for those requests. Raise this during phase 1, not mid-incident.
- **Endpoint challenges.** Some providers send a validation request when an endpoint is added and expect a computed reply (Slack's `url_verification` is one). A plain `WEBHOOK` source only returns a fixed response, so check the provider's skill and [Source Types](https://hookdeck.com/docs/sources#source-types) before relying on the backup for those providers.
- **Pause, not disable.** `pause` holds events for later delivery; `disable` is a configuration change. Never disable the backup connection during an incident.
- **Rate limit.** Start at or below the endpoint's normal peak throughput. Bulk retries queue alongside new events, so a low limit lengthens the catch-up but protects the endpoint.

## References

- [references/recovery.md](references/recovery.md) — Bulk retry via MCP, API or dashboard; sizing the window and rate limit; verifying the replay
- [references/runbook-template.md](references/runbook-template.md) — Runbook to write into the user's repo in phase 1
- [BFCM backup walkthrough](https://hookdeck.com/blog/webhooks-backup-plan-black-friday-cyber-monday) — The human-readable version of this plan
- [CLI reference](https://hookdeck.com/docs/cli.md) · [MCP](https://hookdeck.com/docs/mcp) · [Retries](https://hookdeck.com/docs/retries) · [Connections: pause](https://hookdeck.com/docs/connections#pause-a-connection)
- [event-gateway](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md) — Full Event Gateway skill, for anything beyond backup and recovery
