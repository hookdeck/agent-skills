# 04 -- Iterate and Debug

Debug failures, fix your code, and replay events until everything works.

## Debugging Surfaces

Three tools for inspecting and replaying events:

### CLI TUI

Built into `hookdeck listen`. Always available.

- View all received events in real time
- Select an event to inspect the full request (headers, body) and response (status, body)
- Replay events directly from the terminal

### Web Console (No Account)

When not using an Event Gateway project, the CLI provides a link to a web interface where you can:

- View all events with request and response details
- Inspect individual event payloads
- Retry failed events

### Dashboard (Event Gateway Project)

When using an Event Gateway project, access the full [Hookdeck Dashboard](https://dashboard.hookdeck.com):

- **Events view**: Inspect [Request](https://hookdeck.com/docs/requests) and [Event](https://hookdeck.com/docs/events) payloads, headers, and delivery [Attempts](https://hookdeck.com/docs/events)
- **Connections view**: Manage [Sources](https://hookdeck.com/docs/sources), [Destinations](https://hookdeck.com/docs/destinations), and Connection [Rules](https://hookdeck.com/docs/connections)
- **[Issues](https://hookdeck.com/docs/issues)**: Track failed deliveries and delivery backlogs
- **Replay**: Re-deliver individual Events or bulk replay filtered sets
- **[Bookmarks](https://hookdeck.com/docs/bookmarks)**: Save representative requests for repeated testing

## Troubleshooting Flowchart

**Events not arriving at your Source?**

1. Verify the webhook provider is sending to your Source URL (`https://hkdk.events/xxx`)
2. Check that `hookdeck listen` is running
3. If using Source Authentication, check credentials -- failed auth rejects requests before they reach your Connection

**Events arriving but delivery failing?**

1. Check the event in the CLI TUI or web UI -- inspect the response from your destination
2. Common causes: handler not running, wrong port, route not found (404), handler error (500)
3. Fix your code, then replay the event to test again

**Signature verification failing?**

1. Confirm `HOOKDECK_WEBHOOK_SECRET` is set correctly (Dashboard > Settings > Secrets > Webhook Signing Secret)
2. Ensure you're using the raw request body, not parsed JSON
3. Confirm base64 encoding (not hex) -- see [verification-code.md](verification-code.md) for details
4. Check for leading/trailing whitespace in the secret value

## Replay Workflow

The replay loop is the core of the iterate stage:

1. Send or receive a webhook event
2. Inspect the event and response in the CLI TUI, web console, or Dashboard
3. If the delivery failed, fix your handler code
4. Replay the same event (from CLI TUI, web console, or Dashboard)
5. Repeat until successful

This avoids having to re-trigger events from the provider each time you make a change.

## Using the API for Programmatic Debugging

The [REST API](https://hookdeck.com/docs/api) can also be used for event inspection and replay:

```sh
# List recent events
curl https://api.hookdeck.com/$API_VERSION/events \
  -H "Authorization: Bearer $HOOKDECK_API_KEY"

# Retry a specific event
curl -X POST https://api.hookdeck.com/$API_VERSION/events/{event_id}/retry \
  -H "Authorization: Bearer $HOOKDECK_API_KEY"
```

See [api-patterns.md](api-patterns.md) for full API patterns and [referencing-docs.md](referencing-docs.md) for the API version.
