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
