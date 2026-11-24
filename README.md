# Hookdeck Agent Skills

Equip your AI coding agent with webhook and event-driven architecture expertise. Receive, queue, route, and deliver webhooks with [Hookdeck Event Gateway](https://hookdeck.com), test webhooks locally with the Hookdeck CLI, build outbound webhook delivery with [Hookdeck Outpost](https://hookdeck.com/docs/outpost), and get free webhook test URLs with [Hookdeck Inspect](https://inspect.hookdeck.com).

<!-- Cursor plugin pending marketplace acceptance
## Install (Cursor)

**Cursor users:** Add the Hookdeck plugin from the [Cursor Marketplace](https://cursor.com/marketplace) or use `/add-plugin hookdeck` in Cursor. The plugin provides skills for Event Gateway, Outpost and Inspect, and connects the hosted Hookdeck MCP server (see [Hosted MCP server](#hosted-mcp-server)).
-->

## Install (Claude Code)

The plugin bundles the skills and the hosted Hookdeck MCP server:

```bash
/plugin marketplace add hookdeck/agent-skills
/plugin install hookdeck@hookdeck-agent-skills
```

## Hosted MCP server

Installing the plugin (Claude Code, or Cursor once listed) also connects the hosted Hookdeck MCP server at `https://mcp.hookdeck.com` as a server named `mcp` (Claude Code shows it as `plugin:hookdeck:mcp`). It covers Event Gateway and managed Outpost projects. You sign in with OAuth the first time you use it, so there is no API key to configure. See [MCP & Skills](https://hookdeck.com/docs/mcp) for setup and what the tools can do. To use the MCP server without the plugin, add it yourself as described there.

## Install (Agent Skills / Other Agents)

For ChatGPT and other agents that support the [Agent Skills specification](https://agentskills.io/) (this installs skills only, not the MCP server):

```bash
npx skills add hookdeck/agent-skills
```

Or install a specific skill:

```bash
npx skills add hookdeck/agent-skills --skill event-gateway
npx skills add hookdeck/agent-skills --skill outpost
npx skills add hookdeck/agent-skills --skill inspect
```

## Available Skills

| Skill | Purpose | Use when... |
|---|---|---|
| `hookdeck` | Skill router | You need help with any Hookdeck product and aren't sure which skill to use |
| `event-gateway` | Receive, route, and deliver webhooks | Getting started with Hookdeck, receiving webhooks, configuring connections, local development, monitoring, or API automation |
| `outpost` | Send webhooks to customers | Sending events to customer endpoints via HTTP, SQS, RabbitMQ, Pub/Sub, or other destinations |
| `inspect` | Free webhook test URLs | Getting a test URL with no account, waiting for a webhook, seeing exactly what it sent, or sending test webhooks |

## You Say -> Skill Used

| What you say | Skill |
|---|---|
| "Set up Hookdeck for my project" | `event-gateway` |
| "Receive webhooks from Stripe" | `event-gateway` |
| "Test webhooks locally" | `event-gateway` |
| "Filter events by type" | `event-gateway` |
| "Why are my webhooks failing?" | `event-gateway` |
| "Create a connection via the API" | `event-gateway` |
| "Send webhooks to my users" | `outpost` |
| "Give me a webhook test URL" | `inspect` |
| "Wait for the Stripe webhook and show me what it sent" | `inspect` |

## Event Gateway Workflow

The `event-gateway` skill includes a staged integration workflow:

1. **Setup** -- Create account, install CLI, create connection
2. **Scaffold** -- Build webhook handler with verification code (for provider webhooks like Stripe or Shopify, use event-gateway together with the matching skill from [webhook-skills](https://github.com/hookdeck/webhook-skills))
3. **Listen** -- Start `hookdeck listen`, trigger test events
4. **Iterate** -- Debug failures, fix code, replay events

## Hookdeck CLI MCP (reference)

The [Hookdeck CLI](https://hookdeck.com/docs/cli) includes a **beta** MCP server (`hookdeck gateway mcp`) that exposes Event Gateway data as MCP tools over stdio. In practice it is **operational support**: query, inspect, and diagnose connections, requests, events, attempts, issues, and metrics from your agent or IDE—without replacing the full CLI or API for creating resources, retries, or local tunnel workflows.

For setup, client configuration, available tools, and what MCP can and cannot do, see the official docs:

- [MCP & Skills](https://hookdeck.com/docs/mcp) — overview and when to pair MCP with agent skills
- [Hookdeck CLI](https://hookdeck.com/docs/cli) — MCP is linked from the Event Gateway operations table (command usage, auth, client configuration)

The skills in this repository remain the primary way to guide an agent through **product workflows** (setup, handlers, `hookdeck listen`, Outpost, API usage). Use CLI MCP when you want **read-heavy inspection and analysis** against your live Hookdeck project.

## Documentation

- [Event Gateway docs](https://hookdeck.com/docs/)
- [MCP & Skills](https://hookdeck.com/docs/mcp); [Hookdeck CLI](https://hookdeck.com/docs/cli) (MCP under Event Gateway operations)
- [Outpost docs](https://hookdeck.com/docs/outpost)
- [Outpost API reference](https://hookdeck.com/docs/outpost/api)
- [Hookdeck REST API](https://hookdeck.com/docs/api)

## Testing

- **Code examples:** Run `./scripts/test-examples.sh` or see [TESTING.md](TESTING.md).
- **Agent scenarios:** Run the scenario tester to verify an agent follows the event-gateway workflow. See [TESTING.md](TESTING.md#agent-scenario-testing-two-layers).

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Related

- [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills) -- Provider-specific webhook skills (Stripe, Shopify, GitHub, etc.)

## License

MIT
