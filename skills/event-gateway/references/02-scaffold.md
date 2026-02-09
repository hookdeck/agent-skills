# 02 -- Scaffold Your Webhook Handler

Build a handler that receives events from Hookdeck. This stage combines provider-specific knowledge from `hookdeck/webhook-skills` with Hookdeck verification from this skill.

## Handler Structure

Every webhook handler follows the same pattern:

1. Receive the raw request body
2. Verify the signature (provider and/or Hookdeck)
3. Parse the payload
4. Process the event
5. Return a 2xx response (Hookdeck retries on non-2xx)

## Provider-Specific Code

For provider-specific verification and event types, install the relevant skill from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills):

```sh
npx skills add hookdeck/webhook-skills --skill stripe-webhooks
npx skills add hookdeck/webhook-skills --skill shopify-webhooks
npx skills add hookdeck/webhook-skills --skill github-webhooks
```

Each provider skill includes:
- Verification code for the provider's signature format
- Event type reference (which events to listen for)
- Framework examples (Express, Next.js, FastAPI)

## Hookdeck Signature Verification

When Hookdeck forwards events to your destination, it adds an `x-hookdeck-signature` header (HMAC SHA-256, base64-encoded). Verify this to confirm the request came from Hookdeck.

See [verification-code.md](verification-code.md) for complete handler code in Express, Next.js, and FastAPI. Working examples are in [examples/](../examples/).

### Quick Reference (Express)

```javascript
const crypto = require('crypto');

function verifyHookdeckSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha256', secret)
    .update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature), Buffer.from(hash)
    );
  } catch { return false; }
}

// Use express.raw() -- NOT express.json() -- for signature verification
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-hookdeck-signature'];
  if (!verifyHookdeckSignature(req.body, sig, process.env.HOOKDECK_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  const payload = JSON.parse(req.body.toString());
  // Process event...
  res.json({ received: true });
});
```

## Defense in Depth

If you configured [Source Authentication](https://hookdeck.com/docs/authentication) (e.g., `--source-type STRIPE`), Hookdeck verifies the provider's signature before forwarding. You can then also verify the Hookdeck signature for an additional layer of security.

When Source Authentication is enabled, forwarded requests include the `x-hookdeck-verified: true` header, confirming the provider's signature was valid.

**Recommended approach:**

1. Configure Source Authentication on the Source (provider verification at the edge)
2. Verify the Hookdeck signature in your handler (confirms the request came from Hookdeck)

## Environment Setup

Create a `.env` file:

```bash
# Required for Hookdeck signature verification
# Dashboard → Project Settings → Secrets → Webhook Signing Secret
HOOKDECK_WEBHOOK_SECRET=your_webhook_signing_secret

# Optional: provider-specific secret (if doing provider verification in your handler too)
# STRIPE_WEBHOOK_SECRET=whsec_...
```

## Next Step

Proceed to [03-listen.md](03-listen.md) to start receiving events locally.
