/**
 * Install exactly one skill for scenario runs (see skillUnderTest on scenario config).
 * Provider skills (e.g. stripe-webhooks) from webhook-skills are not installed here.
 */

import * as fs from 'fs';
import path from 'path';
import type { ResolvedScenario } from './types.js';
import type { SkillUnderTest } from './types.js';

function copySkill(projectDir: string, repoRoot: string, skillDirName: string): void {
  const skillsDir = path.join(projectDir, '.claude', 'skills');
  const src = path.join(repoRoot, 'skills', skillDirName);
  if (!fs.existsSync(src)) {
    throw new Error(`Skill not found at ${src}`);
  }
  fs.mkdirSync(skillsDir, { recursive: true });
  const target = path.join(skillsDir, skillDirName);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true });
  }
  fs.cpSync(src, target, { recursive: true });
}

export function installEventGatewaySkill(projectDir: string, repoRoot: string): void {
  copySkill(projectDir, repoRoot, 'event-gateway');
}

export function installOutpostSkill(projectDir: string, repoRoot: string): void {
  copySkill(projectDir, repoRoot, 'outpost');
}

export function installHookdeckSkill(projectDir: string, repoRoot: string): void {
  copySkill(projectDir, repoRoot, 'hookdeck');
}

function resolveSkillUnderTest(resolved: ResolvedScenario): SkillUnderTest {
  const s = resolved.config.skillUnderTest;
  if (s === 'hookdeck' || s === 'outpost' || s === 'event-gateway') return s;
  return 'event-gateway';
}

/**
 * Install the single skill required for the scenario.
 */
export function installSkills(projectDir: string, repoRoot: string, resolved: ResolvedScenario): void {
  const which = resolveSkillUnderTest(resolved);
  switch (which) {
    case 'hookdeck':
      installHookdeckSkill(projectDir, repoRoot);
      break;
    case 'outpost':
      installOutpostSkill(projectDir, repoRoot);
      break;
    case 'event-gateway':
    default:
      installEventGatewaySkill(projectDir, repoRoot);
      break;
  }
}
