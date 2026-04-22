# Agent Scenario Tester

A tool for evaluating whether AI agents can successfully use [Hookdeck agent skills](https://github.com/hookdeck/agent-skills) to accomplish real tasks.

## What This Does

The agent scenario tester installs Hookdeck's agent skills into Claude Code, gives it a realistic developer task (like "receive webhooks from Stripe"), lets the agent run, and scores the output against a rubric. It answers the question: **can agents actually use these skills to get things done?**

This is Layer 2 of Hookdeck's agent skills testing — the evaluation layer. (Layer 1 is static quality linting via Tessl.) See [TESTING.md](../../TESTING.md) for the full picture.

## Why This Exists

When you build resources for AI agents, you lose the traditional feedback loops. Developers file support tickets and ask questions on Discord. Agents don't — they either succeed or silently move on. Evals are the feedback loop you get back.

The tester runs three scenarios that test increasingly interesting agent behaviors:

| Scenario | Tests | Key question |
|----------|-------|-------------|
| `receive-webhooks` | Core skill usage | Can the agent follow the skill to set up webhook receiving? |
| `receive-provider-webhooks` | Composition | Does the agent discover and install a Stripe-specific skill on its own? |
| `investigate-delivery-health` | Discovery | Does the agent find diagnostic tools (CLI metrics, MCP) when they aren't mentioned in the prompt? |

Each run produces a `report.md` scored against a rubric of 17–19 points covering: skill discovery, setup, scaffold, listen, iterate, code quality, and composition.

## Usage

### From repo root (recommended)

```bash
./scripts/test-agent-scenario.sh run receive-webhooks express
./scripts/test-agent-scenario.sh assess receive-provider-webhooks-express-stripe-20260212145955.
```

### From this directory

Path to the entrypoint is **relative to cwd**. Use `src/index.ts` (not `tools/agent-scenario-tester/src/index.ts`):

```bash
# list / run (from repo root is easier)
npx tsx src/index.ts list
npx tsx src/index.ts assess receive-provider-webhooks-express-stripe-20260212145955.
# or
npm run assess -- receive-provider-webhooks-express-stripe-20260212145955.
```

`assess` infers scenario/framework/provider from the result directory name and updates `test-results/<dir>/report.md`.

## Output

Each scenario run produces a result directory under `test-results/` containing:

- `report.md` — Detailed rubric scoring with pass/fail for each criterion
- `transcript.json` — Full agent transcript showing every tool call, doc access, and decision
- Agent-generated code artifacts (the actual code the agent wrote)

## The Iteration Loop

The workflow is: run scenarios, read the reports, improve the skills (or the tester itself), re-run, compare scores. CI runs these weekly to catch regressions.

The A/B unit is **skill version x scenario set -> score delta**. Change a skill, re-run, see if agents perform better.

## Related

- [TESTING.md](../../TESTING.md) — Full testing strategy: both layers, scoring approaches, and context
- [Agent Skills spec](https://www.agent-skills.dev/) — The open specification for agent skills
- [Outpost agent evaluation](https://github.com/hookdeck/outpost/tree/main/docs/agent-evaluation) — The next layer up: evaluating complete onboarding journeys, not just individual skills
