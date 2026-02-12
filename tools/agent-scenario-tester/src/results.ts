/**
 * Collect generated files and write Markdown report + log path.
 * Runs automated assessment to fill rubric and scores.
 */

import * as fs from 'fs';
import path from 'path';
import { assessResult } from './assess.js';
import type { ScenarioResult } from './types.js';

const IGNORE_DIRS = new Set([
  'node_modules',
  'venv',
  '.venv',
  'env',
  '.git',
  '.next',
  '.agents',
  '.claude',
  '.codex',
  '.cursor',
]);

const IGNORE_FILES = new Set([
  'package-lock.json',
  '.env',
  '.env.local',
  'report.md',
  'run.log',
]);

function collectFiles(dir: string, baseDir: string, list: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = path.relative(baseDir, path.join(dir, e.name));
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      collectFiles(path.join(dir, e.name), baseDir, list);
    } else {
      if (IGNORE_FILES.has(e.name)) continue;
      list.push(rel);
    }
  }
}

/**
 * List project files (excluding node_modules, venv, .git, etc.).
 */
export function listGeneratedFiles(projectDir: string): string[] {
  const list: string[] = [];
  collectFiles(projectDir, projectDir, list);
  return list.sort();
}

/**
 * Write the Markdown report file for the scenario run.
 * Runs automated assessment and fills the rubric (checkboxes + scores).
 */
export function writeReport(result: ScenarioResult, reportPath: string): void {
  const { scenario, framework, provider, directory, duration, filesGenerated, logFile, prompt } = result;
  const logBasename = path.basename(logFile);
  const totalPoints = scenario.evaluation.reduce((s, e) => s + e.points, 0);

  const assessment = assessResult(directory, scenario, framework, provider);

  const lines: string[] = [
    `# Agent Test Results: ${scenario.name} / ${framework}`,
    '',
    `**Date:** ${new Date().toLocaleString()}`,
    `**Duration:** ${duration}s`,
    `**Directory:** ${directory}`,
    '',
    '## Automated assessment',
    '',
    `**Total score: ${assessment.totalScore}/${assessment.totalMax}**`,
    '',
    'The checklist and scores below were filled by the tool from the generated files and run.log. Review and adjust if needed.',
    '',
    '## Configuration',
    '',
    `- **Scenario:** ${scenario.displayName}`,
    `- **Framework:** ${framework}`,
    ...(provider ? [`- **Provider:** ${provider}`] : []),
    '',
    '## Prompt',
    '',
    `> ${prompt.replace(/\n/g, ' ')}`,
    '',
    '## Files Generated',
    '',
    '```',
    ...filesGenerated,
    '```',
    '',
    '## Evaluation Checklist',
    '',
  ];
  for (let i = 0; i < scenario.evaluation.length; i++) {
    const section = scenario.evaluation[i];
    const sectionResult = assessment.sectionResults[i];
    lines.push(`### ${section.stage} (${section.points} pts)`);
    lines.push('');
    for (const cr of sectionResult.checks) {
      lines.push(`- [${cr.passed ? 'x' : ' '}] ${cr.check}`);
    }
    lines.push('');
  }
  lines.push('## Scoring');
  lines.push('');
  lines.push('| Criterion | Points | Score |');
  lines.push('|-----------|--------|-------|');
  for (let i = 0; i < scenario.evaluation.length; i++) {
    const section = scenario.evaluation[i];
    const sectionResult = assessment.sectionResults[i];
    lines.push(`| ${section.stage} | ${section.points} | ${sectionResult.score}/${section.points} |`);
  }
  lines.push(`| **Total** | **${totalPoints}** | **${assessment.totalScore}/${totalPoints}** |`);
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('(Add observations here)');
  lines.push('');
  lines.push('## Skill usage');
  lines.push('');
  lines.push('To see if the agent used the installed skill, search run.log for references to skill files (e.g. verification-code.md, 02-scaffold.md, SKILL.md). The prompt asks the agent to cite which file it used.');
  lines.push('');
  lines.push('## Full Log');
  lines.push('');
  lines.push(`See: ${logBasename}`);
  lines.push('');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join('\n'));
}
