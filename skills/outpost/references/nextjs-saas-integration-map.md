# Next.js SaaS example — Outpost integration map

Use this file **before** opening the full [examples/nextjs-saas/](../examples/nextjs-saas/) tree. The example is a **complete SaaS app** (auth, Stripe, Drizzle, dashboard UI). Agents should treat it as a **patterns reference**, not required reading end-to-end.

**Why a map:** Product skills work best when the entry skill stays small and points to **specific files** for each job-to-be-done (similar to [PostHog’s skill guidance](https://posthog.com/handbook/engineering/ai/writing-skills): overview in `SKILL.md`, details on demand).

---

## Mental model

1. **Admin API key** — Only on the server (`OUTPOST_API_KEY`). Never exposed to the browser.
2. **Tenant** — One Outpost tenant per customer team (here: `String(team.id)` via `toTenantId`).
3. **Publish** — Domain code calls `publishEvent(teamId, topic, data)` after real business actions.
4. **Destinations UI** — Dashboard talks to **your** BFF routes under `app/api/outpost/*`, which call Outpost with the admin key.

You do **not** need to read marketing pages, login forms, or generic CRUD to understand Outpost wiring.

---

## Start here (small set of files)

| Goal | File(s) | Notes |
|------|---------|--------|
| SDK singleton + base URL + `toTenantId` | [lib/outpost/client.ts](../examples/nextjs-saas/lib/outpost/client.ts) | `import 'server-only'`; `@hookdeck/outpost-sdk` |
| Upsert tenant + publish helper | [lib/outpost/index.ts](../examples/nextjs-saas/lib/outpost/index.ts) | `upsertTenant`, `publishEvent` → `outpost.publish.event` |
| Map session → tenant id for API routes | [lib/outpost/auth.ts](../examples/nextjs-saas/lib/outpost/auth.ts) | Used by all BFF routes |
| Normalize destination-type API (optional) | [lib/outpost/destination-types-wire.ts](../examples/nextjs-saas/lib/outpost/destination-types-wire.ts) | Keeps `key` on schema fields when SDK omits them |
| Vitest for wire helper | [lib/outpost/destination-types-wire.test.ts](../examples/nextjs-saas/lib/outpost/destination-types-wire.test.ts) | No live Outpost required |

---

## BFF API routes (`app/api/outpost/`)

All proxy Outpost using the server key; the client only calls same-origin `/api/outpost/...`.

| Route area | Purpose |
|------------|---------|
| [destination-types/route.ts](../examples/nextjs-saas/app/api/outpost/destination-types/route.ts) | List destination types for the create-destination UI |
| [topics/route.ts](../examples/nextjs-saas/app/api/outpost/topics/route.ts) | Topics for checkboxes / validation |
| [destinations/route.ts](../examples/nextjs-saas/app/api/outpost/destinations/route.ts), [destinations/[id]/route.ts](../examples/nextjs-saas/app/api/outpost/destinations/[id]/route.ts) | CRUD destinations for current tenant |
| [test-publish/route.ts](../examples/nextjs-saas/app/api/outpost/test-publish/route.ts) | Synthetic publish for dashboard testing |
| [events/route.ts](../examples/nextjs-saas/app/api/outpost/events/route.ts), [events/[id]/attempts/route.ts](../examples/nextjs-saas/app/api/outpost/events/[id]/attempts/route.ts) | Activity / attempts |
| [retry/route.ts](../examples/nextjs-saas/app/api/outpost/retry/route.ts) | Manual retry |

Open only the route that matches the user’s task (e.g. “add destinations list” → `destinations` + `auth`).

---

## Where domain events are published

| Area | File | Topics / notes |
|------|------|----------------|
| Auth / sign-up | [app/(login)/actions.ts](../examples/nextjs-saas/app/(login)/actions.ts) | `user.created`, team member invite/remove, etc. |
| Stripe webhooks | [lib/payments/stripe.ts](../examples/nextjs-saas/lib/payments/stripe.ts) | e.g. `subscription.updated` |

Search the repo for `publishEvent(` or `outpost.publish` if you need every call site.

---

## Dashboard UI (optional)

- [app/(dashboard)/dashboard/destinations/page.tsx](../examples/nextjs-saas/app/(dashboard)/dashboard/destinations/page.tsx) — Customer-facing destinations + test publish UX. Read **after** the `lib/outpost` + `app/api/outpost` layers if the task is UI-specific.

---

## Env vars (see also example README)

| Variable | Role |
|----------|------|
| `OUTPOST_API_KEY` | Admin API key (server only) |
| `OUTPOST_API_BASE_URL` | Override API base (managed vs self-hosted) |

---

## What to skip unless asked

- `app/(dashboard)/` pages other than destinations (general, security, activity) for pure “wire Outpost” tasks.
- `lib/db/*` except when aligning tenant id with your own schema.
- Stripe and seed scripts unless the task touches subscription-driven publishes.

This keeps integration work scoped to **~10 files** instead of the whole application.
