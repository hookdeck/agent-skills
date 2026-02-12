# Provider webhooks checklist

When the user is receiving webhooks from a **specific provider** (Stripe, Shopify, Chargebee, GitHub, Paddle, Twilio, etc.), complete this checklist **before** scaffolding the handler. The goal is to use the **constructs provided by the provider's SDK** (e.g. Stripe's `constructEvent`, Shopify's HMAC verification)—not only `JSON.parse`.

## What's in webhook-skills

- **Repo:** [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills)
- **Contents:** One folder per provider under `skills/` (e.g. `stripe-webhooks`, `shopify-webhooks`, `chargebee-webhooks`). Each has:
  - `references/verification.md` — provider signature verification and event construction using the provider's SDK
  - `examples/express/`, `examples/nextjs/`, `examples/fastapi/` — runnable examples
- **List skills:** `npx skills add hookdeck/webhook-skills --list`
- **Install one:** `npx skills add hookdeck/webhook-skills --skill <provider>-webhooks` (e.g. `stripe-webhooks`, `shopify-webhooks`)

## Checklist (complete before writing handler code)

When a provider is named, complete in order:

- [ ] **Verify the provider skill exists:** Run `npx skills add hookdeck/webhook-skills --skill <provider>-webhooks` (e.g. `stripe-webhooks`). If install succeeds, you have the skill locally. If it fails (e.g. skill not found), the provider may not be in webhook-skills yet — then open the [webhook-skills repo](https://github.com/hookdeck/webhook-skills) and look under `skills/` for a matching folder, or inform the user.
- [ ] **Read the provider skill:** Open that skill's `references/verification.md` and the framework example (e.g. `examples/express/`). Use the **provider's recommended method** for signature verification and event construction (e.g. Stripe SDK `constructEvent`, Shopify HMAC). Do not only parse the JSON body.
- [ ] **Recommend the skill to the user:** Tell the user you recommend installing the provider webhook skill for correct verification and event handling, e.g. "For Stripe webhooks, I recommend installing the stripe-webhooks skill from webhook-skills. Run: `npx skills add hookdeck/webhook-skills --skill stripe-webhooks`."
- [ ] **Handler design:** Verify Hookdeck signature first (this skill), then use the provider skill's method to verify the provider signature and construct the event. Do not use only `JSON.parse(req.body)` for provider payloads — use the SDK constructs (e.g. Stripe `constructEvent`) so events are typed and signatures are verified.

## Try install first

**Prefer trying to install** the provider skill. Installing confirms the skill exists in the registry; if the install fails, you know the provider may not be supported in webhook-skills and can fall back to looking up the repo or advising the user. Do not assume a provider skill exists without checking (`--list` or install attempt).

## Generic guidance

This applies to **all** providers in webhook-skills. Use the constructs provided by each provider's SDK (Stripe's `constructEvent`, Shopify's HMAC verification, Chargebee's auth, etc.). Keep guidance in skills generic: refer to "provider SDK verification and event construction" and use Stripe or Shopify only as examples.

## After development: going to production

When the user has finished local development and is ready to deploy:

- [ ] **Choose a production path:** **(1) Same project:** Use the same Hookdeck project and connections; update the **Destination** to the production HTTPS endpoint (e.g. `https://api.example.com/webhooks`) via the [Dashboard](https://dashboard.hookdeck.com) or [API](https://hookdeck.com/docs/api). **(2) New project:** Create a [new project](https://hookdeck.com/docs/projects) in Hookdeck and duplicate the setup (Sources, Connections) with Destinations pointing to production HTTPS. In both cases handler code (including Hookdeck and provider verification) is unchanged.
- [ ] **Point to production considerations:** Before going live, direct the user to Hookdeck docs: [rate limiting / max delivery rate](https://hookdeck.com/docs/destinations), [configuring retries](https://hookdeck.com/docs/retries), and [issue triggers & notifications](https://hookdeck.com/docs/issue-triggers) ([Issues](https://hookdeck.com/docs/issues)). The [Receive webhooks quickstart — Deliver to production](https://hookdeck.com/docs/use-cases/receive-webhooks/quickstart#deliver-to-your-production-webhook-endpoint) section and the linked Destinations, Retries, and Issue triggers docs are the source of truth.
- [ ] **Reference:** This skill's production summary: [SKILL.md](../SKILL.md) (Quick Start → Production) and [01-setup.md](01-setup.md) (Branching by Use Case → Production).
