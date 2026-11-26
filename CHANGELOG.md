# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `icon` in the Claude Code plugin manifest (`assets/logo.svg`), for the listing in Anthropic's plugin directory
- `scripts/build-directory.mjs` and `scripts/check-directory-build.mjs` generate and check a directory-only build of the plugin (Markdown, text, JSON and the icon only; no `allowed-tools`; links to examples rewritten to absolute GitHub URLs), and a workflow commits it to the generated `directory` branch on every push to `main`. Anthropic's plugin directory tracks that branch because Hookdeck's directory organization isn't Verified
- `SECURITY.md` with how to report a security issue
- README sections for installing in Cursor (including the two Cursor rules) and for data and privacy

### Changed

- `event-gateway` `authentication.md` and `inspect` `reading-requests.md` no longer include a `curl` pipeline or download command that the plugin directory flags as a download-and-run pattern; they link to the OpenAPI document and describe the plain GET instead

## [0.3.0]

### Added

- The Claude Code and Cursor plugins now bundle the hosted Hookdeck MCP server (`https://mcp.hookdeck.com`, signs in with OAuth) via `.mcp.json` and `mcp.json`, as a server named `hookdeck`
- `inspect` skill for Hookdeck Inspect's free webhook test URLs: create a URL, wait for requests, read exact bodies, send realistic test webhooks, check signatures and forward to localhost
- The `hookdeck` router skill sends webhook-testing tasks to `inspect`
- `event-gateway` and `outpost` point agents to the hosted Hookdeck MCP (`https://mcp.hookdeck.com`) for querying and inspecting live projects, with a tool map for requests, events, attempts, issues and metrics

### Changed

- README's MCP section now covers the hosted Hookdeck MCP, and notes that the CLI's MCP server (`hookdeck gateway mcp`) will be deprecated

## [0.2.0] - 2025-02-21

### Added

- Cursor plugin packaging for marketplace submission
- `.cursor-plugin/plugin.json` manifest
- `assets/logo.svg` (Hookdeck brand icon, 1:1)
- Cursor rules for webhook best practices and local development

## [0.1.0] - Pre-Cursor plugin

### Added

- Agent Skills for Hookdeck Event Gateway and Outpost
- Install via `npx skills add hookdeck/agent-skills`
- Skills: `hookdeck` (router), `event-gateway`, `outpost`
- Staged integration workflow (setup, scaffold, listen, iterate)
- Reference documentation and working examples (Express, Next.js, FastAPI)

[0.2.0]: https://github.com/hookdeck/agent-skills/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/hookdeck/agent-skills/releases/tag/v0.1.0
