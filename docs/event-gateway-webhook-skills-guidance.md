# Event Gateway skill: guiding agents to webhook-skills

This doc summarizes research and concrete recommendations for getting the Event Gateway skill to reliably direct agents (and users) to the [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills) repo and to use provider skills (e.g. stripe-webhooks) instead of only parsing JSON.

## What we know

### From official docs and skills.sh

- **Progressive disclosure** (Anthropic): Only skill **metadata** (name + description) is always in context. The full SKILL.md loads when the skill is "triggered" based on the description. So the **description** drives both discovery and when the agent bothers to read the rest.
- **Compose capabilities**: Docs say "Combine Skills to build complex workflows." Cross-skill composition is intended, but the mechanism is **instructions inside a skill** that tell the agent to run a command (`npx skills add ...`) or look up another repo—not automatic loading of a second skill.
- **Best practices** (Anthropic): Use **workflows with checklists** for complex tasks; use **low freedom** (exact steps) when the sequence must be followed; keep references **one level deep** from SKILL.md; descriptions must be **specific** and include **when to use** and key terms.
- **skills.sh**: Top skills (find-skills, agent-tools, vercel-react-best-practices, skill-creator) are mostly self-contained. Your **hookdeck** skill already does a "router" pattern (points to event-gateway, outpost, and mentions webhook-skills). The event-gateway skill is the one that must **force** the provider path.

### Why the agent skipped webhook-skills in the Stripe run

1. The event-gateway skill offers a **fast path**: verification-code.md + 02-scaffold give a working handler (Hookdeck verify + `JSON.parse`) without ever leaving the skill. The agent optimized for that.
2. The **description** doesn't mention "Stripe," "provider," or "webhook-skills," so there's no strong signal that "receive Stripe webhooks" implies "must also use provider skill."
3. **02-scaffold** includes an Express Quick Reference that shows `JSON.parse(req.body.toString())` with no "except for Stripe/Shopify" callout—so the agent can copy that and add event handlers.
4. There is no **mandatory first step** (e.g. "before writing handler code, run … or fetch …") that forces the agent to look at webhook-skills when a provider is named.

## Recommendations

### 1. Strengthen the skill description (high impact)

Add provider- and webhook-skills-related terms so that when the user says "Stripe webhooks" (or Shopify, etc.) the description match is strong and the full skill loads with the right framing.

**Current** (simplified):  
*"Comprehensive guide to the Hookdeck Event Gateway for receiving, routing, and delivering webhooks and events…"*

**Suggested addition** (within 1024 chars):  
*"For provider webhooks (Stripe, Shopify, Chargebee, GitHub, etc.), use together with the matching skill from hookdeck/webhook-skills; do not only parse JSON—use provider SDK verification and event construction (e.g. Stripe constructEvent)."*

This lives in the YAML frontmatter and is always in context, so it primes the model for "provider → webhook-skills."

### 2. Mandatory first step when a provider is named (high impact)

Turn "use webhook-skills for providers" into a **low-freedom workflow**: a checklist the agent must complete before writing handler code.

In **SKILL.md** and **02-scaffold.md**, add an explicit **first step** for provider tasks:

- **If the user mentions a specific provider (Stripe, Shopify, Chargebee, GitHub, Paddle, Twilio, etc.):**
  1. **Before** writing handler code: run `npx skills add hookdeck/webhook-skills --list` and install the matching skill, e.g. `npx skills add hookdeck/webhook-skills --skill stripe-webhooks`, **or** fetch the [webhook-skills README](https://github.com/hookdeck/webhook-skills) and the provider’s `references/verification.md` (e.g. from `skills/stripe-webhooks/references/verification.md`).
  2. Then open that skill’s verification reference and the framework example (e.g. `examples/express/`) and use them for provider signature verification and event construction.
  3. Only then scaffold the handler (Hookdeck verify first, then provider verify + construct event).

Phrase it as a **checklist** in 02-scaffold (and optionally in SKILL.md):

```markdown
When a provider is named (Stripe, Shopify, …), complete before scaffolding:
- [ ] Ran `npx skills add hookdeck/webhook-skills --list` and installed the matching skill (e.g. `--skill stripe-webhooks`), or fetched webhook-skills repo and provider’s verification doc
- [ ] Read that skill’s references/verification.md and the framework example
- [ ] Handler will: verify Hookdeck signature first, then use provider skill’s method (e.g. Stripe constructEvent); will not only JSON.parse
```

This matches Anthropic’s “workflow with checklist” and “low freedom when sequence matters” guidance.

### 3. Remove or narrow the “fast path” that bypasses the provider skill (high impact)

In **02-scaffold.md**, the **Quick Reference (Express)** shows:

```javascript
const payload = JSON.parse(req.body.toString());
```

Add a **callout** directly above or after that snippet:

- *"For Stripe, Shopify, Chargebee, or any provider in webhook-skills: do **not** use this snippet alone. Use the provider skill’s verification and event construction (e.g. Stripe SDK `constructEvent`). See 'Provider-Specific Code' above."*

Optionally, move the generic “parse payload” snippet into a subsection like “Generic payload (no provider)” and state that when the user names a provider, that path does not apply.

### 4. Explicitly tell the agent to suggest installation to the user (medium impact)

Add one short instruction in SKILL.md (and optionally 02-scaffold) under the provider webhooks section:

- *"Suggest to the user: 'For [Stripe] webhooks, I recommend installing the stripe-webhooks skill from webhook-skills for correct signature verification and event construction. Run: `npx skills add hookdeck/webhook-skills --skill stripe-webhooks`.' Then use that skill’s references and examples when building the handler."*

So the agent both **installs or looks up** the provider skill and **tells the user** to install it, reinforcing the behavior and making the dependency visible.

### 5. Single reference file for “provider webhooks checklist” (medium impact)

Add **references/provider-webhooks-checklist.md** (or similar) and link to it from SKILL.md and 02-scaffold. Keep it one level deep. Contents:

- When the user mentions Stripe/Shopify/Chargebee/GitHub/Paddle/Twilio/etc.:
  1. Run `npx skills add hookdeck/webhook-skills --skill <provider>-webhooks` (or fetch repo + provider’s verification doc).
  2. Open that skill’s `references/verification.md` and the framework example.
  3. In the handler: verify Hookdeck first, then provider verification + event construction (e.g. Stripe `constructEvent`). Do not only `JSON.parse`.

Then in SKILL.md / 02-scaffold: *"When a provider is named, follow [references/provider-webhooks-checklist.md](references/provider-webhooks-checklist.md) before scaffolding."*

This gives one place to look and keeps the main files concise.

### 6. Reference webhook-skills repo contents explicitly (medium impact)

In the Event Gateway skill, add a short subsection or bullet list that describes **what’s in** webhook-skills so the agent doesn’t have to guess:

- **Repo**: https://github.com/hookdeck/webhook-skills  
- **Contents**: One folder per provider under `skills/` (e.g. `stripe-webhooks`, `shopify-webhooks`, `chargebee-webhooks`). Each has:
  - `references/verification.md` — provider signature verification and event construction (e.g. Stripe SDK `constructEvent`)
  - `examples/express/`, `examples/nextjs/`, `examples/fastapi/` — runnable examples
- **Install**: `npx skills add hookdeck/webhook-skills --list` then `npx skills add hookdeck/webhook-skills --skill <name>-webhooks`

You can put this in the new provider-webhooks-checklist.md or in SKILL.md under “Provider webhooks: use two skills together.”

---

## Do we need one skill to encompass everything?

**Short answer: No—but the skill that *orchestrates* (event-gateway) must make the provider path mandatory and remove the easy “only JSON.parse” path.**

- **Official stance**: Skills are meant to be composed. The event-gateway skill *referencing* webhook-skills and instructing the agent to install or fetch them is the intended pattern.
- **What’s missing**: The current wording doesn’t make that path **obligatory** or **first**. The agent can satisfy the user with Hookdeck + JSON parsing; the skill doesn’t force a “provider? → webhook-skills first” step.
- **Alternative**: You could **embed** Stripe (and other providers) inside the event-gateway skill (e.g. `references/stripe-verification.md` with `constructEvent`). That would guarantee the agent has the guidance in one place. Downsides: duplicate content with webhook-skills, larger skill, two sources of truth.

**Recommendation**: Keep event-gateway and webhook-skills separate, but (1) make the description and workflow **require** the provider path when a provider is named, (2) remove or qualify the JSON-only snippet, and (3) add the checklist and optional provider-webhooks-checklist.md. If after that the agent still skips webhook-skills in automated runs, consider **pre-installing** the provider skill in the scenario tester for receive-provider-webhooks so the agent at least has it in `.claude/skills/` and the remaining requirement is “use it” rather than “install it.”

---

## Summary of changes to make

| Priority | Where | What |
|----------|--------|------|
| High | SKILL.md frontmatter | Add to description: provider webhooks (Stripe, …), use with webhook-skills, do not only parse JSON. |
| High | SKILL.md + 02-scaffold.md | Add mandatory “when provider named” checklist: install/look up webhook-skills → read verification + example → then scaffold; do not only JSON.parse. |
| High | 02-scaffold.md Quick Reference | Add callout: for Stripe/Shopify/etc. do not use JSON.parse alone; use provider skill’s verification and constructEvent. |
| Medium | SKILL.md / 02-scaffold | Instruct agent to suggest to user: “I recommend installing stripe-webhooks…” and then use that skill. |
| Medium | New file | references/provider-webhooks-checklist.md with short steps; link from SKILL.md and 02-scaffold. |
| Medium | SKILL.md or new ref | Short “what’s in webhook-skills” (repo layout, verification.md, examples, install command). |

After these updates, re-run the receive-provider-webhooks (Stripe) scenario and check run.log for mentions of webhook-skills and the handler for Stripe SDK usage (e.g. `constructEvent`).
