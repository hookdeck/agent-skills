#!/usr/bin/env node
/**
 * Agent Scenario Tester - CLI entry point.
 * Run scenarios: install skill, run Claude with prompt, collect results.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import { findRepoRoot, listScenarios, loadScenario, parseResultDirName } from './config.js';
import { checkAll } from './preflight.js';
import { initializeProject } from './project.js';
import { listGeneratedFiles, writeReport } from './results.js';
import { runClaude } from './runner.js';
import { installSkills } from './skills.js';
import type { Framework } from './types.js';

const program = new Command();

program
  .name('agent-scenario-tester')
  .description('End-to-end agent scenario testing for Hookdeck agent-skills')
  .version('1.0.0');

program
  .command('list')
  .description('List available scenarios')
  .action(() => {
    try {
      const repoRoot = findRepoRoot(process.cwd());
      const scenarios = listScenarios(repoRoot);
      console.log('Available scenarios:');
      for (const s of scenarios) {
        console.log(`  ${s.name.padEnd(28)} ${s.displayName}`);
      }
      console.log('\nFrameworks: express, nextjs, fastapi');
    } catch (e) {
      console.error((e as Error).message);
      process.exit(1);
    }
  });

program
  .command('assess <resultDir>')
  .description(
    'Re-run the assessor on an existing result directory and update report.md (e.g. after fixing the assessor or when handler is in src/index.js)'
  )
  .action((resultDirArg: string) => {
    try {
      const repoRoot = findRepoRoot(process.cwd());
      const resultsDir = path.join(repoRoot, 'test-results');
      let resultDir: string;
      if (path.isAbsolute(resultDirArg)) {
        resultDir = resultDirArg;
      } else if (fs.existsSync(resultDirArg)) {
        resultDir = path.resolve(resultDirArg);
      } else {
        const withDot = path.join(resultsDir, resultDirArg);
        const withoutDot = path.join(resultsDir, resultDirArg.replace(/\.$/, ''));
        resultDir = fs.existsSync(withDot) ? withDot : withoutDot;
      }

      if (!fs.existsSync(resultDir) || !fs.statSync(resultDir).isDirectory()) {
        console.error(`Result directory not found: ${resultDir}`);
        process.exit(1);
      }

      const scenarioNames = listScenarios(repoRoot).map((s) => s.name);
      const dirName = path.basename(resultDir);
      const parsed = parseResultDirName(dirName, scenarioNames);
      if (!parsed) {
        console.error(
          `Could not infer scenario/framework from directory name: ${dirName}. Use format: <scenario>-<framework>-<provider?>-<timestamp>`
        );
        process.exit(1);
      }

      const resolved = loadScenario(repoRoot, parsed.scenarioName, parsed.framework, parsed.provider);
      const reportFile = path.join(resultDir, 'report.md');
      const logFile = path.join(resultDir, 'run.log');
      let duration = 0;
      try {
        const reportContent = fs.readFileSync(reportFile, 'utf-8');
        const m = reportContent.match(/\*\*Duration:\*\*\s*([\d.]+)s/);
        if (m) duration = parseFloat(m[1]);
      } catch {
        // keep 0
      }

      const result = {
        scenario: resolved.config,
        framework: resolved.framework,
        provider: resolved.provider,
        directory: resultDir,
        duration,
        filesGenerated: listGeneratedFiles(resultDir),
        logFile,
        reportFile,
        prompt: resolved.prompt,
      };
      writeReport(result, reportFile);
      console.log(`Updated ${reportFile}`);
      console.log(`  Scenario: ${resolved.config.name}, Framework: ${resolved.framework}${resolved.provider ? `, Provider: ${resolved.provider}` : ''}`);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(1);
    }
  });

program
  .command('run <scenario> <framework>')
  .description('Run a scenario (e.g. run receive-webhooks express)')
  .option('--provider <name>', 'Provider for composition scenarios (e.g. stripe)')
  .option('--dry-run', 'Show what would be done without executing')
  .option('--verbose', 'Verbose Claude output')
  .option('--timeout <seconds>', 'Max time for Claude (default 300)', '300')
  .action(
    async (
      scenarioName: string,
      framework: string,
      opts: { provider?: string; dryRun?: boolean; verbose?: boolean; timeout?: string }
    ) => {
      const frameworkTyped = framework as Framework;
      const timeoutMs = parseInt(opts.timeout ?? '300', 10) * 1000;
      try {
        const repoRoot = findRepoRoot(process.cwd());
        const resultsDir = path.join(repoRoot, 'test-results');
        const resolved = loadScenario(repoRoot, scenarioName, frameworkTyped, opts.provider);

        console.log('========================================');
        console.log(`  Agent Test: ${resolved.config.name} / ${framework}`);
        console.log('========================================\n');
        console.log(`Scenario:  ${resolved.config.displayName}`);
        console.log(`Framework: ${framework}`);
        if (opts.provider) console.log(`Provider:   ${opts.provider}`);
        console.log(`Prompt:    ${resolved.prompt.slice(0, 60)}...\n`);

        if (!opts.dryRun) {
          await checkAll();
        }

        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const scenarioSlug = opts.provider
          ? `${resolved.config.name}-${framework}-${opts.provider}`
          : `${resolved.config.name}-${framework}`;
        const resultDir = path.join(resultsDir, `${scenarioSlug}-${timestamp}`);
        fs.mkdirSync(resultDir, { recursive: true });

        const logFile = path.join(resultDir, 'run.log');
        const reportFile = path.join(resultDir, 'report.md');

        console.log('Initializing project...');
        initializeProject(resultDir, frameworkTyped);

        console.log('Installing skills...');
        installSkills(resultDir, repoRoot, resolved);

        console.log('Running Claude Code (this may take 2–5 minutes). Output below:\n');
        const { durationSeconds } = await runClaude(resultDir, resolved.prompt, logFile, {
          timeoutMs,
          verbose: opts.verbose,
          dryRun: opts.dryRun,
        });

        const filesGenerated = listGeneratedFiles(resultDir);
        const result = {
          scenario: resolved.config,
          framework: frameworkTyped,
          provider: opts.provider,
          directory: resultDir,
          duration: durationSeconds,
          filesGenerated,
          logFile,
          reportFile,
          prompt: resolved.prompt,
        };
        writeReport(result, reportFile);

        console.log('\n========================================');
        console.log('  Test Complete');
        console.log('========================================\n');
        console.log(`Duration:  ${durationSeconds.toFixed(1)}s`);
        console.log(`Result directory (report + log + agent output): ${resultDir}`);
        console.log(`  report.md   evaluation checklist and scoring`);
        console.log(`  run.log     full Claude output`);
        console.log(`  (rest)      generated project files`);
      } catch (e) {
        console.error((e as Error).message);
        process.exit(1);
      }
    }
  );

program.parse();
