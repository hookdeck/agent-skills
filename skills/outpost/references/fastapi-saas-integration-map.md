# FastAPI SaaS example — Outpost integration map

Use this file **before** browsing the full [examples/fastapi-saas/](../examples/fastapi-saas/) tree. The template is a **full-stack** app (FastAPI + React + Docker). For Outpost work, focus on the **backend BFF** and **domain publish** sites below (same progressive-disclosure idea as [PostHog’s skill guidance](https://posthog.com/handbook/engineering/ai/writing-skills)).

**Do not paste these files into another repository.** Reproduce the same **behavior** (env vars, `outpost.py` BFF patterns, domain publish via `httpx` to `POST …/publish`) in the user’s FastAPI layout and settings system. For FastAPI, `httpx`, and `outpost_sdk` **1.x** pins, see [SKILL.md](../SKILL.md#full-stack-reference-examples-advanced) and [examples/fastapi-saas/backend/pyproject.toml](../examples/fastapi-saas/backend/pyproject.toml).

---

## Mental model

1. **`OUTPOST_API_KEY`** — Server-only (see `app/core/config.py`).
2. **Tenant** — Here, `tenant_id = str(user.id)` (one Outpost tenant per signed-up user).
3. **Browser → your API → Outpost** — Frontend calls `/api/v1/outpost/...` (via generated client / OpenAPI); FastAPI routes in `outpost.py` proxy to Hookdeck Outpost with the admin key.
4. **Domain publish** — Real events (e.g. signup) use `httpx` to `POST …/publish` in background tasks, separate from the dashboard **test-publish** endpoint.

---

## Start here (backend)

| Goal | File(s) |
|------|---------|
| Env defaults (`OUTPOST_API_KEY`, `OUTPOST_API_BASE_URL`) | [backend/app/core/config.py](../examples/fastapi-saas/backend/app/core/config.py) |
| BFF routes: headers, `_base()`, error mapping, destinations, attempts, retry, test publish | [backend/app/api/routes/outpost.py](../examples/fastapi-saas/backend/app/api/routes/outpost.py) |
| Router registration | [backend/app/api/main.py](../examples/fastapi-saas/backend/app/api/main.py) |
| Signup → `user.created` publish (background task) | [backend/app/api/routes/users.py](../examples/fastapi-saas/backend/app/api/routes/users.py) (`_publish_user_created`) |
| Standalone wire tests (no DB, no live Outpost) | [backend/test_outpost_wire.py](../examples/fastapi-saas/backend/test_outpost_wire.py) — mirrors `_raise_for_outpost` in `outpost.py` |

---

## Frontend (optional)

The React app adds dashboard pages that call the OpenAPI client for `/outpost/*`. Only open the frontend when the task is UI-specific; search `outpost` or `webhooks` under [frontend/src/](../examples/fastapi-saas/frontend/src/) after reading `outpost.py`.

---

## What to skip unless asked

- Docker Compose, Traefik, Playwright E2E, generic CRUD (`items`, etc.).
- Full `alembic/` migrations unless aligning tenant identity with your own schema.

This keeps Outpost integration scoped to a **small set of backend files** plus optional frontend routes.
