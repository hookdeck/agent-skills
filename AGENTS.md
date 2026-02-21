# AGENTS.md

Instructions for AI agents working on the Hookdeck Agent Skills repository.

Read this file before creating, modifying, or reviewing any skill in this repo.

## Specification

All skills MUST conform to the [Agent Skills specification](https://agentskills.io/specification) and follow the [authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

### Hard constraints

- Every skill is a directory under `skills/` containing a `SKILL.md` file
- `SKILL.md` must have YAML frontmatter with `name` and `description`
- `name`: max 64 chars, lowercase `a-z`, numbers, and hyphens only. Must match the parent directory name exactly. No consecutive hyphens. Cannot start or end with a hyphen.
- `description`: max 1024 chars. Third person. Describes what the skill does AND when to use it with specific trigger phrases.
- SKILL.md body: **under 500 lines** (< 5000 tokens). Move detailed content to `references/` files.
- File references: **one level deep** from SKILL.md only. SKILL.md links to reference files; reference files do not chain to other reference files.
- Reference files over 100 lines: include a table of contents at the top.
- Progressive disclosure: `name` and `description` are loaded at startup for all skills. Full SKILL.md is loaded when the skill is activated. Reference files are loaded only on demand.

### Authoring principles

- **Only add context agents don't already have.** Agents know what webhooks are, what HMAC-SHA256 is, what REST APIs are. Provide Hookdeck-specific knowledge: URL formats, CLI commands, filter operators, Source Types, configuration patterns.
- **Descriptions in third person** with trigger phrases: "Comprehensive guide to the Hookdeck Event Gateway... Use for any Hookdeck Event Gateway task including receiving webhooks..."
- **Provide a default approach, not a menu of options.** "Use `hookdeck listen` for local development" not "You can use hookdeck listen, or ngrok, or localtunnel..."
- **Avoid time-sensitive information.** Link to live docs instead of embedding dates or version predictions.
- **Consistent terminology** throughout all files (see glossary below).
- **Match freedom to fragility.** High freedom for general guidance, low freedom for specific CLI commands or API calls that must be exact.

---

## Branding

- **Hookdeck** = the company brand, carried by the repo name (`hookdeck/agent-skills`)
- **Event Gateway** ("Hookdeck Event Gateway") = the inbound product. Receives, routes, processes, and delivers webhooks/events. [Docs](https://hookdeck.com/docs/).
- **Outpost** ("Hookdeck Outpost") = the outbound product. Open-source infrastructure for sending webhooks and events to user-preferred destinations (HTTP, SQS, RabbitMQ, Pub/Sub, EventBridge, Kafka). [Docs](https://outpost.hookdeck.com/docs/). [GitHub](https://github.com/hookdeck/outpost).

Skills are prefixed by product name: `event-gateway` or `outpost`. The company brand is not repeated in skill names because it's carried by the repo.

---

## Terminology glossary

ALWAYS use these exact terms. Inconsistency confuses agents and users.

- **[Source Authentication](https://hookdeck.com/docs/authentication)** -- the feature for authenticating inbound requests at the source level. Encompasses: HTTP/webhook signature verification (HMAC), Basic Auth, and API Key. NOT "Source Verification" (even though the API model property is `source.verification`). See also [configuring source authentication](https://hookdeck.com/docs/sources#add-source-authentication).
- **[Source Types](https://hookdeck.com/docs/sources#source-types)** -- platform presets (e.g., "Stripe", "Shopify", "GitHub") that auto-configure source authentication settings for a provider. NOT "source templates" or "source providers."
- **[Destination Authentication](https://hookdeck.com/docs/authentication#destination-authentication)** -- how Hookdeck authenticates to your application when forwarding events. Methods: Hookdeck signature (default), custom SHA-256 signature, Basic Auth, API Key, Bearer token. NOT "Destination Verification."
- **[Hookdeck Signature](https://hookdeck.com/docs/authentication#hookdeck-webhook-signature-verification)** -- the `x-hookdeck-signature` HMAC-SHA256 header that Hookdeck adds to forwarded requests. NOT "webhook signature" (ambiguous -- could mean the original provider's signature).
- **[Connection](https://hookdeck.com/docs/connections)** -- the route between a [Source](https://hookdeck.com/docs/sources) and a [Destination](https://hookdeck.com/docs/destinations), with optional rules (filter, transform, retry, delay, deduplicate). NOT "route," "pipeline," or "channel."
- **[Event](https://hookdeck.com/docs/events)** -- a processed, routed webhook delivery within Hookdeck. NOT "message" or "notification."
- **[Request](https://hookdeck.com/docs/requests)** -- the raw inbound webhook received by a Source. NOT "incoming webhook" when referring to the Hookdeck data model specifically.
- **[Attempt](https://hookdeck.com/docs/events)** -- a single delivery try to a Destination. Documented on the [Events & Attempts](https://hookdeck.com/docs/events) page. NOT "delivery" when referring to the Hookdeck data model specifically.
- **[Rules](https://hookdeck.com/docs/connections)** -- processing logic attached to a Connection: [filter](https://hookdeck.com/docs/filters), [transform](https://hookdeck.com/docs/transformations), [retry](https://hookdeck.com/docs/retries), delay, [deduplicate](https://hookdeck.com/docs/deduplication). NOT "middleware" or "plugins."

---

## Repository structure

```
hookdeck/agent-skills/
  skills/
    hookdeck/                          # Skill router -- dispatches to product skills
      SKILL.md
    event-gateway/                     # ONE comprehensive skill
      SKILL.md                         # ~90 lines: use cases, staged workflow, reference tables
      references/
        # How to reference docs
        referencing-docs.md            # How to fetch Hookdeck docs as .md

        # Staged workflow (sequential -- new integration)
        01-setup.md                    # Account, CLI, project, create connection
        02-scaffold.md                 # Build handler (references webhook-skills for provider code)
        provider-webhooks-checklist.md # When provider named: checklist before scaffold, try install, use provider SDK
        03-listen.md                   # hookdeck listen, test events
        04-iterate.md                  # Debug, fix, replay (CLI TUI, web console, Dashboard)

        # Reference material (on-demand)
        connection-architecture.md     # Decision tree for structuring connections
        connection-rules.md            # Consolidates: filters, transforms, retries, dedup
        authentication.md              # Source vs destination auth decision tree
        cli-workflows.md               # CLI command workflows, project management
        api-patterns.md                # REST API patterns, bulk ops, publish
        monitoring-debugging.md        # Event lifecycle, troubleshooting, replay
        verification-code.md           # Hookdeck signature verification code + gotchas
        terminology-gotchas.md         # Glossary + collected common mistakes
      examples/                        # Working sample code
        express/                       # Hookdeck signature verification handler
        nextjs/                        # Hookdeck signature verification handler
        fastapi/                       # Hookdeck signature verification handler
    outpost/                           # Outpost skill (separate product)
      SKILL.md
  AGENTS.md                            # This file
  CLAUDE.md
  CONTRIBUTING.md
  LICENSE
  README.md
  TESTING.md
```

### Naming convention

- Skill directory name must exactly match the `name` field in its SKILL.md frontmatter
- Product prefix: `event-gateway` or `outpost`
- Install command: `npx skills add hookdeck/agent-skills --skill event-gateway`

---

## Staged workflow

The `event-gateway` skill uses a 4-stage integration workflow:

1. **01-setup** -- Account, CLI install, create connection
2. **02-scaffold** -- Build webhook handler (the composition point with `hookdeck/webhook-skills`)
3. **03-listen** -- Start `hookdeck listen`, trigger test events
4. **04-iterate** -- Debug, fix, replay

Follow these stages in order for a new Hookdeck integration. The reference files (connection-rules, authentication, etc.) are used on-demand as needed during any stage.

### Composition with webhook-skills

Stage 02 is the **composition point** where provider-specific knowledge from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills) meets Hookdeck integration code from this repo. When a provider is named (Stripe, Shopify, etc.):

- **Before scaffolding:** Follow `event-gateway/references/provider-webhooks-checklist.md`. Try installing the provider skill first (`npx skills add hookdeck/webhook-skills --skill <provider>-webhooks`) to verify it exists; if install fails, the provider may not be in webhook-skills. Recommend to the user that they install the provider webhook skill.
- Use **provider SDK constructs** (e.g. Stripe `constructEvent`, Shopify HMAC)—not only `JSON.parse`. Keep guidance generic: refer to "provider SDK verification and event construction" and use Stripe/Shopify as examples.
- Layer Hookdeck signature verification on top using `verification-code.md` and `examples/`.

---

## Content principles

### Always link to live docs -- inline

Skills are static files that become stale as the product evolves. Every SKILL.md and every reference file MUST include links to the canonical documentation pages so agents can fetch current information when needed.

**Link inline, not in a consolidated section.** When an entity, concept, or feature is first mentioned, link it directly to the relevant documentation page.

### Referencing docs as markdown

Most Hookdeck doc pages are available as markdown by appending `.md` to the URL. See `event-gateway/references/referencing-docs.md` for the complete URL index. Use `allowed-tools: WebFetch` in SKILL.md frontmatter to let agents pull live docs on demand.

### What belongs in SKILL.md vs references

**SKILL.md:** Concise overview, key concepts, decision trees, quick copy-pasteable examples, links to reference files and live docs. Under 500 lines.

**references/:** Detailed how-tos, full option lists, CLI command references, configuration specifics, operator tables. Loaded on demand.

Rule of thumb: if content is needed for every task involving this skill, it belongs in SKILL.md. If it's only needed for a specific sub-task, put it in a reference file.

### Prescriptive guidance over syntax documentation

Reference files should teach the agent **how to think** about the problem. Provide decision trees, top patterns, and common gotchas. Link to live docs for comprehensive syntax reference. Follow the Neon model: minimal examples, point to live docs for the rest.

### Working examples

The `examples/` directory contains runnable code (Express, Next.js, FastAPI Hookdeck verification handlers). Stage `02-scaffold` references these for agent scaffolding. Keep examples focused on the minimum needed to demonstrate the pattern.

---

## Relationship to webhook-skills

This repo (`hookdeck/agent-skills`) is the **depth layer**. The [`hookdeck/webhook-skills`](https://github.com/hookdeck/webhook-skills) repo is the **discovery layer**.

| webhook-skills skill | This repo's skill | Relationship |
|---|---|---|
| [`hookdeck-event-gateway`](https://github.com/hookdeck/webhook-skills/tree/main/skills/hookdeck-event-gateway) | `event-gateway` | webhook-skills has product overview; this repo has comprehensive setup + workflow + reference |
| [`hookdeck-event-gateway-webhooks`](https://github.com/hookdeck/webhook-skills/tree/main/skills/hookdeck-event-gateway-webhooks) | `event-gateway` | Both repos have Hookdeck signature verification code + framework examples. This repo is comprehensive: authentication, verification, and working examples |
| [`outpost`](https://github.com/hookdeck/webhook-skills/tree/main/skills/outpost) | `outpost` | webhook-skills has product overview; this repo has setup + detailed configuration |

This repo is self-contained -- Hookdeck users should not need to install skills from webhook-skills for Hookdeck-specific tasks. Provider-specific webhook knowledge (Stripe event types, Shopify verification, etc.) lives in webhook-skills and is referenced from `02-scaffold.md`.

---

## Adding or updating Hookdeck skills

When you are **adding a new skill** or **updating an existing skill** in this repo:

1. **Read this file (AGENTS.md) first.** Follow the Specification, Terminology glossary, Repository structure, and Content principles above.
2. **Use the Skill authoring checklist** at the end of this file before considering the work complete.
3. **When updating the event-gateway skill** (especially provider webhooks, Stage 02, or composition with webhook-skills):
   - Follow and reference `event-gateway/references/provider-webhooks-checklist.md`. The checklist is mandatory before scaffolding when a provider is named.
   - Prefer **try install first:** have the agent run `npx skills add hookdeck/webhook-skills --skill <provider>-webhooks` to verify the provider skill exists; if install fails, fall back to looking up the webhook-skills repo or informing the user.
   - Keep provider guidance **generic:** refer to "provider SDK verification and event construction" and "constructs provided by the provider's SDK" (e.g. Stripe `constructEvent`, Shopify HMAC as examples, not Stripe-only).
   - Instruct the agent to **recommend to the user** that they install the provider webhook skill (e.g. "I recommend installing the stripe-webhooks skill... Run: `npx skills add hookdeck/webhook-skills --skill stripe-webhooks`").
4. **One level deep:** All references from SKILL.md must be to files directly in that skill's directory (e.g. `references/...`). Reference files do not chain to other reference files.
5. **Link to live docs** inline where a concept or feature is first mentioned; do not consolidate links in a single section.

---

## Skill authoring checklist

Before merging a new or updated skill, verify:

### Spec compliance

- [ ] SKILL.md has valid YAML frontmatter with `name` and `description`
- [ ] `name` matches parent directory name exactly
- [ ] `description` is third person with "Use when..." trigger phrases
- [ ] SKILL.md body is under 500 lines
- [ ] All file references are one level deep from SKILL.md
- [ ] Reference files over 100 lines have a table of contents at the top

### Hookdeck conventions

- [ ] Uses correct terminology from the glossary above
- [ ] Links to at least one live documentation page
- [ ] No general webhook/API education that agents already know
- [ ] No time-sensitive information (dates, version predictions)
- [ ] Consistent terminology throughout all files in the skill
- [ ] Skill name has product prefix (`event-gateway` or `outpost`, or `hookdeck` for the skill router)

### Quality

- [ ] Provides Hookdeck-specific value (CLI commands, filter syntax, config patterns, URL formats)
- [ ] Quick examples are copy-pasteable
- [ ] Decision trees or conditional workflows where multiple paths exist
- [ ] Cross-references related skills where appropriate
- [ ] Links work (documentation URLs, relative file paths to references)

---

## Cursor plugin (marketplace)

This repo is packaged as a Cursor Marketplace plugin. The plugin structure lives alongside the Agent Skills format.

### Plugin structure

```
.cursor-plugin/plugin.json    # Manifest (name, displayName, description, version, keywords, skills, rules, logo)
assets/logo.svg               # Hookdeck brand icon (1:1/square)
rules/*.mdc                   # Cursor rules (optional)
CHANGELOG.md                  # Keep a Changelog format, required for marketplace
```

### Skill cross-references

When skills reference other skills, use **fully qualified GitHub URLs**: `[event-gateway](https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md)`. Relative paths are for files within the same skill only (e.g. `references/`).

### Cursor rules (rules/*.mdc)

Rules provide concise, always-on guidance. Keep them minimal; link to skills for depth.

- **Frontmatter:** `description` is required (Cursor validation). Optional: `globs` for file-pattern activation.
- **Format:** No official published spec. Use YAML frontmatter + markdown body. Community conventions vary; the plugin template validates only `description`.
- **Content:** Rules should point to skills via full GitHub URLs. Draw from website mdocs for accuracy.
- **Naming:** Use kebab-case filenames (e.g. `webhook-best-practices.mdc`, `local-webhook-development.mdc`).

### README and install methods

- **Cursor first:** Lead with Cursor plugin install (`/add-plugin hookdeck`). What the plugin does.
- **Retain generic skills:** Keep `npx skills add hookdeck/agent-skills` and full Agent Skills usage for Claude, ChatGPT, and other agents. Do not remove the generic install path.

### Plugin description and keywords

- **Description:** Cover both Event Gateway (receive, queue, route, deliver) and Outpost (send webhooks). Include "test locally with the Hookdeck CLI."
- **Keywords:** Include `webhooks`, `webhook-delivery`, `send-webhooks`, `event-gateway`, `event-destinations`, `local-development`, plus discovery terms from the analysis.

### Worktrees

Use `.worktrees/` for feature branches (gitignored). Example: `git worktree add -b cursor-plugin .worktrees/cursor-plugin main`.
