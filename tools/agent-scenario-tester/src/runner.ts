/**
 * Execute Claude Code CLI with the scenario prompt; capture output and duration.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import path from 'path';

export interface RunOptions {
  timeoutMs?: number;
  verbose?: boolean;
  dryRun?: boolean;
  /** If true (default), stream Claude output to stdout/stderr as well as the log file. */
  streamOutput?: boolean;
}

const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

/**
 * Run claude -p --dangerously-skip-permissions "<prompt>" in cwd.
 * Writes stdout+stderr to logPath. If streamOutput is true, also forwards to process.stdout/stderr.
 */
export async function runClaude(
  cwd: string,
  prompt: string,
  logPath: string,
  options: RunOptions = {}
): Promise<{ durationSeconds: number; exitCode: number }> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, verbose = false, dryRun = false, streamOutput = true } = options;

  if (dryRun) {
    fs.writeFileSync(logPath, `[DRY RUN] Would run: claude -p --dangerously-skip-permissions "${prompt}"\n`);
    return { durationSeconds: 0, exitCode: 0 };
  }

  const start = Date.now();
  const args = ['-p', '--dangerously-skip-permissions', prompt];
  if (verbose) args.splice(2, 0, '--verbose');

  return new Promise((resolve) => {
    const child = spawn('claude', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const outStream = fs.createWriteStream(logPath, { flags: 'a' });
    const writeOut = (chunk: Buffer | string) => {
      outStream.write(chunk);
      if (streamOutput) process.stdout.write(chunk);
    };
    const writeErr = (chunk: Buffer | string) => {
      outStream.write(chunk);
      if (streamOutput) process.stderr.write(chunk);
    };
    child.stdout?.on('data', writeOut);
    child.stderr?.on('data', writeErr);
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      outStream.write('\n[Timed out]\n');
      outStream.end();
      const durationSeconds = (Date.now() - start) / 1000;
      resolve({ durationSeconds, exitCode: 124 });
    }, timeoutMs);
    child.on('exit', (code, signal) => {
      clearTimeout(timeout);
      outStream.end();
      const durationSeconds = (Date.now() - start) / 1000;
      resolve({ durationSeconds, exitCode: code ?? (signal ? 1 : 0) });
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      outStream.write(String(err));
      outStream.end();
      const durationSeconds = (Date.now() - start) / 1000;
      resolve({ durationSeconds, exitCode: 1 });
    });
  });
}
