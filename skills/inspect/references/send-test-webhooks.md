# Sending test webhooks

You can send your own requests to a Source's `ingest_url`. Always tell the user which requests you sent, so they can tell them apart from the provider's.

## A plain test request

Any HTTP method is captured:

```sh
curl -s -X POST "$INGEST_URL" -H 'content-type: application/json' -d '{"test": true}'
```

The reply's `request_id` matches the request's `id` when you read it back. For a `HEAD` request, the ID is in the `x-hookdeck-request-id` header.

## Realistic provider payloads

[samples.hookdeck.com](https://samples.hookdeck.com) has recorded webhooks from 150+ platforms, with each event's real headers and body:

1. `GET https://samples.hookdeck.com/providers.json` lists the platforms by slug (`stripe`, `shopify`, …), each with its `latest_version`.
2. `GET https://samples.hookdeck.com/providers/{slug}/{version}.json` lists that platform's events by name (for Stripe, `checkout.session.completed` and others), each with `headers` and `body`.
3. POST the event's `body` as JSON to the ingest URL, with its headers. **Leave out `content-length`** and other transport headers such as `accept-encoding`: your HTTP client sets those itself, and a stale `content-length` breaks the request.

```sh
VERSION=$(curl -s https://samples.hookdeck.com/providers.json | jq -r '.stripe.latest_version')
EVENT=$(curl -s "https://samples.hookdeck.com/providers/stripe/$VERSION.json" | jq '."checkout.session.completed"')
curl -s -X POST "$INGEST_URL" -H 'content-type: application/json' \
  -H "stripe-signature: $(jq -r '.headers["stripe-signature"]' <<<"$EVENT")" \
  -d "$(jq -c '.body' <<<"$EVENT")"
```

## Signatures on samples

A sample's signature header was made with someone else's secret, so it won't pass a check with the user's secret. For a request whose signature you can check, have the provider send a test event to the ingest URL, from its dashboard or its CLI.
