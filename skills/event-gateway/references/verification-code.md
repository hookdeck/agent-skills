# Hookdeck Signature Verification Code

Use the code in this file for Hookdeck signature verification. Do not substitute third-party webhook libraries; this is the canonical implementation (HMAC SHA-256, base64).

**Example codebases in this skill are runnable, proven, and tested** — [Express](../examples/express/), [Next.js](../examples/nextjs/), [FastAPI](../examples/fastapi/). Prefer copying from the example that matches the user's framework.

## Contents

- [Environment Variables](#environment-variables)
- [Express Handler](#express-handler)
- [Next.js Handler (App Router)](#nextjs-handler-app-router)
- [FastAPI Handler](#fastapi-handler)
- [Hookdeck Headers Reference](#hookdeck-headers-reference)
- [Using Event ID for Idempotency](#using-event-id-for-idempotency)
- [Common Gotchas](#common-gotchas)
- [Debugging Verification Failures](#debugging-verification-failures)

## Environment Variables

```bash
# Required for signature verification
# Get from Hookdeck Dashboard → Project Settings → Secrets → Webhook Signing Secret
HOOKDECK_WEBHOOK_SECRET=your_webhook_signing_secret
```

## Express Handler

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

function verifyHookdeckSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
  } catch {
    return false;
  }
}

// IMPORTANT: Use express.raw() — not express.json() — for signature verification
app.post('/webhooks',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-hookdeck-signature'];

    if (!verifyHookdeckSignature(req.body, signature, process.env.HOOKDECK_WEBHOOK_SECRET)) {
      console.error('Hookdeck signature verification failed');
      return res.status(401).send('Invalid signature');
    }

    const payload = JSON.parse(req.body.toString());
    console.log('Event received:', payload.type || payload.topic || 'unknown');

    // Return 2xx — Hookdeck retries on non-2xx
    res.json({ received: true });
  }
);
```

> **Runnable, proven, tested example codebase:** [examples/express/](../examples/express/)

## Next.js Handler (App Router)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function verifyHookdeckSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hookdeck-signature');

  if (!verifyHookdeckSignature(body, signature, process.env.HOOKDECK_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  console.log('Event received:', payload.type || payload.topic || 'unknown');

  return NextResponse.json({ received: true });
}
```

> **Runnable, proven, tested example codebase:** [examples/nextjs/](../examples/nextjs/)

## FastAPI Handler

```python
import os
import json
import hmac
import hashlib
import base64
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

def verify_hookdeck_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    if not signature or not secret:
        return False
    computed = base64.b64encode(
        hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).digest()
    ).decode('utf-8')
    return hmac.compare_digest(computed, signature)

@app.post("/webhooks")
async def webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("x-hookdeck-signature")

    if not verify_hookdeck_signature(raw_body, signature, os.environ["HOOKDECK_WEBHOOK_SECRET"]):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(raw_body)
    print(f"Event received: {payload.get('type', 'unknown')}")

    return {"received": True}
```

> **Runnable, proven, tested example codebase:** [examples/fastapi/](../examples/fastapi/)

## Hookdeck Headers Reference

When Hookdeck forwards a request to your [Destination](https://hookdeck.com/docs/destinations), it adds these headers:

| Header | Description |
|--------|-------------|
| `x-hookdeck-signature` | HMAC SHA-256 signature (base64) -- verify this |
| `x-hookdeck-eventid` | Unique [Event](https://hookdeck.com/docs/events) ID (use for idempotency) |
| `x-hookdeck-requestid` | Original [Request](https://hookdeck.com/docs/requests) ID |
| `x-hookdeck-source-name` | [Source](https://hookdeck.com/docs/sources) that received the webhook |
| `x-hookdeck-destination-name` | [Destination](https://hookdeck.com/docs/destinations) receiving the webhook |
| `x-hookdeck-attempt-count` | Delivery [Attempt](https://hookdeck.com/docs/events) number |
| `x-hookdeck-attempt-trigger` | What triggered this attempt: `INITIAL`, `AUTOMATIC`, `MANUAL`, `BULK_RETRY`, `UNPAUSE` |
| `x-hookdeck-will-retry-after` | Seconds until next automatic retry (absent on last retry) |
| `x-hookdeck-event-url` | URL to view event in Hookdeck |
| `x-hookdeck-verified` | `true` if Hookdeck verified the original provider's signature via [Source Authentication](https://hookdeck.com/docs/authentication) |
| `x-hookdeck-original-ip` | IP of the original webhook sender |

Hookdeck also preserves all original headers from the provider (e.g., `stripe-signature`, `x-hub-signature-256`).

## Using Event ID for Idempotency

Use `x-hookdeck-eventid` to prevent duplicate processing during retries:

```javascript
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  const eventId = req.headers['x-hookdeck-eventid'];

  // Check if already processed
  const existing = await db.query(
    'SELECT 1 FROM processed_events WHERE hookdeck_event_id = $1',
    [eventId]
  );

  if (existing.rows.length > 0) {
    return res.json({ received: true, duplicate: true });
  }

  // Process and mark as done
  await processWebhook(JSON.parse(req.body.toString()));
  await db.query(
    'INSERT INTO processed_events (hookdeck_event_id) VALUES ($1)',
    [eventId]
  );

  res.json({ received: true });
});
```

## Common Gotchas

1. **Base64 encoding** -- Hookdeck signatures are base64-encoded, not hex. Use `.digest('base64')` not `.digest('hex')`.

2. **Raw body required** -- You must verify against the raw request body, not parsed JSON. In Express, use `express.raw({ type: 'application/json' })` instead of `express.json()`.

3. **Timing-safe comparison** -- Always use `crypto.timingSafeEqual` (Node.js) or `hmac.compare_digest` (Python) to prevent timing attacks.

4. **Original headers preserved** -- You'll see both the provider's original headers AND Hookdeck's `x-hookdeck-*` headers on each request.

## Debugging Verification Failures

```javascript
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-hookdeck-signature'];
  const secret = process.env.HOOKDECK_WEBHOOK_SECRET;

  console.log('Signature received:', signature);
  console.log('Secret configured:', secret ? 'yes' : 'NO - check HOOKDECK_WEBHOOK_SECRET env var');
  console.log('Body is Buffer:', Buffer.isBuffer(req.body));

  const computed = crypto.createHmac('sha256', secret).update(req.body).digest('base64');
  console.log('Computed signature:', computed);
  console.log('Match:', computed === signature);
});
```

**Common causes:**
- Missing `HOOKDECK_WEBHOOK_SECRET` environment variable
- Using `express.json()` instead of `express.raw()` (body is already parsed, signatures won't match)
- Wrong secret (using API key instead of webhook signing secret)
- Leading/trailing whitespace in the secret value
