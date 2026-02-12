/**
 * Load scenarios.yaml and resolve prompt templates.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { Framework, ResolvedScenario, ScenarioConfig, ScenariosDoc } from './types.js';

const SUPPORTED_FRAMEWORKS: Framework[] = ['express', 'nextjs', 'fastapi'];

/**
 * Find repo root (directory containing scenarios.yaml).
 */
export function findRepoRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (;;) {
    const configPath = path.join(dir, 'scenarios.yaml');
    if (fs.existsSync(configPath)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('scenarios.yaml not found (reached filesystem root)');
    dir = parent;
  }
}

/**
 * Load and parse scenarios.yaml from repo root.
 */
export function loadScenariosDoc(repoRoot: string): ScenariosDoc {
  const configPath = path.join(repoRoot, 'scenarios.yaml');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const doc = yaml.load(raw) as ScenariosDoc;
  if (!doc || !Array.isArray(doc.scenarios)) {
    throw new Error('scenarios.yaml must have a "scenarios" array');
  }
  if (!doc.frameworks || !Array.isArray(doc.frameworks)) {
    doc.frameworks = SUPPORTED_FRAMEWORKS;
  }
  return doc;
}

/**
 * Get a scenario by name.
 */
export function getScenario(doc: ScenariosDoc, name: string): ScenarioConfig | undefined {
  return doc.scenarios.find((s) => s.name === name);
}

/**
 * Resolve prompt template with {framework}, {Provider}, {events} placeholders.
 */
export function resolvePrompt(
  template: string,
  framework: Framework,
  provider?: string,
  providerDisplayName?: string,
  events?: string[]
): string {
  const eventsStr = events && events.length > 0 ? events.join(' and ') : 'webhook';
  const providerName = providerDisplayName ?? (provider ? toDisplayName(provider) : '');
  return template
    .trim()
    .replace(/\{framework\}/g, framework)
    .replace(/\{Provider\}/g, providerName)
    .replace(/\{provider\}/g, provider ?? '')
    .replace(/\{events\}/g, eventsStr);
}

function toDisplayName(provider: string): string {
  return provider
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Load scenario config and resolve prompt. Throws if scenario or framework invalid.
 */
export function loadScenario(
  repoRoot: string,
  scenarioName: string,
  framework: Framework,
  provider?: string
): ResolvedScenario {
  if (!SUPPORTED_FRAMEWORKS.includes(framework)) {
    throw new Error(
      `Invalid framework: ${framework}. Supported: ${SUPPORTED_FRAMEWORKS.join(', ')}`
    );
  }
  const doc = loadScenariosDoc(repoRoot);
  const config = getScenario(doc, scenarioName);
  if (!config) {
    const names = doc.scenarios.map((s) => s.name).join(', ');
    throw new Error(`Scenario not found: ${scenarioName}. Available: ${names}`);
  }
  let prompt = config.prompt;
  let providerDisplayName: string | undefined;
  let events: string[] | undefined;
  if (provider && config.providerConfig?.[provider]) {
    events = config.providerConfig[provider].events;
    providerDisplayName = toDisplayName(provider);
  }
  prompt = resolvePrompt(prompt, framework, provider, providerDisplayName, events);
  return { config, prompt, framework, provider };
}

/**
 * List all scenario names and frameworks from scenarios.yaml.
 */
export function listScenarios(repoRoot: string): { name: string; displayName: string }[] {
  const doc = loadScenariosDoc(repoRoot);
  return doc.scenarios.map((s) => ({ name: s.name, displayName: s.displayName }));
}

/**
 * Parse a result directory name to infer scenario, framework, and provider.
 * Example: "receive-provider-webhooks-express-stripe-20260212145955" or
 * "receive-provider-webhooks-express-stripe-20260212145955." (trailing dot allowed)
 * Returns undefined if parsing fails.
 */
export function parseResultDirName(
  dirName: string,
  scenarioNames: string[]
): { scenarioName: string; framework: Framework; provider?: string } | undefined {
  const base = dirName.replace(/\.$/, '').trim();
  const parts = base.split('-');
  if (parts.length < 2) return undefined;

  // Last segment is often a 15-digit timestamp; remove it
  if (/^\d{14,16}$/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length < 2) return undefined;

  // Find framework (rightmost match)
  let framework: Framework | undefined;
  let fwIndex = -1;
  for (const fw of SUPPORTED_FRAMEWORKS) {
    const i = parts.lastIndexOf(fw);
    if (i !== -1) {
      framework = fw as Framework;
      fwIndex = i;
      break;
    }
  }
  if (!framework || fwIndex < 0) return undefined;

  // Dir format: <scenario>-<framework>-<provider?>-<timestamp>. So before framework = scenario.
  const beforeFramework = parts.slice(0, fwIndex).join('-');
  const afterFramework = parts.slice(fwIndex + 1).join('-');
  const provider = afterFramework || undefined;

  // Match beforeFramework to a known scenario name
  if (scenarioNames.includes(beforeFramework)) {
    return { scenarioName: beforeFramework, framework, provider };
  }
  return undefined;
}
