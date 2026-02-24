/**
 * Automated assessment of scenario run output.
 * Reads project files and run.log, evaluates checklist items, returns scores.
 *
 * Design notes (why we might see 15/15 or false positives):
 * - We use combinedDoc = run.log + readme for Setup and Listen. So if the agent
 *   only says "hookdeck listen 3000" and "Source URL" in the chat (run.log) but
 *   leaves README default, we still pass Stage 01/03. To reduce that: when the
 *   project has a README that mentions Hookdeck, we require those checks to pass
 *   from the README (so the agent must have documented in-repo).
 * - Skill discovery passes if log or readme mentions verification-code.md or
 *   hookdeck listen — can be loose if the agent cites the skill in the reply.
 * - Stage 02 is code-based (handler content) so generally reliable.
 * - Code quality: "idiomatic" is just handler length > 50; "no syntax errors" is
 *   no literal "syntax error" in file — both are weak proxies.
 * - Composition (provider): "Referenced provider skill" checks doc for
 *   "stripe-webhooks|webhook-skills"; "Correct provider verification" checks code
 *   for event types. Does not verify that Stripe SDK constructEvent was used.
 */

import * as fs from 'fs';
import path from 'path';
import type { ScenarioConfig, Framework } from './types.js';

export interface CheckResult {
  check: string;
  passed: boolean;
}

export interface SectionResult {
  stage: string;
  points: number;
  checks: CheckResult[];
  score: number;
}

export interface AssessmentResult {
  sectionResults: SectionResult[];
  totalScore: number;
  totalMax: number;
}

function readFileSafe(dir: string, ...parts: string[]): string {
  const filePath = path.join(dir, ...parts);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function getLogContent(resultDir: string): string {
  return readFileSafe(resultDir, 'run.log');
}

function getReadmeContent(resultDir: string): string {
  const candidates = ['README.md', 'README'];
  for (const c of candidates) {
    const content = readFileSafe(resultDir, c);
    if (content) return content;
  }
  return '';
}

function getHandlerContent(resultDir: string, framework: Framework): string {
  switch (framework) {
    case 'express': {
      const root = readFileSafe(resultDir, 'index.js');
      return root || readFileSafe(resultDir, 'src', 'index.js');
    }
    case 'nextjs':
      return readFileSafe(resultDir, 'app', 'webhooks', 'route.ts');
    case 'fastapi':
      return readFileSafe(resultDir, 'main.py');
    default:
      return '';
  }
}

/** For Setup/Listen: prefer README when it has Hookdeck content (so we require in-repo docs, not just chat). */
function getDocForSetupListen(combinedDoc: string, readme: string): string {
  if (readme.length > 300 && /hookdeck/i.test(readme)) return readme;
  return combinedDoc;
}

function passesCheck(
  check: string,
  stage: string,
  index: number,
  combinedDoc: string,
  readme: string,
  handler: string,
  provider?: string
): boolean {
  const doc = combinedDoc;
  const setupListenDoc = getDocForSetupListen(combinedDoc, readme);
  const code = handler;

  if (stage === 'Skill discovery') {
    if (index === 0) return /verification-code\.md|02-scaffold\.md|SKILL\.md|event-gateway skill/i.test(doc);
    if (index === 1) return /hookdeck listen|scaffold|setup|workflow/i.test(doc);
    return false;
  }
  if (stage === 'Stage 01 - Setup') {
    if (index === 0) return /install.*hookdeck|brew.*hookdeck|npm.*hookdeck|hookdeck.*install|CLI/i.test(setupListenDoc);
    if (index === 1) return /hookdeck listen|hookdeck login/i.test(setupListenDoc);
    if (index === 2) return /Source URL|connection|Connection/i.test(setupListenDoc);
    return false;
  }
  if (stage === 'Stage 02 - Scaffold') {
    if (/handler created|Webhook handler created/i.test(check)) return code.length > 0 && (code.includes('/webhooks') || code.includes('webhooks'));
    if (/signature verification implemented|Hookdeck signature/i.test(check)) return /createHmac|hmac\.new|hmac\.compare_digest/i.test(code);
    if (/base64|HMAC SHA-256/i.test(check)) return /base64|b64encode|\.digest\('base64'\)/i.test(code);
    if (/Raw body|raw body/i.test(check)) return /express\.raw|request\.body\(\)|request\.text\(\)|raw_body|rawBody/i.test(code);
    if (/200|401|status codes/i.test(check)) return /401|200|status_code.*401|status_code.*200|NextResponse\.json.*401/i.test(code);
    if (/Provider-specific/i.test(check)) return true;
    return false;
  }
  if (stage === 'Stage 03 - Listen') {
    if (index === 0) return /hookdeck listen\s+\d+|hookdeck listen.*\d+/i.test(setupListenDoc);
    if (index === 1 && /--path/.test(check)) return /--path\s*\/webhooks|--path /i.test(setupListenDoc);
    if (index === 1 && !/--path/.test(check)) return /Source URL|connection|Connection/i.test(setupListenDoc);
    if (index === 2) return /Source URL|source URL|configure.*provider|webhook provider/i.test(setupListenDoc);
    return false;
  }
  if (stage === 'Stage 04 - Iterate') {
    if (index === 0) return /04-iterate|cli-workflows|monitoring-debugging/i.test(doc);
    if (index === 1) {
      const hasGateway = /hookdeck gateway/i.test(doc);
      const hasList = /request list|event list|attempt list|list requests|list events|list attempts/i.test(doc);
      const hasRetry = /retry|event retry/i.test(doc);
      return hasGateway && hasList && hasRetry;
    }
    if (index === 2) {
      const docNorm = doc.replace(/\s+/g, ' ').toLowerCase();
      return /request.*event.*attempt/i.test(docNorm);
    }
    return false;
  }
  if (stage === 'Code quality') {
    if (index === 0) return code.length > 50;
    if (index === 1) return code.length > 0 && !/syntax error|SyntaxError/i.test(code);
    return false;
  }
  if (stage === 'Composition') {
    if (index === 0) return !provider || new RegExp(`${provider}-webhooks|webhook-skills`, 'i').test(doc);
    if (index === 1) {
      if (!provider) return true;
      const hasEventHandling = /payment_intent|checkout\.session|push|pull_request|orders/i.test(code);
      if (provider === 'stripe') {
        const hasStripeSdk = /constructEvent|stripe\.webhooks/i.test(code);
        return hasEventHandling && hasStripeSdk;
      }
      return hasEventHandling;
    }
    return false;
  }
  return false;
}

/**
 * Assess a scenario run: evaluate each checklist item and compute scores.
 */
export function assessResult(
  resultDir: string,
  scenario: ScenarioConfig,
  framework: Framework,
  provider?: string
): AssessmentResult {
  const log = getLogContent(resultDir);
  const readme = getReadmeContent(resultDir);
  const handler = getHandlerContent(resultDir, framework);
  const combinedDoc = log + '\n' + readme;

  const sectionResults: SectionResult[] = [];

  for (const section of scenario.evaluation) {
    const checks: CheckResult[] = section.checks.map((check, index) => ({
      check,
      passed: passesCheck(check, section.stage, index, combinedDoc, readme, handler, provider),
    }));
    const passedCount = checks.filter(c => c.passed).length;
    const score = section.checks.length > 0 ? Math.round((passedCount / section.checks.length) * section.points) : 0;
    sectionResults.push({ stage: section.stage, points: section.points, checks, score });
  }

  const totalScore = sectionResults.reduce((s, r) => s + r.score, 0);
  const totalMax = sectionResults.reduce((s, r) => s + r.points, 0);

  return { sectionResults, totalScore, totalMax };
}
