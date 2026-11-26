# Security policy

## Reporting a vulnerability

Email [security@hookdeck.com](mailto:security@hookdeck.com) with the subject `Security report: [short description]`. Don't open a public issue or pull request: a public report shows the problem to everyone before a fix is out.

Include the skill, rule or plugin file involved, what the agent did, and what it exposed. Replace live credentials with placeholders.

The [Hookdeck Bug Bounty Program](https://hookdeck.com/bug-bounty) explains how Hookdeck handles reports, safe testing and coordinated disclosure.

## What counts

Anything in this repository that could lead an agent to expose a credential, project data or access to someone who shouldn't have it. For example:

- a skill or rule that tells the agent to print, log or commit an API key or signing secret
- an instruction that sends project data somewhere other than Hookdeck or the user's own endpoints
- a plugin config that connects to a server other than `https://mcp.hookdeck.com`

Report issues in the Hookdeck products themselves (Event Gateway, Outpost, the MCP server) to the same address.
