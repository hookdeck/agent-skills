/**
 * Optional LLM-as-judge scoring via Anthropic Messages API.
 * Adapted from hookdeck/outpost docs/agent-evaluation/src/llm-judge.ts for agent-skills scenario runs:
 * rubric = scenario success criteria + transcript (run.log + optional README).
 */

import * as fs from 'fs';
import path from 'path';
import { listGeneratedFiles } from './results.js';
import type { Framework, ScenarioConfig } from './types.js';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
export const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TRANSCRIPT_CHARS = 180_000;
/** Max chars per generated file embedded in the judge transcript. */
const MAX_CHARS_PER_ARTIFACT = 48_000;
const SKIP_ARTIFACT_BASENAMES = new Set(['report.md', 'run.log', 'llm-score.json']);
/** Relative paths considered text for judge context (exclude images, zips, etc.). */
const TEXT_ARTIFACT_RE = /\.(js|cjs|mjs|ts|tsx|jsx|py|json|yaml|yml|toml|mdx?|css|html|sh|txt)$/i;

export interface LlmCriterionJudgment {
  readonly criterion: string;
  readonly pass: boolean;
  readonly evidence: string;
}

export interface LlmJudgeReport {
  readonly version: 1;
  readonly model: string;
  readonly scenarioName: string;
  readonly overall_transcript_pass: boolean;
  readonly execution_in_transcript: {
    readonly pass: boolean | null;
    readonly note: string;
  };
  readonly criteria: readonly LlmCriterionJudgment[];
  readonly summary: string;
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (m) return m[1].trim();
  return t;
}

function parseJudgeJson(text: string): Omit<LlmJudgeReport, 'version' | 'model' | 'scenarioName'> & { version?: number } {
  const raw = stripJsonFence(text);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const overall = Boolean(parsed.overall_transcript_pass);
  const criteriaIn = parsed.criteria;
  const criteria: LlmCriterionJudgment[] = [];
  if (Array.isArray(criteriaIn)) {
    for (const c of criteriaIn) {
      if (typeof c !== 'object' || c === null) continue;
      const o = c as Record<string, unknown>;
      criteria.push({
        criterion: String(o.criterion ?? o.id ?? 'unnamed'),
        pass: Boolean(o.pass),
        evidence: String(o.evidence ?? ''),
      });
    }
  }
  const exec = parsed.execution_in_transcript;
  let execution_in_transcript: LlmJudgeReport['execution_in_transcript'] = {
    pass: null,
    note: 'Not specified by judge.',
  };
  if (typeof exec === 'object' && exec !== null) {
    const e = exec as Record<string, unknown>;
    execution_in_transcript = {
      pass: typeof e.pass === 'boolean' ? e.pass : null,
      note: String(e.note ?? ''),
    };
  }
  return {
    overall_transcript_pass: overall,
    execution_in_transcript,
    criteria,
    summary: String(parsed.summary ?? ''),
  };
}

const JUDGE_SYSTEM = `You are an expert evaluator for Hookdeck agent-skills scenario runs.
You judge whether an AI assistant's replies (and any code or README it wrote) satisfy the scenario Success criteria (markdown rubric provided by the user message).
The user message includes run.log, then generated files the agent wrote on disk (source, config), then README — use all of it when scoring.
Be strict: a criterion passes only if the transcript clearly satisfies it.
You cannot run shell or HTTP — do not claim execution passed; use execution_in_transcript.pass = null and explain in note.
Output ONLY valid JSON (no markdown fences, no commentary outside JSON) matching this shape:
{
  "overall_transcript_pass": boolean,
  "execution_in_transcript": { "pass": null, "note": "string explaining you did not execute code" },
  "criteria": [
    { "criterion": "short label from checklist", "pass": boolean, "evidence": "1-3 sentences; quote or paraphrase assistant" }
  ],
  "summary": "2-4 sentences overall"
}
Map each major bullet/checkbox line from Success criteria to one criteria[] entry (merge tiny sub-bullets if needed).`;

/**
 * Build markdown rubric for the judge: explicit field wins; else derive from evaluation.checks.
 */
export function buildCriteriaMarkdown(scenario: ScenarioConfig): string {
  const explicit = scenario.successCriteriaMarkdown?.trim();
  if (explicit) {
    return explicit.startsWith('##') ? explicit : `## Success criteria\n\n${explicit}`;
  }
  const lines: string[] = ['## Success criteria', ''];
  for (const section of scenario.evaluation) {
    lines.push(`### ${section.stage}`);
    for (const check of section.checks) {
      lines.push(`- [ ] ${check}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

function readFileSafe(resultDir: string, ...parts: string[]): string {
  try {
    return fs.readFileSync(path.join(resultDir, ...parts), 'utf-8');
  } catch {
    return '';
  }
}

function frameworkPriorityRelPaths(framework: Framework): readonly string[] {
  switch (framework) {
    case 'express':
      return ['index.js', 'src/index.js', 'server.js', 'app.js'];
    case 'nextjs':
      return ['app/webhooks/route.ts', 'src/app/webhooks/route.ts', 'pages/api/webhooks.ts'];
    case 'fastapi':
      return ['main.py', 'src/main.py'];
    default:
      return [];
  }
}

function truncateBlock(label: string, content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return (
    content.slice(0, maxChars) +
    `\n\n[… ${label}: truncated at ${maxChars} chars; file length was ${content.length} …]\n`
  );
}

/**
 * Ordered list of generated text files to show the judge (handler paths first, then rest).
 * README is attached separately; skip it here to avoid duplication.
 */
function orderedJudgeArtifactPaths(resultDir: string, framework: Framework): string[] {
  let rels: string[];
  try {
    rels = listGeneratedFiles(resultDir);
  } catch {
    rels = [];
  }
  const set = new Set(rels);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const p of frameworkPriorityRelPaths(framework)) {
    if (set.has(p) && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  for (const p of rels.slice().sort()) {
    if (seen.has(p)) continue;
    const base = path.basename(p);
    if (SKIP_ARTIFACT_BASENAMES.has(base)) continue;
    if (p === 'README.md' || p === 'README') continue;
    if (!TEXT_ARTIFACT_RE.test(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

function buildGeneratedArtifactsMarkdown(resultDir: string, framework: Framework, maxTotalChars: number): string {
  const paths = orderedJudgeArtifactPaths(resultDir, framework);
  if (paths.length === 0) return '';

  const header = '## Generated files (agent output on disk)\n\n';
  const chunks: string[] = [];
  let used = header.length;
  let filesIncluded = 0;

  for (const rel of paths) {
    const abs = path.join(resultDir, rel);
    let body: string;
    try {
      const stat = fs.statSync(abs);
      if (!stat.isFile()) continue;
      body = fs.readFileSync(abs, 'utf-8');
    } catch {
      continue;
    }
    if (body.includes('\u0000')) continue;

    const capped = truncateBlock(rel, body, MAX_CHARS_PER_ARTIFACT);
    const fence = '`'.repeat(3);
    const block = `### ${rel}\n\n${fence}\n${capped}\n${fence}\n`;
    if (used + block.length > maxTotalChars) {
      const omitted = paths.length - filesIncluded;
      if (omitted > 0) {
        chunks.push(`[… omitted ${omitted} generated file(s) (context limit) …]\n`);
      }
      break;
    }
    chunks.push(block);
    used += block.length;
    filesIncluded += 1;
  }

  return header + chunks.join('\n');
}

/**
 * Transcript for judging: run.log, generated source/config on disk, then README (aligned with heuristic assess).
 */
export function buildTranscriptForJudge(resultDir: string, framework: Framework): string {
  const logRaw = readFileSafe(resultDir, 'run.log').trim();
  let readme = readFileSafe(resultDir, 'README.md');
  if (!readme) readme = readFileSafe(resultDir, 'README');
  const readmeTrim = readme.trim();

  const logSection = truncateBlock('run.log', logRaw, 72_000);
  const readmeSection = readmeTrim ? truncateBlock('README', readmeTrim, 56_000) : '';

  const overhead =
    2000 +
    logSection.length +
    (readmeSection ? readmeSection.length + 80 : 0) +
    '## Transcript (Claude Code run.log)\n\n'.length +
    (readmeSection ? '## README (if written)\n\n'.length + 20 : 0);
  const genBudget = Math.max(16_000, MAX_TRANSCRIPT_CHARS - overhead);

  const genSection = buildGeneratedArtifactsMarkdown(resultDir, framework, genBudget);

  const parts: string[] = ['## Transcript (Claude Code run.log)', '', logSection];
  if (genSection.trim()) {
    parts.push('', '---', '', genSection.trimEnd());
  }
  if (readmeSection) {
    parts.push('', '---', '', '## README (if written)', '', readmeSection);
  }

  let text = parts.join('\n');
  if (text.length > MAX_TRANSCRIPT_CHARS) {
    text =
      text.slice(0, MAX_TRANSCRIPT_CHARS) +
      '\n\n[… transcript truncated for judge context …]\n';
  }
  return text;
}

export function formatLlmJudgeReportMarkdown(report: LlmJudgeReport): string {
  const lines: string[] = [
    '## LLM judge',
    '',
    `**Model:** ${report.model}`,
    `**Overall transcript pass:** ${report.overall_transcript_pass ? 'YES' : 'NO'}`,
    `**Execution (transcript-only):** pass=${String(report.execution_in_transcript.pass)} — ${report.execution_in_transcript.note}`,
    '',
    '### Per criterion',
    '',
  ];
  for (const c of report.criteria) {
    lines.push(`- **${c.pass ? 'PASS' : 'FAIL'}** — ${c.criterion}`);
    lines.push(`  - ${c.evidence}`);
  }
  lines.push('');
  lines.push('### Summary');
  lines.push('');
  lines.push(report.summary);
  lines.push('');
  return lines.join('\n');
}

export async function runLlmJudge(options: {
  readonly scenario: ScenarioConfig;
  readonly transcript: string;
  readonly apiKey: string;
  readonly model?: string;
}): Promise<LlmJudgeReport> {
  const model =
    options.model?.trim() ||
    process.env.JUDGE_MODEL?.trim() ||
    process.env.EVAL_SCORE_MODEL?.trim() ||
    DEFAULT_JUDGE_MODEL;
  const criteriaBlock = buildCriteriaMarkdown(options.scenario);

  const userContent = `## Success criteria (rubric)

${criteriaBlock}

---

## Transcript for review

${options.transcript}

---

Judge the transcript against the Success criteria. The transcript includes generated files on disk — treat their contents as the agent’s delivered code. Execution (running curl against a live API) is NOT evidenced here unless the transcript explicitly describes successful HTTP results; normally set execution_in_transcript.pass to null.`;

  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: JUDGE_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 2000)}`);
  }

  const body = (await res.json()) as {
    content?: readonly { type?: string; text?: string }[];
  };
  const textBlock = body.content?.find((c) => c.type === 'text');
  const text = textBlock?.text ?? '';
  let judged: ReturnType<typeof parseJudgeJson>;
  try {
    judged = parseJudgeJson(text);
  } catch {
    throw new Error(`Judge did not return parseable JSON. First 800 chars:\n${text.slice(0, 800)}`);
  }

  return {
    version: 1,
    model,
    scenarioName: options.scenario.name,
    overall_transcript_pass: judged.overall_transcript_pass,
    execution_in_transcript: judged.execution_in_transcript,
    criteria: judged.criteria,
    summary: judged.summary,
  };
}

/**
 * Writes llm-score.json and appends LLM judge section to report.md.
 */
export async function runLlmJudgeAndAppendReport(options: {
  readonly resultDir: string;
  readonly scenario: ScenarioConfig;
  readonly framework: Framework;
  readonly apiKey: string;
  readonly model?: string;
}): Promise<LlmJudgeReport> {
  const transcript = buildTranscriptForJudge(options.resultDir, options.framework);
  const report = await runLlmJudge({
    scenario: options.scenario,
    transcript,
    apiKey: options.apiKey,
    model: options.model,
  });

  const jsonPath = path.join(options.resultDir, 'llm-score.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  const md = formatLlmJudgeReportMarkdown(report);
  const reportPath = path.join(options.resultDir, 'report.md');
  fs.appendFileSync(reportPath, '\n' + md, 'utf-8');

  return report;
}

export function judgeEnabledFromEnv(): boolean {
  const v = process.env.RUN_LLM_JUDGE?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
