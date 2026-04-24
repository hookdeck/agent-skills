# Before you stop (Outpost) — trimmed checklist

From the [Hookdeck Outpost agent prompt](https://github.com/hookdeck/outpost/blob/main/docs/agent-evaluation/hookdeck-outpost-agent-prompt.md) **Before you stop (verify)**. Apply **only** items that fit the task; skip the rest (e.g. skip full-stack items for a curl-only flow).

## Always (when you produced or changed runnable code)

- [ ] **Ran** the smallest end-to-end check that fits (script once, one new API path, or smoke the UI/API flow) and saw a clear success signal (event id, HTTP 2xx, expected output).
- [ ] **Secrets:** Platform Outpost API key stays **server-side** / **environment** only — not in client bundles, not hard-coded in committed source.
- [ ] **Repeatable:** Env vars, how to run, and how to verify are stated briefly (README, comments, or chat — match task size).

## When editing an existing application

- [ ] **Topic reconciliation:** Every **`topic`** in `publish` is configured in the Outpost project **or** README/chat tells the operator exactly which topics to add in Hookdeck — **domain-first**; do not retarget real features to wrong topic names unless they explicitly asked for a minimal demo scope.
- [ ] **Domain publish:** At least one **`publish` on a real application path** (entity create/update, signup, …), not solely a synthetic “test event” endpoint — unless scoped to wiring-only.
- [ ] **Test publish (if you added one):** Separate from domain logic; does not replace domain publish.
- [ ] **Build integrity:** Lockfiles, route registries, and generated outputs stay consistent so a clean install + typecheck/build (or documented CI) would pass.

## When you added or changed customer-facing destination UI

- [ ] **Full-stack UI bar:** Walked **Planning and contract**, **Destinations experience**, and **Activity, attempts, and retries** in [Building your own UI — implementation checklists](https://hookdeck.com/docs/outpost/guides/building-your-own-ui#implementation-checklists): list → detail → destination-scoped activity; create/edit driven by **`GET /destination-types`** (including each field’s **`key`** in `config` / `credentials`); **separate server-side test publish** when customers manage destinations. *Skip if API-only or operator excluded activity UI—then document verification instead.*
