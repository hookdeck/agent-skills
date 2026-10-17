# Reading requests

How Inspect returns captured requests. The live, complete reference is the [OpenAPI description](https://inspect.hookdeck.com/openapi.json) (`CapturedRequest`, `RequestsPage` and `WaitTimeout`).

## The reads

| Call | Use it to | Reply |
|---|---|---|
| `GET {inspect_url}/requests?timeout=25` | Wait for the next request | `requests`, `more`, `next_url`, `note`. After the timeout: `timed_out: true`, `resume`, `read` |
| `GET {inspect_url}/requests` | Read every request from the start, oldest first | The same shape, without waiting |
| `GET {inspect_url}?format=json` | Take a snapshot: the Source and its newest requests | The Source's fields, its `requests`, and a `requests_url` that waits for anything newer |
| `GET {body_url}` | Download one body exactly as it arrived | The raw bytes |

Parameters on `/requests`:

- `timeout`: seconds to wait, 0 to 90. Omitted or 0 reads once and returns.
- `limit`: most requests per reply, 1 to 50 (default 10).
- `next`: a cursor. Use the `next_url` and `resume` URLs exactly as given rather than building it.

## Cursors

- **`next_url`** continues after the requests just returned. When `more` is true, more are ready now, so call it straight away.
- **`resume`** (after a timeout) waits again from the same point. It changes on every call, so always use the newest one.
- Following `next_url` and `resume` returns each request once.

## A request's fields

| Field | Meaning |
|---|---|
| `id` | The request's ID (`req_…`). For a request you sent yourself, it matches `request_id` in the ingest URL's reply |
| `method` (same as `verb`) | The HTTP method |
| `path`, `query` | What came after the ingest URL |
| `headers` | The captured headers |
| `received_at` | When it arrived |
| `body` | The body, parsed when it's JSON, otherwise a string |
| `body_raw` | The body exactly as it arrived, as text. Wait replies only |
| `body_base64` | A small binary body's exact bytes. Wait replies only |
| `body_url` | Downloads the exact body, text or binary |
| `already_arrived` | It came in before this call started. It's still a real request and counts as the one you were waiting for. Wait replies only |
| `verified` | Whether it passed the Source's signature check. Only `true` when the user has added the provider's signing secret in Inspect |
| `rejection_cause` | Why Hookdeck refused it. `null` when accepted, including when the Source has no destination |
| `body_read_failed` | The exact body couldn't be read just now. Download it from `body_url` |

## Body sizes in wait replies

| Body | Included as | Otherwise |
|---|---|---|
| Text up to 1 MB | `body_raw` | |
| Binary up to 64 KB | `body_base64` | |
| Larger, past 2 MB of bodies in one reply, or `body_read_failed: true` | Neither | `curl -s -o body.bin "{body_url}"` |

The `?format=json` snapshot never includes `body_raw` or `body_base64`. Use `body_url` there when you need the exact bytes.
