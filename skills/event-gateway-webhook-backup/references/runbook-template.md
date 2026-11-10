# Runbook template

Write this to the user's repo in phase 1 (suggested path: `docs/runbooks/webhook-backup.md`), filled in with real values. One row per provider. Do not put API keys or webhook secrets in it.

````markdown
# Webhook backup runbook (Hookdeck Event Gateway)

Hookdeck receives a copy of every webhook below and delivers it to a mock destination.
Nothing reaches our systems from Hookdeck unless we follow the recovery steps.

Hookdeck project: <org> / <project>
Retention: <N> days on our plan. Recovery cannot reach further back than this.

| Provider | Connection | Connection ID | Destination ID | Hookdeck URL (in provider) | Our endpoint |
|----------|------------|---------------|----------------|----------------------------|--------------|
| Shopify  | shopify-backup | web_... | des_... | https://hkdk.events/... | https://api.example.com/webhooks/shopify |

## Check the backup is capturing

    hookdeck gateway event list --connection-id <connection-id> --limit 5

## During an incident

1. Record the time (UTC) of the last webhook we processed successfully.
2. Optional: disable our direct subscription in the provider to shed load. Hookdeck keeps capturing.

## Recover (once our endpoint is healthy)

    hookdeck gateway connection pause <connection>
    hookdeck gateway destination update <destination-id> --type HTTP --url <our-endpoint> \
      --rate-limit <n> --rate-limit-period second

Bulk retry events on <connection-id> created between the outage start and the window end:
- Agent: Event Gateway MCP, operation events_retry: gateway_bulk_read with action plan, then gateway_bulk_write with action create
- Dashboard: Events, filter by connection and date range, then Bulk Retry, Retry All

Window end: if reverting, re-enable our direct subscription first and use the time of the first webhook it delivers successfully. If staying on Hookdeck, use the pause time.

## Afterwards

Revert to standby:

    hookdeck gateway destination update <destination-id> --type MOCK_API --rate-limit 0
    hookdeck gateway connection unpause <connection>

Or stay on Hookdeck: unpause, then remove our direct subscription in the provider.

Agent skill: npx skills add hookdeck/agent-skills --skill event-gateway-webhook-backup
````
