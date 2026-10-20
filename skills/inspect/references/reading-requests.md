# Reading requests

Every reply Inspect sends, field by field. The live, complete reference is the [OpenAPI description](https://inspect.hookdeck.com/openapi.json) (`Source`, `RequestsPage`, `WaitTimeout`, `SourcePreview` and `CapturedRequest`). Examples of the create, wait and timeout replies are in [SKILL.md](../SKILL.md#default-workflow).

## The reads

| Call | Use it to | Reply |
|---|---|---|
| `GET {inspect_url}/requests?timeout=25` | Wait for the next request | [A page of requests](#a-page-of-requests), or after the timeout [a timed-out wait](#a-timed-out-wait) |
| `GET {inspect_url}/requests` | Read every request from the start, oldest first | A page of requests, without waiting |
| `GET {inspect_url}?format=json` | Take a snapshot: the Source and its newest requests | [The snapshot](#the-snapshot). `Accept: application/json` instead of `?format=json` returns the same JSON, but `?format=json` works whatever `Accept` header your tool sends |
| `GET {inspect_url}/requests/{request_id}/body` | Download one body exactly as it arrived | The raw bytes. Each request gives this URL as its `body_url` |

There's no call that returns a single request as JSON: read it from a page or the snapshot, and use `body_url` for its exact body.

Parameters on `/requests`:

- `timeout`: seconds to wait, 0 to 90. Omitted or 0 reads once and returns.
- `limit`: most requests per reply, 1 to 50 (default 10).
- `next`: a cursor. Use the `next_url` and `resume` URLs exactly as given rather than building it.

## Cursors

- **`next_url`** is in every page of requests, even when nothing else is waiting. It continues after the requests just returned: if more are ready it returns them at once, otherwise it waits for the next one. `more: true` is the only sign that more are ready now, so call `next_url` straight away.
- **`resume`** is a URL, returned instead of `next_url` after a timeout. It waits again from the same point. It changes on every call (its `r` counter goes up) so that a tool that caches URLs never returns the old timeout, so always use the newest one.
- Following `next_url` and `resume` returns each request once.

## The create reply

`POST https://inspect.hookdeck.com/` returns `201`:

| Field | Meaning |
|---|---|
| `ingest_url` | Where webhooks go (`…/e/{id}`). Every request sent to it is captured |
| `inspect_url` | The Source's page (`…/{id}`). Also sent as the `Location` header |
| `requests_url` | Waits for the Source's next request, up to 25 seconds |
| `type` | The Source Type: `WEBHOOK` unless you sent a `type` |
| `name` | The Source's name, `source` unless you sent a `name` (letters, digits, underscores and hyphens) |
| `cli_key` | A key that lets the Hookdeck CLI listen to this Source. Keep it out of chats, issues and docs |
| `cmd_hint` | A ready-to-run `npx hookdeck-cli listen [port] …` command with the key and name filled in. Replace `[port]` |
| `note` | What to do next |

Errors: `422` for an unsupported `type` or a bad `name` (`data` lists why), `429` with `retry_after` seconds, and `403` or `502` with an `error` message.

## Sending to the ingest URL

A request to `ingest_url` gets the Source's configured response. Unless the user changed it, that's `200` with:

| Field | Meaning |
|---|---|
| `status`, `message` | `SUCCESS`, and a sentence saying the request was handled |
| `request_id` | The captured request's `id` (for `HEAD`, it's in the `x-hookdeck-request-id` header) |
| `inspect_url`, `requests_url` | The Source's page, and the call that waits for its next request |
| `note` | What to do next |

## A page of requests

From `/requests`, with or without `timeout`:

| Field | Meaning |
|---|---|
| `requests` | The requests, oldest first. Their fields are [below](#a-requests-fields) |
| `more` | `true` when more requests are ready now: call `next_url` straight away |
| `next_url` | Always present. Continues after these requests, waiting up to 25 seconds when none are ready |
| `note` | What to do next, and a reminder about `already_arrived` when it applies |

## A timed-out wait

When no request arrived within `timeout`:

| Field | Meaning |
|---|---|
| `timed_out` | Always `true` |
| `requests` | Always empty |
| `resume` | A URL. GET it to wait again from the same point |
| `read` | A URL for [the snapshot](#the-snapshot) (`{inspect_url}?format=json`) |
| `note` | What to do next |

## The snapshot

From `{inspect_url}?format=json`:

| Field | Meaning |
|---|---|
| `id` | The Source's ID (`src_…`) |
| `name`, `type` | As in the create reply |
| `ingest_url`, `inspect_url` | The Source's two URLs |
| `requests` | Its 10 newest requests, newest first, without `body_raw`, `body_base64` or `already_arrived` |
| `requests_url` | Waits for the next request after those shown |
| `read_url` | Reads every request from the start (`{inspect_url}/requests`). Not the same as a timed-out wait's `read` |
| `note` | What has arrived and what to call next |

## A request's fields

| Field | Meaning |
|---|---|
| `id` | The request's ID (`req_…`). For a request you sent yourself, it matches `request_id` in the ingest URL's reply |
| `method` (same as `verb`) | The HTTP method |
| `path`, `query` | What came after the ingest URL |
| `headers` | The captured headers |
| `received_at` | When it arrived |
| `body` | The body: an object when it's JSON or a form (`application/x-www-form-urlencoded`), `null` when it's binary, otherwise a string |
| `body_raw` | The body exactly as it arrived, as text. `null` for a binary body. `/requests` replies only |
| `body_base64` | A small binary body's exact bytes. `/requests` replies only |
| `body_url` | Downloads the exact body, text or binary: `{inspect_url}/requests/{id}/body` |
| `already_arrived` | It came in before this call started. It's still a real request and counts as the one you were waiting for. `/requests` replies only |
| `verified` | `true` when Hookdeck checked the signature and it matched. Hookdeck only checks it for platforms whose secret the user saved on the Source's page, such as Zoom, so for most requests it's `false`, which is normal |
| `rejection_cause` | Why Hookdeck refused it. `null` when accepted, including when the Source has no destination |
| `body_read_failed` | The exact body couldn't be read just now. Download it from `body_url` |

## Body sizes in `/requests` replies

| Body | Included as | Otherwise |
|---|---|---|
| Text up to 1 MB | `body_raw` | |
| Binary up to 64 KB | `body_base64` | |
| Larger, past 2 MB of bodies in one reply, or `body_read_failed: true` | Neither | `curl -s -o body.bin "{body_url}"` |

The snapshot never includes `body_raw` or `body_base64`. Use `body_url` there when you need the exact bytes.

## Errors on reads

| Status | Meaning |
|---|---|
| `400` | A bad `timeout`, `limit` or `next`. The reply's `read_url` starts again from the beginning |
| `404` | No Source with that ID, or it can no longer be read. Don't guess IDs, and don't follow the reply's `read_url`: it points at the same Source |
| `429` | More than 60 calls a minute from you to this Source. Retry the same URL after the `Retry-After` header's seconds |
| `502`, `503` | A temporary failure. Retry the same URL, after `Retry-After` when it's given |
