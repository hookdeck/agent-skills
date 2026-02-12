/**
 * Install agent-skills (event-gateway) and optionally webhook-skills provider skill.
 */

import { execSync } from 'child_process';
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
 * Install webhook-skills provider skill via npx skills add if available.
 * Falls back to no-op if npx skills add fails (e.g. repo not cloned).
 */
export function installProviderSkill(
  projectDir: string,
  provider: string
): void {
  const skillName = `${provider}-webhooks`;
  try {
    execSync(
      `npx skills add hookdeck/webhook-skills --skill ${skillName} --yes`,
      { cwd: projectDir, stdio: 'pipe', timeout: 60000 }
    );
  } catch {
    // Optional: if webhook-skills not available, agent may still use event-gateway only
    const skillsDir = path.join(projectDir, '.claude', 'skills');
    const fallbackDir = path.join(projectDir, '.agents', 'skills');
    if (!fs.existsSync(path.join(skillsDir, 'event-gateway'))) {
      throw new Error('event-gateway skill must be installed first');
    }
    // Provider skill is optional for composition; continue without it
  }
}

/**
 * Install all skills required for the scenario: event-gateway + optional provider.
 */
export function installSkills(projectDir: string, repoRoot: string, resolved: ResolvedScenario): void {
  installEventGatewaySkill(projectDir, repoRoot);
  if (resolved.provider) {
    installProviderSkill(projectDir, resolved.provider);
  }
}
