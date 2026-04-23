# Next.js SaaS Starter

> **Reference in [hookdeck/agent-skills](https://github.com/hookdeck/agent-skills):** this tree is copied from the last successful **Outpost agent eval** for [scenario 08](https://github.com/hookdeck/outpost/blob/main/docs/agent-evaluation/scenarios/08-integrate-nextjs-existing.md) (run `2026-04-10T14-29-04-214Z-scenario-08`, baseline [leerob/next-saas-starter](https://github.com/leerob/next-saas-starter)). It shows a **production-shaped SaaS** with Hookdeck Outpost wired for per-tenant destinations and publishes. A minimal **Vitest** suite (`npm test`) covers Outpost-related wire helpers without a live Outpost server. The eval used **pnpm**; **`pnpm-lock.yaml` is omitted** here so `./scripts/test-examples.sh` and CI can use **npm**.
>
> **For AI agents:** Do not read the whole repo. Start with the skill’s [**Outpost integration map**](https://github.com/hookdeck/agent-skills/blob/main/skills/outpost/references/nextjs-saas-integration-map.md) (file index: SDK client, `publishEvent`, BFF routes, domain call sites, and what to skip).

A Next.js SaaS starter with authentication, Stripe subscriptions, team management, and **outbound webhooks** powered by [Hookdeck Outpost](https://outpost.hookdeck.com).

**Demo: [https://next-saas-start.vercel.app/](https://next-saas-start.vercel.app/)**

## Features

- Marketing landing page (`/`) with animated Terminal element
- Pricing page (`/pricing`) with Stripe Checkout
- Dashboard with CRUD on users/teams
- Basic RBAC (Owner and Member roles)
- Subscription management via Stripe Customer Portal
- Email/password auth with JWTs stored in cookies
- Global middleware for protected routes
- Activity logging for all user events
- **Outbound webhooks** — customers register webhook endpoints in the dashboard and receive real-time event notifications

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org/) |
| Database | [Postgres](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Payments | [Stripe](https://stripe.com/) |
| UI | [shadcn/ui](https://ui.shadcn.com/) |
| Webhooks | [Hookdeck Outpost](https://outpost.hookdeck.com) |

---

## Getting Started

```bash
git clone https://github.com/nextjs/saas-starter
cd saas-starter
pnpm install
```

---

## Running Locally

### 1 — Database

Start a local Postgres instance (Docker):

```bash
docker compose up -d          # starts postgres on :54322
```

Or point `POSTGRES_URL` at any existing Postgres instance.

### 2 — Environment variables

Copy the example and fill in values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Postgres connection string |
| `AUTH_SECRET` | Random secret for JWT signing — `openssl rand -base64 32` |
| `BASE_URL` | App origin e.g. `http://localhost:3000` |
| `STRIPE_MOCK` | Set to `1` to disable all Stripe API usage: `/pricing` shows placeholder plans; checkout redirects to the dashboard; webhook returns 503. Use this for **Outpost-only** local runs and for `next build` without a Stripe account. |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode). Optional when `STRIPE_MOCK=1`. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. Optional when `STRIPE_MOCK=1`. |
| `OUTPOST_API_KEY` | **Server-side only** — Hookdeck Outpost API key (Settings → Secrets in your Outpost project) |

> **Security:** `OUTPOST_API_KEY` is loaded exclusively in server code (`lib/outpost/client.ts` is guarded with `import 'server-only'`). It is never bundled into the client.

**Development without Stripe:** If `STRIPE_MOCK` is not set but `STRIPE_SECRET_KEY` is empty, `/pricing` still uses **placeholder** catalog data (no network calls). Checkout and the customer portal remain disabled until you configure a real key. For **production builds** (`next build`), either configure valid Stripe keys or set **`STRIPE_MOCK=1`** so prerender does not call the Stripe API (invalid or example keys will fail authentication).

### 3 — Migrate and seed the database

```bash
pnpm db:migrate
pnpm db:seed        # creates test@test.com / admin123 + Stripe products (requires real STRIPE_SECRET_KEY; skip if using STRIPE_MOCK=1 only)
```

### 4 — Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5 — Forward Stripe webhooks locally

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Outbound Webhooks (Hookdeck Outpost)

### How it works

This app uses **Hookdeck Outpost** to deliver platform events to your customers' own systems. Each team (tenant) can register one or more **destinations** — webhook URLs, AWS SQS queues, RabbitMQ exchanges, etc. — and subscribe them to specific event topics.

```
Your app                 Outpost                  Customer system
──────────              ─────────               ─────────────────
signUp() ──publish()──▶ fan-out ──HTTP POST──▶  https://customer.example/hooks
inviteTeamMember()       by topic               SQS queue
handleSubscriptionChange                         RabbitMQ exchange
```

The Outpost API key lives **only on the server**. Customers never interact with Outpost directly — they manage their destinations through your dashboard UI at `/dashboard/destinations`.

### Topics published by this app

| Topic | When it fires | Payload fields | In Outpost project? |
|-------|--------------|----------------|---------------------|
| `user.created` | A new user signs up (with or without an invitation) | `id`, `email`, `role`, `teamId` | ✅ already configured |
| `team.member.invited` | An owner sends a team invitation | `invitedEmail`, `role`, `invitedByUserId`, `teamId` | ⚠️ **needs adding** |
| `team.member.removed` | An owner removes a team member | `removedUserId`, `removedByUserId`, `role`, `teamId` | ⚠️ **needs adding** |
| `subscription.updated` | A Stripe subscription is created, changed, or cancelled | `teamId`, `status`, `planName`, `subscriptionId` | ⚠️ **needs adding** |

> **Action required:** Before `team.member.invited`, `team.member.removed`, and `subscription.updated` will route to any destination, add them in your Outpost project:
>
> **Hookdeck dashboard → your project → Topics → Add topic**
>
> Add each name exactly as shown above. The publish calls are already in the code and will silently succeed once the topics exist; no code change is needed.

> The Outpost project currently also has `user.updated`, `order.created`, and `heartbeat` topics — these are not yet published by this app. Wire them up when you add the corresponding domain events.

### Where the code lives

| File | What it does |
|------|-------------|
| `lib/outpost/client.ts` | Singleton `Outpost` SDK client (server-only) |
| `lib/outpost/index.ts` | `upsertTenant()` and `publishEvent()` helpers |
| `lib/outpost/auth.ts` | Resolves the signed-in team → Outpost tenant ID |
| `app/(login)/actions.ts` | Publishes `user.created`, `team.member.invited`, `team.member.removed` |
| `lib/payments/stripe.ts` | Publishes `subscription.updated` via `handleSubscriptionChange()` |
| `app/api/outpost/` | BFF routes — all Outpost API calls stay server-side |

### Tenant mapping

Every team in this app maps 1-to-1 to an Outpost **tenant**. The tenant ID is `String(team.id)`. Outpost tenants are upserted automatically (idempotent) on every sign-up; if a tenant is never upserted before destination creation the BFF `POST /api/outpost/destinations` route handles it.

### Customer webhook registration flow

1. Logged-in user goes to **Dashboard → Destinations**.
2. Clicks **Add Destination**, picks a type (Webhook, SQS, …).
3. Selects which topics to subscribe to (or leaves empty for all topics).
4. Fills in the delivery target (URL, queue ARN, …).
5. The browser calls `POST /api/outpost/destinations` on **your** server, which calls Outpost with the platform API key — the customer never sees the key.
6. Destination is listed immediately. From now on, whenever the app publishes a matching topic for that team, Outpost delivers the event to the customer's endpoint with retries.

### Verifying delivery

Use the **Test Event** button on `/dashboard/destinations` to publish a `user.created` test event. Click any destination row to view its delivery attempts and retry failed ones.

For ad-hoc verification during development, point a webhook destination at the Hookdeck Console source:

```
https://hkdk.events/4unruqkql54jpb
```

---

## Testing Payments

| Field | Value |
|-------|-------|
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date |
| CVC | Any 3 digits |

---

## Going to Production

### Stripe webhook

1. Create a webhook in the Stripe dashboard pointing to `https://yourdomain.com/api/stripe/webhook`.
2. Subscribe to `customer.subscription.updated` and `customer.subscription.deleted`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### Outpost topics

Add the four topics listed above in your Hookdeck Outpost project before deploying.

### Deploy to Vercel

1. Push to GitHub and connect the repo to Vercel.
2. Set all env vars in **Project Settings → Environment Variables**:
   - `BASE_URL` → your production domain
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `POSTGRES_URL`
   - `AUTH_SECRET` → `openssl rand -base64 32`
   - `OUTPOST_API_KEY` → your Outpost API key (**not** exposed to the browser)
