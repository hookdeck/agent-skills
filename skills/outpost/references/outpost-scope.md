# Outpost integration scope (agent ladder)

Condensed from the [Hookdeck Outpost agent prompt template](https://github.com/hookdeck/outpost/blob/main/docs/agent-evaluation/hookdeck-outpost-agent-prompt.md). **Placeholders** (`{{TOPICS_LIST}}`, `{{TEST_DESTINATION_URL}}`, injected API base) stay **dashboard-only**; this file is the reusable ladder for skills and chat.

## Three paths

1. **Quick path** — Smallest runnable artifact: one shell script (curl) or **one source file** per the official **quickstart** (`npx tsx`, `python`, `go run`, …). No app framework, no multi-route server, no dev-server “project,” unless the user clearly asked for an app.
2. **New minimal application** — A **new** small service or UI (pages, forms, demo in a browser). Official **server SDK** for the stack they name; stay framework-agnostic unless they specify a framework.
3. **Existing application** — Changes **inside their repo**. Same SDK-on-server rules; integrate on **real** domain paths. Use full-stack BFF + UI guidance when the product already has customer-facing settings.

**Default when ambiguous:** Prefer **Quick path**. If they only name a language (“TypeScript example,” “try it”) and do **not** ask for an app, UI, pages, or repo integration → deliver **only** the quickstart-shaped artifact (or curl if no language).

**Language ≠ architecture:** TypeScript / Python / Go pick **which quickstart and SDK**. They do **not** mean “build a web application.”

## Mapping hints

| They said | Likely path |
|-----------|-------------|
| “Example,” “quickstart,” “fastest,” “simplest,” “just show me,” or only a language with no app context | Quick path |
| “Small app,” “UI,” “page,” “form,” “demo site,” “dashboard” (greenfield) | New minimal application |
| “Our app,” “existing code,” “add to my API,” “integrate into this repo” | Existing application |

When two paths seem possible, prefer **Quick path** unless they clearly want UI or repo integration.

## Language → doc

- No language + simplest → **curl quickstart** + OpenAPI.
- TypeScript / Node → **TypeScript quickstart** + `@hookdeck/outpost-sdk`.
- Python → **Python quickstart** + `outpost_sdk` (e.g. `publish.event` uses `request={...}`, not TS-style kwargs).
- Go → **Go quickstart** + official Go SDK.
- curl / HTTP only / REST without SDK → **curl quickstart** + OpenAPI.

Do **not** mix argument styles across languages.

## Test webhook destination URLs

For a **disposable webhook URL** in examples or READMEs, default to **[Hookdeck Console](https://console.hookdeck.com)** (create a Source; use the `https://hkdk.events/…` URL as the destination URL in curl). Do **not** use fictional Hookdeck paths like `https://hookdeck.com/webhook/create`. Avoid third-party echo sites (e.g. `webhook.site`) unless the user asked for one.

## Topic reconciliation (domain-first)

Derive **`topic`** strings from **real state changes**. If the project’s configured topic list is missing a name the app should emit, **do not** bend the product model to fit the list—tell the operator to **add the topic in Hookdeck** and refresh their prompt/config. Only narrow publishes when they **explicitly** ask for a minimal wiring demo.

## SDK vs OpenAPI (BFF / dashboard UI)

- Prefer the **official server SDK** when Hookdeck provides one for the backend language ([SDKs](https://hookdeck.com/docs/outpost/sdks)).
- **Wire JSON** matches **OpenAPI** (often **snake_case**); SDKs rename in language types (e.g. TypeScript **camelCase**).
- The **browser** should see the JSON your BFF actually returns—or **normalize** (e.g. forward raw `GET /destination-types`).
- On create/update, schema fields’ **`key`** maps into `config` / `credentials` per OpenAPI.

Detail: [Building your own UI — authentication](https://hookdeck.com/docs/outpost/guides/building-your-own-ui#authentication) and [Wire JSON, SDK responses, and your UI](https://hookdeck.com/docs/outpost/guides/building-your-own-ui#wire-json-sdk-responses-and-your-ui).

## Minimum depth (existing app)

1. **Topic reconciliation** — every `topic` in `publish` exists in the project **or** the operator is told exactly which topics to add.
2. **Domain publish** — at least one **`publish` on a real state-change path**, not only a synthetic test route (unless scoped to wiring-only).
3. **Same tenant mapping** everywhere you call Outpost for that customer.
