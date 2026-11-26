#!/usr/bin/env node

/**
 * Checks a directory build against what Anthropic's plugin directory refuses
 * for organizations that aren't Verified. Exits 1 on any failure.
 *
 * Usage: node scripts/check-directory-build.mjs <buildDir>
 *
 * Rules: https://claude.com/docs/plugins/pre-submission-checklist.md
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const buildDir = path.resolve(process.argv[2] ?? "dist/directory");
const errors = [];
const err = (m) => errors.push(m);

const ALLOWED_EXT = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"]);
const FORBIDDEN_NAMES = new Set([
  "package.json", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml",
  "bun.lock", "bun.lockb", "requirements.txt", "pyproject.toml", "pipfile", "pipfile.lock",
  "poetry.lock", "uv.lock", "go.mod", "go.sum", "gemfile", "gemfile.lock", "cargo.toml",
  "cargo.lock", "composer.json", "composer.lock", ".npmrc", "bunfig.toml", "uv.toml",
  "claude.md", "agents.md", ".ds_store", "thumbs.db", "desktop.ini",
]);
const ALLOWED_TOOLS = new Set(["Read", "Grep", "Glob", "LS"]);
const KNOWN_MANIFEST_FIELDS = new Set([
  "name", "version", "description", "author", "homepage", "repository", "license", "keywords",
  "displayName", "icon", "privacyPolicyUrl", "termsOfServiceUrl", "supportUrl",
  "documentationUrl", "classification", "skills", "commands", "agents", "hooks",
  "mcpServers", "lspServers", "userConfig", "outputStyles", "monitors", "themes", "channels",
  "dependencies", "settings",
]);
const MAX_FILES = 512;
const MAX_TEXT_BYTES = 256 * 1024;

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) err(`Symbolic link: ${path.relative(buildDir, full)}`);
    else if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

const rel = (f) => path.relative(buildDir, f).split(path.sep).join("/");

async function main() {
  try {
    await fs.access(buildDir);
  } catch {
    console.error(`Build directory not found: ${buildDir}`);
    process.exit(1);
  }
  const files = await walk(buildDir);

  // Manifest and icon.
  let iconPath = null;
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(buildDir, ".claude-plugin/plugin.json"), "utf8"));
    for (const key of Object.keys(manifest)) {
      if (!KNOWN_MANIFEST_FIELDS.has(key)) err(`plugin.json: unknown field "${key}"`);
    }
    for (const key of ["name", "description", "version", "author"]) {
      if (!manifest[key]) err(`plugin.json: missing "${key}"`);
    }
    if (manifest.icon) iconPath = path.posix.normalize(manifest.icon);
  } catch (e) {
    err(`.claude-plugin/plugin.json missing or invalid: ${e.message}`);
  }
  try {
    JSON.parse(await fs.readFile(path.join(buildDir, ".mcp.json"), "utf8"));
  } catch (e) {
    err(`.mcp.json missing or invalid: ${e.message}`);
  }

  if (files.length > MAX_FILES) err(`${files.length} files exceeds the ${MAX_FILES}-file limit`);

  const mdFiles = new Set(files.map(rel));
  for (const file of files) {
    const r = rel(file);
    const base = path.posix.basename(r);
    const ext = path.posix.extname(r).toLowerCase();

    if (FORBIDDEN_NAMES.has(base.toLowerCase())) err(`Forbidden file: ${r}`);
    if (ext === ".svg") {
      if (!iconPath || r !== iconPath) err(`.svg other than the plugin icon: ${r}`);
    } else if (base !== "LICENSE" && !ALLOWED_EXT.has(ext)) {
      err(`Disallowed file type: ${r}`);
    }

    const buf = await fs.readFile(file);
    if (buf.subarray(0, 2).toString("latin1") === "#!") err(`Starts with #!: ${r}`);
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg" && ext !== ".gif" && ext !== ".webp" && ext !== ".ico" && buf.length > MAX_TEXT_BYTES) {
      err(`Over 256 KiB: ${r}`);
    }
  }

  // README and LICENSE.
  try {
    const readme = await fs.readFile(path.join(buildDir, "README.md"), "utf8");
    const words = readme.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
    if (words < 40) err(`README.md has ${words} words outside code blocks (needs 40+)`);
  } catch {
    err("README.md missing");
  }
  if (!mdFiles.has("LICENSE") && !mdFiles.has("LICENSE.md")) err("LICENSE missing");

  // Markdown: allowed-tools and relative links.
  for (const file of files.filter((f) => f.endsWith(".md"))) {
    const r = rel(file);
    const text = await fs.readFile(file, "utf8");
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm) {
      const m = fm[1].match(/^allowed-tools\s*:\s*(.*)$/m);
      if (m) {
        // Tokens like Read, Grep, "Bash(curl:*)", or YAML/space-separated lists.
        const tokens = m[1].replace(/[\[\]"',]/g, " ").split(/\s+/).filter(Boolean);
        for (const t of tokens) {
          if (!ALLOWED_TOOLS.has(t)) err(`${r}: allowed-tools includes "${t}" (only Read, Grep, Glob, LS)`);
        }
        if (/^allowed-tools\s*:\s*$/m.test(fm[1])) err(`${r}: multi-line allowed-tools is not checked; remove it`);
      }
    }
    for (const link of relativeLinks(text)) {
      const [p] = link.split("#");
      if (!p) continue;
      const resolved = path.posix.normalize(
        p.startsWith("/") ? p.slice(1) : path.posix.join(path.posix.dirname(r), p),
      ).replace(/\/$/, "");
      const isFile = mdFiles.has(resolved);
      const isDir = [...mdFiles].some((f) => f.startsWith(resolved + "/"));
      if (!isFile && !isDir) err(`${r}: broken relative link "${link}"`);
    }
  }

  if (errors.length) {
    console.error(`\nDirectory build check FAILED (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`Directory build check passed: ${files.length} files in ${path.relative(process.cwd(), buildDir) || buildDir}`);
}

/** Relative link targets in Markdown, ignoring code fences and inline code. */
function relativeLinks(text) {
  const links = [];
  let inFence = false;
  let marker = "";
  for (const line of text.split("\n")) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) {
      if (!inFence) {
        inFence = true;
        marker = f[1][0];
      } else if (f[1][0] === marker) inFence = false;
      continue;
    }
    if (inFence) continue;
    const stripped = line.replace(/`[^`]*`/g, "");
    for (const m of stripped.matchAll(/\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"]*")?\)/g)) {
      const t = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith("#") || t.startsWith("//")) continue;
      links.push(t);
    }
  }
  return links;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
