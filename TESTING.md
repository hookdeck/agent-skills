# Testing Hookdeck Agent Skills

This document covers automated testing for code examples in the **`event-gateway`** and **`outpost`** skills. The example tests follow the same patterns as [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills/blob/main/TESTING.md).

Hookdeck tests its agent skills at three levels: **code example tests** (unit/integration tests for the example applications shipped with each skill), **static quality checks** (linting and scoring skill files), and **agent scenario testing** (giving real agents tasks and scoring whether they succeed).

The first level validates that the code examples work. The second validates that the skill files are well-formed. The third answers the harder question: **can agents actually use these skills to get things done?**

That third level — agent scenario testing — is where testing becomes evaluation. Traditional developer experience had natural feedback loops: support tickets, onboarding funnels, user interviews. With agents, that signal disappears. The agent either succeeds or silently moves on. Evals are the feedback loop you get back.

---

## Code Example Tests

Each example application includes tests for Hookdeck signature verification. Tests validate:

1. **Signature verification** -- valid signatures accepted, invalid/missing/wrong secret rejected, base64 encoding (not hex), tampered body detection
2. **Webhook endpoint** -- 200 on valid signature, 401 on invalid/missing (Express, FastAPI)
3. **Health endpoint** -- basic availability check (Express, FastAPI)

### Running Tests Locally

**Express:**

```bash
cd skills/event-gateway/examples/express
npm install
npm test
```

**Next.js:**

```bash
cd skills/event-gateway/examples/nextjs
npm install
npm test
```

**FastAPI:**

```bash
cd skills/event-gateway/examples/fastapi
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest test_webhook.py -v
```

### Running All Tests

Use the test runner script to discover and run all examples:

```bash
# All skills with examples
./scripts/test-examples.sh

# Specific skill
./scripts/test-examples.sh event-gateway
./scripts/test-examples.sh outpost
```

The **outpost** skill includes:

- [examples/nextjs-saas/](skills/outpost/examples/nextjs-saas/) — `npm test` (Vitest). For a full `next build` without Stripe, use `STRIPE_MOCK=1` (see that example’s README).
- [examples/fastapi-saas/](skills/outpost/examples/fastapi-saas/) — in `backend/`: `pytest test_outpost_wire.py` with minimal deps (no full app install; no live Outpost).

Both are full apps; installs can take longer than the small event-gateway demos.

### CI Pipeline

Tests run automatically on PR and push to main via GitHub Actions. See `.github/workflows/test-examples.yml`.

### Test Structure

```
skills/event-gateway/examples/
  express/
    src/index.js              # Handler (exports app + verifyHookdeckSignature)
    test/webhook.test.js      # Jest + Supertest
  nextjs/
    app/webhooks/route.ts     # Route handler
    test/webhook.test.ts      # Vitest (tests verification logic directly)
    vitest.config.ts
  fastapi/
    main.py                   # Handler
    test_webhook.py            # pytest + FastAPI TestClient
```

### Framework Details

| Framework | Test Runner | HTTP Testing | Test Location |
|-----------|-------------|-------------|---------------|
| Express | Jest | Supertest | `test/webhook.test.js` |
| Next.js | Vitest | Direct function testing | `test/webhook.test.ts` |
| FastAPI | pytest | FastAPI TestClient | `test_webhook.py` |

### What's Tested

| Test | Express | Next.js | FastAPI |
|------|---------|---------|---------|
| Valid signature accepted | x | x | x |
| Invalid signature rejected | x | x | x |
| Missing signature rejected | x | x | x |
| Missing/empty secret rejected | -- | x | x |
| Wrong secret rejected | -- | x | x |
| Tampered payload rejected | x | x | x |
| Base64 required (hex fails) | x | x | x |
| Endpoint returns 200 on valid | x | -- | x |
| Endpoint returns 401 on invalid | x | -- | x |
| Multiple event types handled | x | -- | x |
| Health check endpoint | x | -- | x |

Express and FastAPI test the full HTTP endpoint via Supertest / TestClient.
Next.js tests the verification function directly (consistent with [webhook-skills](https://github.com/hookdeck/webhook-skills) approach for Next.js).

---

## Agent Scenario Testing (Two Layers)

We use two layers to evaluate skills: **skill quality** (static) and **agent scenarios** (end-to-end). The goal is to iterate: run scenarios, evaluate results, then improve both the agent skills and the tester so skills become more effective over time.

### Layer 1: Skill Quality (Tessl)

[Tessl](https://tessl.io) provides static analysis of SKILL.md files.

- **Lint** (format, frontmatter, Agent Skills spec): `npm run skill:lint` (from repo root). Runs in CI on every PR.
- **Review** (quality scores): `npm run skill:review`. Run locally when you want 0–100% scores for description, content, and activation. Requires `tessl login` (Tessl is free during beta).

**Cross-skill links:** Tessl lint treats each skill directory (with its `tile.json`) as one tile. Links in SKILL.md or reference files must not point outside that tile — e.g. `../event-gateway/SKILL.md` or `../outpost/SKILL.md` cause "Link in SKILL.md points outside tile" and lint fails. Use full URLs (e.g. `https://github.com/hookdeck/agent-skills/blob/main/skills/event-gateway/SKILL.md`) to link to other skills in this repo. This rule is enforced by the Tessl CLI; it is not clearly documented in [Tessl's CLI reference](https://docs.tessl.io/reference/cli-commands) or the [Agent Skills spec](https://agentskills.io/specification) (which only covers relative paths within a single skill).

Baseline: run `npm run skill:review` periodically and record scores; use them to guide skill improvements.

### Layer 2: Agent Scenarios (Evals)

This is where testing becomes evaluation. The scenario tester installs skills, runs Claude Code with a scenario prompt, and writes a scored report. It answers: can an agent actually follow the staged workflow to accomplish a real task?

**Prerequisites:** [Claude Code CLI](https://claude.ai/download) installed and logged in (`ANTHROPIC_API_KEY` or `claude login`). The tool runs a preflight that sends a short prompt to the CLI; if you see "Claude CLI did not respond within 15s", the CLI may be blocked (e.g. in a restricted sandbox). Run with a full environment or ensure the CLI can reach the API.

**Usage:**

```bash
# From repo root (recommended)
./scripts/test-agent-scenario.sh run receive-webhooks express
./scripts/test-agent-scenario.sh run receive-provider-webhooks nextjs --provider stripe
./scripts/test-agent-scenario.sh list
./scripts/test-agent-scenario.sh assess <resultDir>   # re-run assessor on existing result, update report.md

# Or via npx from repo root
npx tsx tools/agent-scenario-tester/src/index.ts run receive-webhooks express
```

**Options:** `--dry-run`, `--verbose`, `--timeout <seconds>` (default 300).

**Scenarios:** Defined in `scenarios.yaml`. Three scenarios test increasingly interesting agent behaviors:

- **receive-webhooks** — Setup Hookdeck, build handler with signature verification, run `hookdeck listen`, document inspect/retry workflow. Tests stages 01–04 (iterate is documentation-only: agent documents how to list request → event → attempt and retry; no live traffic required).
- **receive-provider-webhooks** — Same plus a provider (e.g. Stripe). Use `--provider stripe`. Only the event-gateway skill is pre-installed; the agent is expected to discover and use the provider skill from webhook-skills (e.g. `npx skills add hookdeck/webhook-skills --skill stripe-webhooks -y -g`) and use the provider SDK in the handler. Tests composition and the provider-webhooks checklist.
- **investigate-delivery-health** — Documentation-only: assume the user has had webhooks for a week and wants to understand delivery performance (success vs failure, backlog, latency). The prompt does **not** mention "metrics" or "hookdeck gateway metrics"; the assessor checks whether the agent used metrics CLI commands. Use to verify that agents discover and use metrics from the skill when the task implies it.

| Scenario | Tests | Key question |
|----------|-------|-------------|
| `receive-webhooks` | Core skill usage | Can the agent follow the skill to set up webhook receiving? |
| `receive-provider-webhooks` | Composition | Does the agent discover and install a Stripe-specific skill on its own? |
| `investigate-delivery-health` | Discovery | Does the agent find diagnostic tools (CLI metrics, MCP) when they aren't mentioned in the prompt? |

### Scenario run checklist

Run these and evaluate results; iterate on skills or prompts as needed.

| # | Scenario | Framework | Command | Status |
|---|----------|-----------|---------|--------|
| 1 | receive-webhooks | Express | `./scripts/test-agent-scenario.sh run receive-webhooks express` | Done |
| 2 | receive-webhooks | Next.js | `./scripts/test-agent-scenario.sh run receive-webhooks nextjs` | Done |
| 3 | receive-webhooks | FastAPI | `./scripts/test-agent-scenario.sh run receive-webhooks fastapi` | Done |
| 4 | receive-provider-webhooks | Express | `./scripts/test-agent-scenario.sh run receive-provider-webhooks express --provider stripe` | Done |
| 5 | investigate-delivery-health | Express | `./scripts/test-agent-scenario.sh run investigate-delivery-health express` | — |

**Output:** `test-results/<scenario>-<framework>-<provider?>-<timestamp>/` containing `report.md` (checklist + automated score), `run.log` (full Claude output), and generated project files. To re-run only the assessor (e.g. after fixing the tool): `./scripts/test-agent-scenario.sh assess <resultDir>`.

### Iterative Improvement Workflow

1. **Run** scenarios (e.g. receive-webhooks across express, nextjs, fastapi).
2. **Evaluate** results (scores, logs, where the agent failed or was confused).
3. **Improve** in two directions:
   - **Skills:** Update SKILL.md, reference files (01-setup, 02-scaffold, etc.), or examples so the agent discovers and follows the workflow better.
   - **Tool:** Refine prompts in `scenarios.yaml`, adjust the evaluation rubric, or add scenarios.
4. **Re-run** to confirm improvements; repeat as needed.

The A/B unit is **skill version × scenario set → score delta**. Change a skill, re-run the scenarios, compare scores.

CI runs scenario tests on-demand (workflow_dispatch) and weekly (schedule). Use artifacts to monitor regressions and guide further skill improvements.

### Evaluation Rubric (receive-webhooks)

| Criterion            | Points |
|----------------------|--------|
| Skill discovery      | 2      |
| Stage 01: Setup      | 3      |
| Stage 02: Scaffold    | 5      |
| Stage 03: Listen     | 3      |
| Stage 04: Iterate    | 2      |
| Code quality         | 2      |
| **Total**            | **17** |

**Stage 04 - Iterate** (documentation-only): Agent must document how to inspect and retry once traffic exists (e.g. after sending a test webhook). Checks: references 04-iterate, cli-workflows, or monitoring-debugging; documents `hookdeck gateway` request/event/attempt list and retry; request → event → attempt order in the doc. No live requests/events/attempts are required during the run.

For receive-provider-webhooks, add **Composition** (2 pts) → 19 total. See the generated report for the full checklist.

### CI

- **Layer 1:** `tessl skill lint` runs in `.github/workflows/test-examples.yml` on every PR.
- **Layer 2:** `.github/workflows/test-agent-scenarios.yml` runs on workflow_dispatch and weekly (Monday 6am UTC). Requires `ANTHROPIC_API_KEY` secret. Results are uploaded as artifacts.
