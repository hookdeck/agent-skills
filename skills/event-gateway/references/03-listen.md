# 03 -- Listen for Events

Start receiving webhooks locally with `hookdeck listen`.

## No Account Required

`hookdeck listen` works without any Hookdeck account. No signup, no login -- just tunneling, inspection, and replay:

```sh
hookdeck listen 3000
```

This creates a public Source URL, tunnels to `localhost:3000`, and opens a TUI (terminal UI) for inspecting events.

## With an Event Gateway Project

After `hookdeck login`, `hookdeck listen` runs in Event Gateway mode with persistent connections, project management, and full Dashboard access:

```sh
hookdeck login
hookdeck listen 3000
```

## Path-Specific Tunneling

Route events to a specific path on your local server:

```sh
hookdeck listen 3000 --path /webhooks/stripe
```

## Multiple Sources

Listen to multiple sources simultaneously by specifying source names:

```sh
hookdeck listen 3000 stripe shopify --path /webhooks
```

## CLI TUI (Terminal UI)

When `hookdeck listen` is running, the CLI shows an embedded terminal interface:

- **Event list**: All received events, updated in real time
- **Inspect**: Select an event to view the full request and response (headers, body, status)
- **Replay**: Replay any event directly from the terminal

This is always available, regardless of whether you have an account.

## Web UI

The CLI provides a link to a web interface for event inspection:

- **Without an Event Gateway project**: The web console provides event inspection and replay in a browser.
- **With an Event Gateway project**: You use the [Hookdeck Dashboard](https://dashboard.hookdeck.com) with full features -- events, requests, bookmarks, replay, project management, and more.

## Triggering Test Events

### From Your Provider

Most providers have a "Send test webhook" button in their dashboard. Use this with your Hookdeck Source URL.

### Via cURL

Send a test event directly to your Source URL:

```sh
curl -X POST https://hkdk.events/YOUR_SOURCE_ID \
  -H "Content-Type: application/json" \
  -d '{"type": "test.event", "data": {"message": "hello"}}'
```

### Via the Publish API

Send events programmatically through the [Publish API](https://hookdeck.com/docs/publish):

```sh
curl -X POST https://hkdk.events/v1/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HOOKDECK_API_KEY" \
  -H "x-hookdeck-source-name: my-source" \
  -d '{"type": "test.event", "data": {"message": "hello"}}'
```

## Next Step

Proceed to [04-iterate.md](04-iterate.md) to debug and iterate on your handler.
