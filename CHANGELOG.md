# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `inspect` skill for Hookdeck Inspect's free webhook test URLs: create a URL, wait for requests, read exact bodies, send realistic test webhooks, check signatures and forward to localhost
- The `hookdeck` router skill sends webhook-testing tasks to `inspect`

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
