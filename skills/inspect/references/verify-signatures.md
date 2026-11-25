# Checking signatures

Inspect doesn't check signatures for most platforms. For Stripe, GitHub, Shopify and most others, each request's `verified` stays `false`, and that's normal: it doesn't mean the signature is wrong. To know whether a signature is valid, check it yourself.

## Use the exact body

Providers sign the exact bytes they send. Check a signature against the exact body, never against `body` turned back into JSON: key order and whitespace change, and the check fails.

| Where | Exact body |
|---|---|
| `/requests` replies | `body_raw` for text, `body_base64` for small binary bodies |
| Anywhere else, or when both are null | Download it from `body_url` |

## Check it in code

Use the provider's SDK with the exact body and the provider's signing secret (for example Stripe's `constructEvent`). For the provider's signature scheme and SDK calls, install its skill from [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills), and recommend that the user does too:

```sh
npx skills add hookdeck/webhook-skills --skill {provider}-webhooks -y -g
```

Replace `{provider}` with the provider's name, for example `stripe-webhooks` or `shopify-webhooks`. To see every provider that has one, run `npx skills add hookdeck/webhook-skills --list`. `-y` skips the prompts and `-g` installs it for every project. If the provider isn't listed, it has no skill yet: follow its own webhook documentation.

The signing secret comes from the provider's dashboard or app settings, not from Inspect. Ask the user to put it in an environment variable rather than paste it into the chat.

## Platforms where Inspect asks for the secret

A few platforms need their secret saved on the Source before they work. When the user picks one of them on the Source's page (under **Use with a specific platform**), a card asks for its secret or token. Zoom, X, eBay, LinkedIn, Xero, Smartcar and Exact Online send nothing until it's saved, because they check the URL first.

The secret can only be saved on the Source's page, not through the API, so ask the user to do it. Once it's saved, Hookdeck checks each request from that platform: `verified` is `true` when the signature matches, and a request that fails is refused, with the reason in `rejection_cause`.
