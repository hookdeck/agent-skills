# Testing Hookdeck Agent Skills

This document covers automated testing for code examples in the `event-gateway` skill. Follows the same patterns as [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills/blob/main/TESTING.md).

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
```

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

Baseline: run `npm run skill:review` periodically and record scores; use them to guide skill improvements.

### Layer 2: Agent Scenarios (Custom Tool)

The scenario tester installs skills, runs Claude Code with a scenario prompt, and writes a scored report. Use it to check that an agent can actually follow the staged workflow.

**Prerequisites:** [Claude Code CLI](https://claude.ai/download) installed and logged in (`ANTHROPIC_API_KEY` or `claude login`).

**Usage:**

```bash
# From repo root
./scripts/test-agent-scenario.sh run receive-webhooks express
./scripts/test-agent-scenario.sh run receive-provider-webhooks nextjs --provider stripe
./scripts/test-agent-scenario.sh list

# Or via npx
npx tsx tools/agent-scenario-tester/src/index.ts run receive-webhooks express
```

**Options:** `--dry-run`, `--verbose`, `--timeout <seconds>` (default 300).

**Scenarios:** Defined in `scenarios.yaml`. Initial set:

- **receive-webhooks** — Setup Hookdeck, build handler with signature verification, run `hookdeck listen`. Tests stages 01–03.
- **receive-provider-webhooks** — Same plus a provider (e.g. Stripe). Use `--provider stripe`. Tests composition with webhook-skills.

### Scenario run checklist

Run these and evaluate results; iterate on skills or prompts as needed.

| # | Scenario | Framework | Command | Status |
|---|----------|-----------|---------|--------|
| 1 | receive-webhooks | Express | `./scripts/test-agent-scenario.sh run receive-webhooks express` | Done |
| 2 | receive-webhooks | Next.js | `./scripts/test-agent-scenario.sh run receive-webhooks nextjs` | To do |
| 3 | receive-webhooks | FastAPI | `./scripts/test-agent-scenario.sh run receive-webhooks fastapi` | To do |
| 4 | receive-provider-webhooks | (e.g. Express or Next.js) | `./scripts/test-agent-scenario.sh run receive-provider-webhooks express --provider stripe` | To do |

**Output:** `test-results/<scenario>-<framework>-<timestamp>.md` (report with checklist) and `.log` (full Claude output). Score manually using the checklist; use results to improve skills or scenario prompts.

### Iterative Improvement Workflow

1. **Run** scenarios (e.g. receive-webhooks across express, nextjs, fastapi).
2. **Evaluate** results (scores, logs, where the agent failed or was confused).
3. **Improve** in two directions:
   - **Skills:** Update SKILL.md, reference files (01-setup, 02-scaffold, etc.), or examples so the agent discovers and follows the workflow better.
   - **Tool:** Refine prompts in `scenarios.yaml`, adjust the evaluation rubric, or add scenarios.
4. **Re-run** to confirm improvements; repeat as needed.

CI runs scenario tests on-demand (workflow_dispatch) and weekly (schedule). Use artifacts to monitor regressions and guide further skill improvements.

### Evaluation Rubric (receive-webhooks)

| Criterion            | Points |
|----------------------|--------|
| Skill discovery      | 2      |
| Stage 01: Setup      | 3      |
| Stage 02: Scaffold    | 5      |
| Stage 03: Listen      | 3      |
| Code quality         | 2      |
| **Total**            | **15** |

For receive-provider-webhooks, add **Composition** (2 pts) → 17 total. See the generated report for the full checklist.

### CI

- **Layer 1:** `tessl skill lint` runs in `.github/workflows/test-examples.yml` on every PR.
- **Layer 2:** `.github/workflows/test-agent-scenarios.yml` runs on workflow_dispatch and weekly (Monday 6am UTC). Requires `ANTHROPIC_API_KEY` secret. Results are uploaded as artifacts.
