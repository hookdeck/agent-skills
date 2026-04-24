/**
 * Load repo-root `.env` before commands run (does not override existing process.env).
 */

import { config as dotenvConfig } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { findRepoRoot } from './config.js';

/**
 * If `scenarios.yaml` can be resolved from cwd, load `<repoRoot>/.env` when the file exists.
 */
export function loadRepoDotenv(cwd: string = process.cwd()): void {
  try {
    const repoRoot = findRepoRoot(cwd);
    const envPath = path.join(repoRoot, '.env');
    if (fs.existsSync(envPath)) {
      dotenvConfig({ path: envPath });
    }
  } catch {
    // No scenarios.yaml (e.g. wrong cwd); skip silently.
  }
}
