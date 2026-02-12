/**
 * Automated assessment of scenario run output.
 * Reads project files and run.log, evaluates checklist items, returns scores.
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
    case 'express':
      return readFileSafe(resultDir, 'index.js');
    case 'nextjs':
      return readFileSafe(resultDir, 'app', 'webhooks', 'route.ts');
    case 'fastapi':
      return readFileSafe(resultDir, 'main.py');
    default:
      return '';
  }
}

function passesCheck(
  check: string,
  stage: string,
  index: number,
  combinedDoc: string,
  handler: string,
  provider?: string
): boolean {
  const doc = combinedDoc;
  const code = handler;

  if (stage === 'Skill discovery') {
    if (index === 0) return /verification-code\.md|02-scaffold\.md|SKILL\.md|event-gateway skill/i.test(doc);
    if (index === 1) return /hookdeck listen|scaffold|setup|workflow/i.test(doc);
    return false;
  }
  if (stage === 'Stage 01 - Setup') {
    if (index === 0) return /install.*hookdeck|brew.*hookdeck|npm.*hookdeck|hookdeck.*install|CLI/i.test(doc);
    if (index === 1) return /hookdeck listen|hookdeck login/i.test(doc);
    if (index === 2) return /Source URL|connection|Connection/i.test(doc);
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
    if (index === 0) return /hookdeck listen\s+\d+|hookdeck listen.*\d+/i.test(doc);
    if (index === 1 && /--path/.test(check)) return /--path\s*\/webhooks|--path /i.test(doc);
    if (index === 1 && !/--path/.test(check)) return /Source URL|connection|Connection/i.test(doc);
    if (index === 2) return /Source URL|source URL|configure.*provider|webhook provider/i.test(doc);
    return false;
  }
  if (stage === 'Code quality') {
    if (index === 0) return code.length > 50;
    if (index === 1) return code.length > 0 && !/syntax error|SyntaxError/i.test(code);
    return false;
  }
  if (stage === 'Composition') {
    if (index === 0) return !provider || new RegExp(`${provider}-webhooks|webhook-skills`, 'i').test(doc);
    if (index === 1) return !provider || /payment_intent|checkout\.session|push|pull_request|orders/i.test(code);
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
      passed: passesCheck(check, section.stage, index, combinedDoc, handler, provider),
    }));
    const passedCount = checks.filter(c => c.passed).length;
    const score = section.checks.length > 0 ? Math.round((passedCount / section.checks.length) * section.points) : 0;
    sectionResults.push({ stage: section.stage, points: section.points, checks, score });
  }

  const totalScore = sectionResults.reduce((s, r) => s + r.score, 0);
  const totalMax = sectionResults.reduce((s, r) => s + r.points, 0);

  return { sectionResults, totalScore, totalMax };
}
