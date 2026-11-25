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

Installing the plugin (Claude Code, or Cursor once listed) also connects the hosted Hookdeck MCP server at `https://mcp.hookdeck.com` as a server named `hookdeck` (Claude Code shows it as `plugin:hookdeck:hookdeck`). It covers Event Gateway and managed Outpost projects. You sign in with OAuth the first time you use it, so there is no API key to configure. See [MCP & Skills](https://hookdeck.com/docs/mcp) for setup and what the tools can do. To use the MCP server without the plugin, add it yourself as described there. If you already added a Hookdeck MCP server yourself, remove it after installing the plugin, so the agent doesn't see two.

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

## Hookdeck MCP

The Hookdeck MCP server lets AI apps like Claude, ChatGPT, Cursor, and VS Code work with your Hookdeck projects. Add one URL and sign in with Hookdeck:

```
https://mcp.hookdeck.com
```

The same URL works for Event Gateway and managed Outpost projects. Use it to investigate delivery issues in-session: trace a request through to its delivery attempts, look into issues and metrics, pause connections, and, with write access, retry events or change your setup. Access is **Read only** by default; you choose **Read and write** when you sign in.

To add it to several coding agents at once (Claude Code, Cursor, VS Code, Codex, Windsurf, Gemini CLI, and others):

```bash
npx -y add-mcp https://mcp.hookdeck.com -g
```

Then sign in with Hookdeck when each agent asks. For Claude Code on its own:

```bash
claude mcp add --transport http hookdeck https://mcp.hookdeck.com
```

Then run `/mcp` in Claude Code, select `hookdeck`, and sign in with Hookdeck.

For apps that can't sign in with OAuth, like scripts or CI, send a key from **Keys & Sessions** as an `Authorization: Bearer` header. See [Hookdeck MCP](https://hookdeck.com/docs/mcp) for setup in each app, access, and the full tool list.

### MCP or skills

| Goal | Use |
|---|---|
| Query and inspect Hookdeck resources, events, issues, and metrics from your AI app | **Hookdeck MCP** |
| Set up an integration: create connections, build a handler, run `hookdeck listen`, integrate Outpost | **These skills**, which guide the agent through the CLI and API |
| Create or change resources from your AI app | **Hookdeck MCP** with write access, or these skills for a guided CLI/API workflow |

The hosted server has no `outpost_publish` tool, because publishing needs an Outpost project API key that a sign-in doesn't have. Publish events with the [Outpost API](https://hookdeck.com/docs/outpost/api).

The MCP server built into the Hookdeck CLI (`hookdeck gateway mcp`) will be deprecated. If you use it, switch to `https://mcp.hookdeck.com`: tool names and inputs are the same, except that `outpost_publish` isn't served. See [Migrate from the CLI MCP](https://hookdeck.com/docs/mcp#migrate-from-the-cli-mcp).

## Documentation

- [Event Gateway docs](https://hookdeck.com/docs/)
- [MCP & Skills](https://hookdeck.com/docs/mcp)
- [Hookdeck CLI](https://hookdeck.com/docs/cli)
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
