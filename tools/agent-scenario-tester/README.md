# Agent Scenario Tester

A tool for evaluating whether AI agents can successfully use [Hookdeck agent skills](https://github.com/hookdeck/agent-skills) to accomplish real tasks.

## What This Does

The agent scenario tester installs **one** Hookdeck skill into Claude Code (see `skillUnderTest` in [`scenarios.yaml`](../../scenarios.yaml)), gives it a realistic developer task, lets the agent run, and scores the output with:

1. **Heuristic assessor** — regex-style checks on `run.log` and `README.md` (always on).
2. **Optional LLM-as-judge** — Anthropic Messages API scores the transcript against success criteria (`--judge` or `RUN_LLM_JUDGE=1`; same idea as [Outpost `llm-judge.ts`](https://github.com/hookdeck/outpost/blob/main/docs/agent-evaluation/src/llm-judge.ts)).

This is Layer 2 of Hookdeck's agent skills testing — the evaluation layer. (Layer 1 is static quality linting via Tessl.) See [TESTING.md](../../TESTING.md) for the full picture.

## Why This Exists

When you build resources for AI agents, you lose the traditional feedback loops. Evals are the feedback loop you get back.

Scenarios include Event Gateway flows, metrics discovery, provider composition, and **Outpost managed quickstart** (tenant → destination → publish).

Each run produces a `report.md` with heuristic scores. With `--judge`, you also get `llm-score.json` and an **LLM judge** section appended to `report.md`.

## `skillUnderTest`

Per scenario, exactly **one** skill directory is copied into `.claude/skills/`:

| Value | Installed skill |
|-------|-----------------|
| `event-gateway` | Default when omitted — existing scenarios. |
| `outpost` | Outbound Outpost skill (e.g. `outpost-managed-quickstart`). |
| `hookdeck` | Router umbrella skill. |

## LLM judge (optional)

- **Flag:** `--judge` on `run` or `assess`.
- **Env:** `RUN_LLM_JUDGE=1` (or `true` / `yes`) to enable without passing the flag.
- **Secrets:** `ANTHROPIC_API_KEY` (required when judge runs).
- **Model:** optional `JUDGE_MODEL` or `EVAL_SCORE_MODEL`; default matches Outpost eval (`claude-sonnet-4-20250514`).

**Rubric source:** if the scenario defines `successCriteriaMarkdown` in YAML, that text is sent to the judge. Otherwise criteria are derived from the heuristic `evaluation.checks` list (rendered as markdown).

**Artifacts:** `llm-score.json` (structured result) and an appended **## LLM judge** section in `report.md`.

Judge runs **after** the heuristic report is written. It does **not** execute the agent’s shell or HTTP — it reads `run.log`, **generated text files on disk** (source, `package.json`, `.env.example`, etc., with framework entry paths first), then `README.md` when present (same signals as the heuristic assessor, including code).

## Repo `.env` (optional)

If a file named `.env` exists at the **agent-skills repo root** (next to `scenarios.yaml`), the CLI loads it on each command **before** subcommands run. Existing environment variables are **not** overridden. Copy [`.env.example`](../../.env.example) to `.env` and set at least `ANTHROPIC_API_KEY` when using the LLM judge (or when your Claude CLI relies on it).

## Usage

### From repo root (recommended)

```bash
./scripts/test-agent-scenario.sh run receive-webhooks express
./scripts/test-agent-scenario.sh run receive-webhooks express --judge
./scripts/test-agent-scenario.sh run outpost-managed-quickstart express
./scripts/test-agent-scenario.sh assess receive-provider-webhooks-express-stripe-20260212145955. --judge
```

### From this directory

Use `src/index.ts` (cwd must allow resolving `scenarios.yaml` up the tree, or run from repo root):

```bash
npx tsx src/index.ts list
npx tsx src/index.ts run outpost-managed-quickstart express --judge
```

`assess` infers scenario/framework/provider from the result directory name and updates `test-results/<dir>/report.md`.

## Output

Each scenario run produces a result directory under `test-results/` containing:

- `report.md` — Heuristic rubric + scores; optional **LLM judge** section when enabled
- `run.log` — Full Claude Code CLI output
- `llm-score.json` — When judge ran: structured JSON (criteria, overall pass, summary)
- Agent-generated project files (Express / Next / FastAPI scaffold plus agent edits)

## The Iteration Loop

Run scenarios, read reports and `run.log`, improve skills or prompts, re-run, compare heuristic scores and judge summaries.

## Related

- [TESTING.md](../../TESTING.md) — Full testing strategy: both layers, CI, judge env vars
- [Agent Skills spec](https://www.agent-skills.dev/)
- [Outpost agent evaluation](https://github.com/hookdeck/outpost/tree/main/docs/agent-evaluation) — Onboarding / docs eval (separate product); this repo’s judge pattern is aligned with its Messages API approach
