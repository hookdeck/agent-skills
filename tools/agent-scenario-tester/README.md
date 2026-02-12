# Agent scenario tester

Run and assess Hookdeck agent-skills scenarios (e.g. receive-webhooks, receive-provider-webhooks with Stripe).

## From repo root (recommended)

```bash
./scripts/test-agent-scenario.sh run receive-webhooks express
./scripts/test-agent-scenario.sh assess receive-provider-webhooks-express-stripe-20260212145955.
```

## From this directory

Path to the entrypoint is **relative to cwd**. Use `src/index.ts` (not `tools/agent-scenario-tester/src/index.ts`):

```bash
# list / run (from repo root is easier)
npx tsx src/index.ts list
npx tsx src/index.ts assess receive-provider-webhooks-express-stripe-20260212145955.

# or
npm run assess -- receive-provider-webhooks-express-stripe-20260212145955.
```

`assess` infers scenario/framework/provider from the result directory name and updates `test-results/<dir>/report.md`.
