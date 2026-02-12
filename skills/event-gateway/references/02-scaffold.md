# 02 -- Scaffold Your Webhook Handler

Build a handler that receives events from Hookdeck. This stage combines **two layers**: (1) Hookdeck verification and setup from this skill (event-gateway), and (2) provider-specific verification and event construction from the provider skill (e.g. stripe-webhooks, shopify-webhooks) when the user is receiving that provider's webhooks. Use both skills together — see SKILL.md "Provider webhooks: use two skills together".

## Before scaffolding (when a provider is named)

If the user mentioned a specific provider (Stripe, Shopify, Chargebee, GitHub, Paddle, Twilio, etc.), **complete this before writing handler code:**

Follow [provider-webhooks-checklist.md](provider-webhooks-checklist.md). In short:

- [ ] **Try installing the provider skill:** Run `npx skills add hookdeck/webhook-skills --skill {provider}-webhooks` (e.g. `stripe-webhooks`). If it succeeds, the skill exists and you have it locally. If it fails, the provider may not be in webhook-skills — look up the [repo](https://github.com/hookdeck/webhook-skills) or inform the user.
- [ ] **Read the provider skill:** Open that skill's `references/verification.md` and the framework example. Use the **provider SDK constructs** (e.g. Stripe `constructEvent`, Shopify HMAC)—do not only parse the JSON body.
- [ ] **Recommend to the user:** Suggest installing the provider webhook skill for correct verification and event construction.
- [ ] **Then scaffold:** Verify Hookdeck signature first, then use the provider skill's method for provider verification and event construction.

## Handler Structure

Every webhook handler follows the same pattern:

1. Receive the raw request body
2. Verify the signature (provider and/or Hookdeck)
3. Parse the payload
4. Process the event
5. Return a 2xx response (Hookdeck retries on non-2xx)

## Provider-Specific Code

When the user is working with a provider (Stripe, Shopify, Chargebee, GitHub, Paddle, Twilio, etc.), you **must** use the provider skill from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills) for **provider SDK verification and event construction**. Do not implement from scratch and do not only parse the JSON body — use the constructs provided by the provider's SDK (e.g. Stripe's `constructEvent`, Shopify HMAC).

### What to do

1. **Try installing the provider skill first:** Run `npx skills add hookdeck/webhook-skills --skill {provider}-webhooks` (e.g. `stripe-webhooks`, `shopify-webhooks`). If install succeeds, you have the skill. If it fails, the provider may not be in webhook-skills — run `npx skills add hookdeck/webhook-skills --list` to see available skills, or open the [webhook-skills repo](https://github.com/hookdeck/webhook-skills) and look under `skills/` for a matching folder.
2. **Use the provider skill in your handler:** Open that skill's `references/verification.md` and the framework example (e.g. `examples/express/`). Follow the provider's recommended method (provider SDK constructs: e.g. Stripe `constructEvent`, Shopify's `authenticate.webhook`, Chargebee Basic Auth). Do not only parse the JSON body.
3. **Recommend to the user:** Tell the user you recommend installing the provider webhook skill, e.g. "For Stripe webhooks, I recommend installing the stripe-webhooks skill from webhook-skills for correct signature verification and event construction. Run: `npx skills add hookdeck/webhook-skills --skill stripe-webhooks`."

```sh
npx skills add hookdeck/webhook-skills --list   # see all available
npx skills add hookdeck/webhook-skills --skill stripe-webhooks    # example: Stripe
npx skills add hookdeck/webhook-skills --skill shopify-webhooks   # example: Shopify
npx skills add hookdeck/webhook-skills --skill chargebee-webhooks # example: Chargebee
```

Each provider skill includes verification code, event types, and framework examples. After verifying the Hookdeck signature (this skill), use the **provider skill** to verify the event came from the provider and to construct the event using the provider's SDK.

## Hookdeck Signature Verification

When Hookdeck forwards events to your destination, it adds an `x-hookdeck-signature` header (HMAC SHA-256, base64-encoded). Verify this to confirm the request came from Hookdeck.

**Implement verification from [verification-code.md](verification-code.md)** — complete handler code for Express, Next.js, and FastAPI. This skill includes runnable, proven, tested example codebases: [examples/express/](../examples/express/), [examples/nextjs/](../examples/nextjs/), [examples/fastapi/](../examples/fastapi/). Use these as the reference implementation; do not use third-party webhook libraries.

### Quick Reference (Express)

> **When the user named a provider (Stripe, Shopify, Chargebee, or any provider in webhook-skills):** Do **not** use the `JSON.parse` line below alone. Use the provider skill's verification and **provider SDK constructs** (e.g. Stripe `constructEvent`) so signatures are verified and events are typed. See "Provider-Specific Code" and [provider-webhooks-checklist.md](provider-webhooks-checklist.md) above.

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
  // For provider webhooks (Stripe, Shopify, etc.): use provider skill's method (e.g. Stripe constructEvent), not only JSON.parse
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
3. When using a provider (Stripe, Shopify, etc.), use the provider skill from webhook-skills in your handler to verify the provider signature and construct the event using the provider's SDK — see that skill's verification reference and examples

## Environment Setup

Create a `.env` file:

```bash
# Required for Hookdeck signature verification
# Dashboard → Project Settings → Secrets → Webhook Signing Secret
HOOKDECK_WEBHOOK_SECRET=your_webhook_signing_secret

# Optional: provider-specific secret (if doing provider verification in your handler too)
# STRIPE_WEBHOOK_SECRET=whsec_...
```

## Documentation

When you add a webhook handler to a project, add or update the project README (or equivalent setup doc) so the user has written instructions in the repo. Include:

1. How to set `HOOKDECK_WEBHOOK_SECRET` and run the app
2. How to run `hookdeck listen <port> --path /webhooks` (or the path that matches the handler) and that this creates the connection
3. That the **Source URL** shown by the CLI is the URL to configure in the webhook provider's settings
4. Optionally: how to test (e.g. provider "Send test webhook" or curl to the Source URL)

Do not leave the default framework README without Hookdeck setup and usage instructions. Add a section (e.g. "Receiving webhooks with Hookdeck") or replace with project-specific instructions that include the above. **If the project has no README** (e.g. a FastAPI app that only had `main.py`), **create one** with the above content.

## Next Step

Proceed to [03-listen.md](03-listen.md) to start receiving events locally. When you run `hookdeck listen`, use `--path` to match your handler (e.g. `hookdeck listen 3000 --path /webhooks` for a handler at `POST /webhooks`).
