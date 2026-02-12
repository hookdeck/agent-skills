/**
 * Initialize a fresh project for a given framework in the target directory.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import path from 'path';
import type { Framework } from './types.js';

/**
 * Initialize project in dir for the given framework.
 * Dir must exist and be empty (or we overwrite/merge).
 */
export function initializeProject(dir: string, framework: Framework): void {
  switch (framework) {
    case 'express':
      execSync('npm init -y', { cwd: dir, stdio: 'pipe' });
      execSync('npm install express', { cwd: dir, stdio: 'pipe' });
      break;
    case 'nextjs':
      execSync(
        'npx create-next-app@latest . --typescript --app --no-src-dir --no-tailwind --eslint --no-import-alias --yes',
        { cwd: dir, stdio: 'pipe' }
      );
      break;
    case 'fastapi':
      execSync('python3 -m venv venv', { cwd: dir, stdio: 'pipe' });
      const pip = process.platform === 'win32' ? path.join(dir, 'venv', 'Scripts', 'pip') : path.join(dir, 'venv', 'bin', 'pip');
      execSync(`${pip} install -q fastapi uvicorn python-dotenv`, { cwd: dir, stdio: 'pipe' });
      const mainPy = path.join(dir, 'main.py');
      fs.writeFileSync(
        mainPy,
        `from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok"}
`
      );
      break;
    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}
