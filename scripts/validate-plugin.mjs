#!/usr/bin/env node

/**
 * Validates Cursor plugin structure for single-plugin repos (no marketplace.json).
 * Run from repo root: node scripts/validate-plugin.mjs
 *
 * Based on Cursor plugin template checklist:
 * https://github.com/cursor/plugin-template#submission-checklist
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const pluginDir = repoRoot;
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${path.relative(repoRoot, filePath)}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON: ${error.message}`);
    return null;
  }
}

function normalizeNewlines(content) {
  return content.replace(/\r\n/g, "\n");
}

function parseFrontmatter(content) {
  const normalized = normalizeNewlines(content);
  if (!normalized.startsWith("---\n")) return null;
  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) return null;
  const frontmatterBlock = normalized.slice(4, closingIndex);
  const fields = {};
  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }
  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => extractPathValues(v));
  if (value && typeof value === "object") {
    const candidates = [];
    if (typeof value.path === "string") candidates.push(value.path);
    if (typeof value.file === "string") candidates.push(value.file);
    return candidates;
  }
  return [];
}

async function validateReferencedPath(fieldName, pathValue, pluginName) {
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) return;
  if (!isSafeRelativePath(pathValue)) {
    addError(`${pluginName}: field "${fieldName}" has invalid path "${pathValue}"`);
    return;
  }
  const resolved = path.resolve(pluginDir, pathValue);
  if (!(await pathExists(resolved))) {
    addError(`${pluginName}: field "${fieldName}" references missing path "${pathValue}"`);
  }
}

async function validateFrontmatterFile(filePath, componentName, requiredKeys, pluginName) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const relativeFile = path.relative(repoRoot, filePath);
  if (!parsed) {
    addError(`${pluginName}: ${componentName} missing YAML frontmatter: ${relativeFile}`);
    return;
  }
  for (const key of requiredKeys) {
    if (!parsed[key] || String(parsed[key]).length === 0) {
      addError(`${pluginName}: ${componentName} missing "${key}" in frontmatter: ${relativeFile}`);
    }
  }
}

async function validateComponentFrontmatter(pluginName) {
  const rulesDir = path.join(pluginDir, "rules");
  if (await pathExists(rulesDir)) {
    const files = await walkFiles(rulesDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if ([".md", ".mdc", ".markdown"].includes(ext)) {
        await validateFrontmatterFile(file, "rule", ["description"], pluginName);
      }
    }
  }

  const skillsDir = path.join(pluginDir, "skills");
  if (await pathExists(skillsDir)) {
    const files = await walkFiles(skillsDir);
    for (const file of files) {
      if (path.basename(file) === "SKILL.md") {
        await validateFrontmatterFile(file, "skill", ["name", "description"], pluginName);
      }
    }
  }
}

async function main() {
  const manifestPath = path.join(pluginDir, ".cursor-plugin", "plugin.json");
  const manifest = await readJsonFile(manifestPath, "Plugin manifest");
  if (!manifest) {
    summarizeAndExit();
    return;
  }

  const pluginName = manifest.name || "plugin";

  if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
    addError('"name" in plugin.json must be lowercase kebab-case (alphanumerics, hyphens, periods)');
  }

  const requiredManifestFields = ["displayName", "description", "version"];
  for (const field of requiredManifestFields) {
    if (!manifest[field]) {
      addError(`plugin.json missing required field: "${field}"`);
    }
  }

  const manifestPathFields = ["logo", "rules", "skills"];
  for (const field of manifestPathFields) {
    const values = extractPathValues(manifest[field]);
    for (const value of values) {
      await validateReferencedPath(field, value, pluginName);
    }
  }

  await validateComponentFrontmatter(pluginName);

  if (!(await pathExists(path.join(pluginDir, "CHANGELOG.md")))) {
    addError("CHANGELOG.md is required");
  }

  if (!(await pathExists(path.join(pluginDir, "LICENSE")))) {
    addError("LICENSE file is required");
  }

  if (!(await pathExists(path.join(pluginDir, "README.md")))) {
    addError("README.md is required");
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`  - ${w}`);
    console.log("");
  }
  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Validation passed.");
}

main();
