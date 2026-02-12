/**
 * Install only the event-gateway skill for scenario runs.
 * We do not install provider skills (e.g. stripe-webhooks) from webhook-skills.
 * The event-gateway skill guides the agent that those skills exist and how to
 * use them (layered composition); the agent may choose to install the provider
 * skill (e.g. npx skills add hookdeck/webhook-skills --skill stripe-webhooks)
 * and then use it.
 */

import * as fs from 'fs';
import path from 'path';
import type { ResolvedScenario } from './types.js';

/**
 * Install event-gateway skill from repo (path or hookdeck/agent-skills).
 * repoRoot is the path to the agent-skills repo (where skills/ lives).
 */
export function installEventGatewaySkill(projectDir: string, repoRoot: string): void {
  const skillsDir = path.join(projectDir, '.claude', 'skills');
  const eventGatewaySrc = path.join(repoRoot, 'skills', 'event-gateway');
  if (!fs.existsSync(eventGatewaySrc)) {
    throw new Error(`event-gateway skill not found at ${eventGatewaySrc}`);
  }
  fs.mkdirSync(skillsDir, { recursive: true });
  const target = path.join(skillsDir, 'event-gateway');
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true });
  }
  fs.cpSync(eventGatewaySrc, target, { recursive: true });
}

/**
 * Install all skills required for the scenario. We only install event-gateway.
 * Provider skills (stripe-webhooks, shopify-webhooks, etc.) are not installed
 * here; the agent is guided by the event-gateway skill to discover and
 * install them if needed.
 */
export function installSkills(projectDir: string, repoRoot: string, _resolved: ResolvedScenario): void {
  installEventGatewaySkill(projectDir, repoRoot);
}
