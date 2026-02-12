/**
 * Pre-flight checks: Claude CLI available and responsive, network connectivity.
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';

const PREFLIGHT_TIMEOUT_MS = 15000;

/**
 * Check if Claude CLI is installed (claude in PATH).
 */
export function isClaudeInstalled(): boolean {
  try {
    execSync('claude --version', { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Claude CLI responds within timeout (spawns claude -p "Reply with only: OK").
 */
export function checkClaudeResponsive(timeoutMs: number = PREFLIGHT_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('claude', ['-p', 'Reply with only: OK'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let resolved = false;
    const t = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      child.kill('SIGTERM');
      resolve(false);
    }, timeoutMs);
    child.on('exit', (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(t);
      resolve(code === 0);
    });
    child.on('error', () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(t);
      resolve(false);
    });
  });
}

/**
 * Run all preflight checks. Throws with actionable message on failure.
 */
export async function checkAll(): Promise<void> {
  if (!isClaudeInstalled()) {
    throw new Error(
      'Claude CLI is not installed. Install from: https://claude.ai/download'
    );
  }
  const responsive = await checkClaudeResponsive();
  if (!responsive) {
    throw new Error(
      'Claude CLI did not respond within 15s. Check network, ANTHROPIC_API_KEY, or try: claude logout && claude login'
    );
  }
}
