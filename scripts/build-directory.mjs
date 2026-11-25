#!/usr/bin/env node

/**
 * Builds the directory-only copy of the Claude Code plugin.
 *
 * Anthropic's plugin directory accepts only Markdown, text, JSON, YAML and a few
 * image types from organizations that aren't Verified. This script copies just
 * those files into an output folder, strips `allowed-tools` from SKILL.md files,
 * and rewrites relative links to files the build leaves out into absolute
 * GitHub URLs. The output is committed to the `directory` branch by
 * .github/workflows/build-directory-branch.yml.
 *
 * Usage: node scripts/build-directory.mjs [outDir]   (default: dist/directory)
 * Run from the repository root. Runs scripts/check-directory-build.mjs on the output.
 */

import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const outDir = path.resolve(repoRoot, process.argv[2] ?? "dist/directory");
const GITHUB = "https://github.com/hookdeck/agent-skills";
const BRANCH = "main";

/** Files copied as-is (repo-relative). */
const FIXED_FILES = [
  ".claude-plugin/plugin.json",
  ".mcp.json",
  "assets/logo.svg",
  "README.md",
  "LICENSE",
];

const unresolved = [];
const rewritten = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

const toPosix = (p) => p.split(path.sep).join("/");

async function exists(p) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

/** Remove `allowed-tools` (and any indented continuation lines) from SKILL.md frontmatter. */
function stripAllowedTools(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) return text;
  const lines = match[1].split(/\r?\n/);
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    if (/^allowed-tools\s*:/.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && /^\s+\S/.test(line)) continue; // continuation of the removed key
    skipping = false;
    kept.push(line);
  }
  return text.replace(match[1], kept.join("\n"));
}

/**
 * Rewrite relative Markdown links whose target is not in the build.
 * Skips fenced code blocks and inline code spans.
 */
function rewriteLinks(text, relFile, includedSet) {
  const fileDir = path.posix.dirname(relFile);
  const lines = text.split("\n");
  let inFence = false;
  let fenceMarker = "";
  const out = lines.map((line) => {
    const fence = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
      }
      return line;
    }
    if (inFence) return line;
    // Split on inline code spans so links inside backticks are untouched.
    const parts = line.split(/(`[^`]*`)/);
    return parts
      .map((part) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return part;
        return part.replace(/(\]\()((?:[^()\s]|\([^()\s]*\))+)((?:\s+"[^"]*")?\))/g, (m, open, target, close) => {
          const replaced = rewriteTarget(target, fileDir, relFile, includedSet);
          return replaced === null ? m : `${open}${replaced}${close}`;
        });
      })
      .join("");
  });
  return out.join("\n");
}

const REF_DEF = /^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/;

function rewriteTarget(target, fileDir, relFile, includedSet) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("//")) return null;
  const hashIdx = target.indexOf("#");
  const rawPath = hashIdx === -1 ? target : target.slice(0, hashIdx);
  const fragment = hashIdx === -1 ? "" : target.slice(hashIdx);
  if (!rawPath) return null;
  const resolved = rawPath.startsWith("/")
    ? path.posix.normalize(rawPath.slice(1))
    : path.posix.normalize(path.posix.join(fileDir, rawPath));
  const trimmed = resolved.replace(/\/$/, "");
  if (includedSet.has(trimmed)) return null; // stays relative and resolves in the build
  const abs = path.join(repoRoot, trimmed);
  const stat = pathStatSync(abs);
  if (!stat) {
    unresolved.push(`${relFile}: ${target}`);
    return null;
  }
  const kind = stat.isDirectory() ? "tree" : "blob";
  const url = `${GITHUB}/${kind}/${BRANCH}/${trimmed}${fragment}`;
  rewritten.push(`${relFile}: ${target} -> ${url}`);
  return url;
}

function pathStatSync(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

async function main() {
  // Collect the list of files that go into the build.
  const included = [];
  for (const f of FIXED_FILES) {
    if (!(await exists(path.join(repoRoot, f)))) throw new Error(`Missing required file: ${f}`);
    included.push(f);
  }
  const skillFiles = await walk(path.join(repoRoot, "skills"));
  for (const abs of skillFiles.sort()) {
    const rel = toPosix(path.relative(repoRoot, abs));
    if (/^skills\/[^/]+\/examples\//.test(rel)) continue;
    if (!rel.endsWith(".md")) continue; // drops tile.json and anything else
    included.push(rel);
  }
  const includedSet = new Set(included);

  await fs.rm(outDir, { recursive: true, force: true });
  for (const rel of included) {
    const src = path.join(repoRoot, rel);
    const dest = path.join(outDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    if (rel.endsWith(".md")) {
      let text = await fs.readFile(src, "utf8");
      if (path.posix.basename(rel) === "SKILL.md") text = stripAllowedTools(text);
      text = rewriteLinks(text, rel, includedSet);
      // Reference-style definitions: [label]: ./path
      text = text
        .split("\n")
        .map((line) => {
          const m = line.match(REF_DEF);
          if (!m) return line;
          const r = rewriteTarget(m[2], path.posix.dirname(rel), rel, includedSet);
          return r === null ? line : `${m[1]}${r}${m[3]}`;
        })
        .join("\n");
      await fs.writeFile(dest, text);
    } else {
      await fs.copyFile(src, dest);
    }
  }

  console.log(`Built ${included.length} files into ${path.relative(repoRoot, outDir) || outDir}`);
  console.log(`Rewrote ${rewritten.length} relative links to absolute GitHub URLs`);
  for (const r of rewritten) console.log(`  ${r}`);
  if (unresolved.length) {
    console.log(`Could not resolve ${unresolved.length} relative links (left unchanged):`);
    for (const u of unresolved) console.log(`  ${u}`);
  }

  const check = spawnSync(process.execPath, [path.join(repoRoot, "scripts/check-directory-build.mjs"), outDir], {
    stdio: "inherit",
  });
  process.exit(check.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
