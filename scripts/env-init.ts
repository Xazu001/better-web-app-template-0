import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

import { parse as parseJsonc, type ParseError } from "jsonc-parser";

import { generateJwtPair } from "./gen-keys";
import { jwtPairState } from "./lib/dev-vars";
import {
  ENV_VARS,
  fillEnvFile,
  renderEnvFile,
  type EnvFileKind,
  type EnvVarSpec
} from "./lib/env-manifest";

const PLACEHOLDER_ID = /^0{8}-0{4}-0{4}-0{4}-0{12}$|^0{32}$/;

interface WranglerConfig {
  account_id?: string;
  env?: Record<string, { d1_databases?: { binding: string; database_id: string }[] } | undefined>;
}

const hasUsableId = (value: string | undefined): value is string =>
  Boolean(value && !PLACEHOLDER_ID.test(value));

function valuesFromWrangler(cwd: string): Record<string, string> {
  const configPath = join(cwd, "wrangler.jsonc");
  if (!existsSync(configPath)) return {};

  const errors: ParseError[] = [];
  const config = parseJsonc(readFileSync(configPath, "utf8"), errors) as WranglerConfig | undefined;
  if (errors.length > 0) {
    throw new Error("wrangler.jsonc has JSONC parse errors; fix it before running env:init.");
  }

  const values: Record<string, string> = {};
  if (hasUsableId(config?.account_id)) {
    values.CLOUDFLARE_ACCOUNT_ID = config.account_id;
  }

  const ownedDatabase = (envName: "dev" | "prod") =>
    config?.env?.[envName]?.d1_databases?.find((database) => database.binding === "db");
  const devDatabaseId = ownedDatabase("dev")?.database_id;
  const prodDatabaseId = ownedDatabase("prod")?.database_id;

  if (hasUsableId(devDatabaseId)) values.CLOUDFLARE_DB_ID = devDatabaseId;
  if (hasUsableId(prodDatabaseId)) values.CLOUDFLARE_DB_PROD_ID = prodDatabaseId;

  return values;
}

function generatedValues(
  specs: readonly EnvVarSpec[],
  existing: string | null,
  file: string,
  wranglerValues: Record<string, string> = {}
): Record<string, string> {
  const parsed = parseEnv(existing ?? "") as Record<string, string | undefined>;
  const generated: Record<string, string> = { ...wranglerValues };

  if (specs.some((spec) => spec.generate === "jwt-pair")) {
    const state = jwtPairState(parsed);
    if (state === "missing-private" || state === "missing-public") {
      throw new Error(
        `${file} has only one JWT key; remove the orphan line and run \`pnpm gen:keys ${file}\` to regenerate the pair.`
      );
    }
    if (state === "absent") Object.assign(generated, generateJwtPair());
  }

  for (const spec of specs) {
    if (spec.generate === "hex32" && !parsed[spec.name]) {
      generated[spec.name] = randomBytes(32).toString("hex");
    }
  }

  return generated;
}

export function initEnvFiles(opts: { cwd?: string; log?: (msg: string) => void } = {}): void {
  const cwd = opts.cwd ?? process.cwd();
  const log = opts.log ?? console.log;
  const targets: { file: string; kind: EnvFileKind }[] = [
    { file: ".dev.vars", kind: "dev-vars" },
    { file: ".dev.vars.prod", kind: "dev-vars" },
    { file: ".env", kind: "env" }
  ];
  const wranglerValues = valuesFromWrangler(cwd);

  for (const target of targets) {
    const path = join(cwd, target.file);
    const existing = existsSync(path) ? readFileSync(path, "utf8") : null;
    const specs = ENV_VARS.filter((spec) => spec.file === target.kind);
    const generated = generatedValues(
      specs,
      existing,
      target.file,
      target.kind === "env" ? wranglerValues : {}
    );
    const result = fillEnvFile(existing, target.kind, generated);

    if (existing === null || result.content !== existing) {
      writeFileSync(path, result.content);
    }

    if (existing === null) {
      log(
        `${target.file}: created; added ${result.added.join(", ")}` +
          (result.filled.length > 0 ? `; filled ${result.filled.join(", ")}` : "")
      );
    } else if (result.added.length > 0 || result.filled.length > 0) {
      const changes = [
        result.added.length > 0 ? `added ${result.added.join(", ")}` : "",
        result.filled.length > 0 ? `filled ${result.filled.join(", ")}` : ""
      ].filter(Boolean);
      log(`${target.file}: ${changes.join("; ")}`);
    } else {
      log(`${target.file}: up to date`);
    }
  }
}

function writeExamples(): void {
  writeFileSync(".dev.vars.example", renderEnvFile("dev-vars"));
  writeFileSync(".env.example", renderEnvFile("env"));
}

function checkExamples(): boolean {
  const outdated = [
    [".dev.vars.example", renderEnvFile("dev-vars")],
    [".env.example", renderEnvFile("env")]
  ].filter(([file, content]) => !existsSync(file) || readFileSync(file, "utf8") !== content);

  if (outdated.length === 0) {
    console.log("Environment examples are up to date.");
    return true;
  }

  console.error(`Out-of-date environment examples: ${outdated.map(([file]) => file).join(", ")}`);
  return false;
}

function runCli(args: string[]): void {
  if (args.length === 0) {
    initEnvFiles();
  } else if (args.length === 1 && args[0] === "--examples") {
    writeExamples();
  } else if (args.length === 1 && args[0] === "--check") {
    if (!checkExamples()) process.exitCode = 1;
  } else {
    console.error("Usage: pnpm env:init [--examples|--check]");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli(process.argv.slice(2));
}
