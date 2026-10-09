/**
 * Docs consistency check — catches stale references before agents hit them.
 *
 * 1. Every backtick-quoted `*.md` reference in the agent docs must resolve to
 *    an existing file (repo root, `.agents/rules/`, or as written).
 * 2. Every `pnpm <script>` mentioned in the docs must exist in package.json
 *    (pnpm builtins like `install`/`add` are allowlisted).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const problems: string[] = [];

function collectMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectMarkdown(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

const docFiles = ["AGENTS.md", "README.md", ...collectMarkdown(join(root, ".agents"))];

// --- 1. .md file references -------------------------------------------------
const mdRef = /`([^`<>\n]+\.md)`/g;
for (const file of docFiles) {
  const text = readFileSync(file, "utf8");
  for (const [, ref] of text.matchAll(mdRef)) {
    if (ref.includes("*")) continue; // glob patterns like `.agents/rules/*.md`
    const candidates = [ref, join(".agents/rules", ref), join(".agents/skills", ref, "SKILL.md")];
    if (!candidates.some((c) => existsSync(join(root, c)))) {
      problems.push(`${file}: referenced \`${ref}\` — no such file`);
    }
  }
}

// --- 2. pnpm script references ----------------------------------------------
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};
const scripts = new Set(Object.keys(pkg.scripts ?? {}));

// A script named like a pnpm builtin is shadowed at runtime (`pnpm doctor` runs
// pnpm's own doctor, not the script) — flag the collision in package.json.
const pnpmBuiltinNames = new Set([
  "install",
  "add",
  "remove",
  "update",
  "exec",
  "dlx",
  "run",
  "create",
  "store",
  "prune",
  "why",
  "list",
  "outdated",
  "rebuild",
  "link",
  "unlink",
  "pack",
  "publish",
  "audit",
  "setup",
  "doctor",
  "bin",
  "init",
  "env",
  "node",
  "ping",
  "workspace",
  "recursive",
  "restart",
  "root",
  "completion",
  "licenses",
  "help"
]);
for (const name of scripts) {
  if (pnpmBuiltinNames.has(name)) {
    problems.push(
      `package.json: script "${name}" collides with a pnpm builtin — \`pnpm ${name}\` would run pnpm's command, not this script`
    );
  }
}

const pnpmBuiltins = new Set([
  "install",
  "add",
  "remove",
  "update",
  "exec",
  "dlx",
  "run",
  "create",
  "store",
  "prune",
  "why",
  "list",
  "outdated",
  "rebuild",
  "link",
  "unlink",
  "pack",
  "publish",
  "audit",
  "i",
  "up",
  "rm"
]);
const pnpmRef = /\bpnpm (?:run )?([a-z][a-z0-9:_-]*)/g;
const scanTargets = [...docFiles, ...collectMarkdown(join(root, ".github"))];
for (const file of scanTargets) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const [, name] of text.matchAll(pnpmRef)) {
    if (!scripts.has(name) && !pnpmBuiltins.has(name)) {
      problems.push(`${file}: \`pnpm ${name}\` — no such script in package.json`);
    }
  }
}

if (problems.length > 0) {
  console.error(`docs check FAILED (${problems.length} problem(s)):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`docs OK (${docFiles.length} files checked)`);
