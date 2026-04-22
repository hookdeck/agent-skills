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

## Prerequisites

- Node.js 18+
- Claude Code CLI (`claude`) installed and authenticated
- Hookdeck account with a valid API key

## Setup

```bash
cd tools/agent-scenario-tester
npm install
```

Set your environment:

```bash
export HOOKDECK_API_KEY=your_api_key
```

## Usage

Run a specific scenario:

```bash
npm run test -- --scenario receive-webhooks
```

Run all scenarios:

```bash
npm run test
```

## Output

Each scenario run produces:

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
