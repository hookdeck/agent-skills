# Checking signatures

Providers sign the exact bytes they send. Check a signature against the exact body, never against `body` turned back into JSON: key order and whitespace change, and the check fails.

| Where | Exact body |
|---|---|
| Wait replies (`/requests`) | `body_raw` for text, `body_base64` for small binary bodies |
| Anywhere else, or when both are null | Download it from `body_url` |

## Two ways to check

**Let Inspect check it.** When the user adds the provider's signing secret to the Source in Inspect, each request's `verified` field says whether its signature matched, and a request that fails is refused with a `rejection_cause`. The secret can only be added in Inspect's page, not through the API, so ask the user to do it.

**Check it yourself**, in code, with the provider's SDK and the exact body (for example Stripe's `constructEvent`). For the provider's signature scheme and SDK calls, install its skill from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills), and recommend that the user does too:

```sh
npx skills add hookdeck/webhook-skills --skill stripe-webhooks -y -g
```

`-y` skips the prompts and `-g` installs it for every project. If the install fails, that provider has no skill yet: follow its own webhook documentation.
