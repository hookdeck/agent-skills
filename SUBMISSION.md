# Cursor Marketplace Submission

Steps to submit the Hookdeck plugin to the Cursor Marketplace.

## Pre-submission (before merge)

1. **Run validation and tests** (from repo root in worktree):
   ```bash
   npm run validate:plugin
   ./scripts/test-examples.sh
   npm run skill:lint
   npm run skill:review
   ```
   Note: `skill:lint` and `skill:review` require write access to `~/.tessl/`; run outside sandbox if they fail with EPERM.

2. **Org/company Cursor plan**: Check whether marketplace publishing requires an organization or company Cursor plan rather than an individual plan. Verify at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) before submitting.

## Submission (after merge)

1. Go to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

2. **Submit as organization** (not individual):
   - Organization name: **Hookdeck**
   - Organization handle: **hookdeck**
   - Contact email: A hookdeck.com address (not personal)
   - Logotype URL: Hookdeck logo (1:1 SVG or PNG)
   - Website URL: https://hookdeck.com
   - GitHub repository: https://github.com/hookdeck/agent-skills

3. **Form description** (from analysis Layer 4):
   > Equip your AI coding agent with webhook and event-driven architecture expertise. This plugin provides skills for receiving, queueing, routing, and delivering webhooks with Hookdeck Event Gateway, testing webhooks locally with the Hookdeck CLI, configuring connections, filters, retries, and transformations via the API, and building outbound webhook delivery with Outpost. Covers local development workflows, event debugging, and production webhook infrastructure.

4. Submit for review (Slack or kniparko@anysphere.com per plugin template).
