import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

import { applyEdits, modify, parse as parseJsonc, type ParseError } from "jsonc-parser";

const ACCOUNT_ID_RE = /^[0-9a-f]{32}$/i;
const PLACEHOLDER_ID = /^0{8}-0{4}-0{4}-0{4}-0{12}$|^0{32}$/;
const D1_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KV_ID_RE = /^[0-9a-f]{32}$/i;

const OWNED_D1_BINDINGS = ["db"];
const REQUIRED_ACCOUNT_ID: string | null = null;

type Env = "dev" | "prod";

export interface Options {
  env: Env;
  apply: boolean;
  accountId?: string;
  confirmAccount?: string;
}

export function parseArgs(argv: string[]): Options {
  const opts: Options = { env: "dev", apply: false };
  let envSeen = false;
  const takeValue = (flag: string, i: number): string => {
    const v = argv[i + 1];
    if (v === undefined || v === "" || v.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      continue;
    } else if (arg === "--env") {
      const v = takeValue("--env", i);
      i++;
      if (v !== "dev" && v !== "prod") {
        throw new Error(`invalid --env "${v}" — expected dev or prod (local is never provisioned)`);
      }
      if (envSeen && opts.env !== v) {
        throw new Error("conflicting --env values provided");
      }
      envSeen = true;
      opts.env = v;
    } else if (arg === "--apply") {
      opts.apply = true;
    } else if (arg === "--account-id") {
      opts.accountId = takeValue("--account-id", i);
      i++;
    } else if (arg === "--confirm-account") {
      opts.confirmAccount = takeValue("--confirm-account", i);
      i++;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

interface WranglerConfig {
  name?: string;
  account_id?: string;
  env?: Record<string, EnvConfig>;
  [k: string]: unknown;
}

interface EnvConfig {
  name?: string;
  account_id?: string;
  d1_databases?: { binding: string; database_name: string; database_id?: string }[];
  kv_namespaces?: { binding: string; id?: string }[];
  r2_buckets?: { binding: string; bucket_name: string }[];
  queues?: {
    producers?: { binding: string; queue: string }[];
    consumers?: { queue: string; dead_letter_queue?: string }[];
  };
  [k: string]: unknown;
}

export interface D1Resource {
  binding: string;
  name: string;
  configuredId?: string;
  index: number;
}
export interface KvResource {
  binding: string;
  configuredId?: string;
  title: string;
  index: number;
}
export interface Plan {
  env: Env;
  workerName: string;
  d1: D1Resource[];
  kv: KvResource[];
  r2: string[];
  queues: string[];
}

export function buildPlan(config: EnvConfig, env: Env, rootConfig: WranglerConfig): Plan {
  const workerName = config.name ?? rootConfig.name;
  const d1: D1Resource[] = [];
  const seenBindings = new Set<string>();
  for (const [index, d] of (config.d1_databases ?? []).entries()) {
    if (!OWNED_D1_BINDINGS.includes(d.binding)) continue;
    if (seenBindings.has(d.binding)) {
      throw new Error(`duplicate owned D1 binding "${d.binding}" in env.${env}`);
    }
    seenBindings.add(d.binding);
    if (!d.database_name) {
      throw new Error(`env.${env} d1 binding "${d.binding}" is missing database_name`);
    }
    d1.push({ binding: d.binding, name: d.database_name, configuredId: d.database_id, index });
  }
  const kv: KvResource[] = (config.kv_namespaces ?? []).map((ns, index) => {
    if (seenBindings.has(ns.binding)) {
      throw new Error(`duplicate binding "${ns.binding}" in env.${env}`);
    }
    seenBindings.add(ns.binding);
    return {
      binding: ns.binding,
      configuredId: ns.id,
      title: `${rootConfig.name}-${env}-${ns.binding}`,
      index
    };
  });
  if (!workerName) {
    throw new Error(`env.${env} (and root config) has no worker name`);
  }
  const r2 = [...new Set((config.r2_buckets ?? []).map((b) => b.bucket_name))];
  if (r2.some((b) => !b)) {
    throw new Error(`env.${env} has an r2 bucket with no bucket_name`);
  }
  const queueNames = new Set<string>();
  for (const p of config.queues?.producers ?? []) queueNames.add(p.queue);
  for (const c of config.queues?.consumers ?? []) {
    queueNames.add(c.queue);
    if (c.dead_letter_queue) queueNames.add(c.dead_letter_queue);
  }
  for (const q of queueNames) {
    if (!q) throw new Error(`env.${env} has a queue with no name`);
  }
  return { env, workerName, d1, kv, r2, queues: [...queueNames] };
}

const isValidAccountId = (v: string | undefined): v is string =>
  typeof v === "string" && ACCOUNT_ID_RE.test(v) && !/^0{32}$/i.test(v);

export function resolveAccountId(opts: {
  cli?: string;
  processEnv?: string;
  dotEnvFile?: string;
  envAccountId?: string;
  configAccountId?: string;
}): { id: string; source: string } {
  const candidates: [string | undefined, string][] = [
    [opts.cli, "--account-id"],
    [opts.processEnv, "CLOUDFLARE_ACCOUNT_ID (environment)"],
    [opts.dotEnvFile, "CLOUDFLARE_ACCOUNT_ID (.env)"],
    [
      opts.envAccountId && !PLACEHOLDER_ID.test(opts.envAccountId)
        ? opts.envAccountId
        : undefined,
      `wrangler.jsonc env account_id`
    ],
    [
      opts.configAccountId && !PLACEHOLDER_ID.test(opts.configAccountId)
        ? opts.configAccountId
        : undefined,
      "wrangler.jsonc account_id"
    ]
  ];
  for (const [value, source] of candidates) {
    if (value === undefined || value === "") continue;
    if (isValidAccountId(value)) return { id: value, source };
    throw new Error(
      `invalid Cloudflare account ID from ${source} — expected a 32-hex account ID, refusing to fall back to a different account`
    );
  }
  throw new Error(
    "no valid Cloudflare account ID — pass --account-id <32-hex>, set CLOUDFLARE_ACCOUNT_ID, add it to .env, or set account_id in wrangler.jsonc"
  );
}

export interface SpawnResult {
  status: number;
  stdout: string;
  stderr: string;
}
export type SpawnFn = (argv: string[], env: NodeJS.ProcessEnv) => SpawnResult;
export type PromptFn = (question: string) => Promise<string>;

const wranglerBin = (): string => {
  const req = createRequire(import.meta.url);
  const pkg = req.resolve("wrangler/package.json");
  return join(dirname(pkg), "bin", "wrangler.js");
};

const realSpawn = (argv: string[], env: NodeJS.ProcessEnv): SpawnResult => {
  const r = spawnSync(process.execPath, [wranglerBin(), ...argv], {
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? String(r.error ?? "")
  };
};

const ALREADY_EXISTS_RE = /already exists/i;

const redact = (s: string, secrets: string[]): string => {
  let out = s;
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join("[REDACTED]");
  }
  return out;
};

export async function main(deps: {
  argv: string[];
  spawn?: SpawnFn;
  prompt?: PromptFn;
  processEnv?: NodeJS.ProcessEnv;
  cwd?: string;
  out?: (msg: string) => void;
}): Promise<number> {
  const out = deps.out ?? ((m: string) => console.log(m));
  const cwd = deps.cwd ?? process.cwd();
  const processEnv = deps.processEnv ?? process.env;
  const configPath = join(cwd, "wrangler.jsonc");
  const envFilePath = join(cwd, ".env");
  const secretsToRedact: string[] = [];

  let opts: Options;
  try {
    opts = parseArgs(deps.argv);
  } catch (e) {
    out(`cf:setup: ${e instanceof Error ? e.message : e}`);
    return 1;
  }
  if (!existsSync(configPath)) {
    out("cf:setup: wrangler.jsonc not found — create it from wrangler.example.jsonc first");
    return 1;
  }
  const configText = readFileSync(configPath, "utf8");
  const parseErrors: ParseError[] = [];
  const rootConfig = parseJsonc(configText, parseErrors) as WranglerConfig;
  if (parseErrors.length > 0) {
    out(
      `cf:setup: wrangler.jsonc has ${parseErrors.length} parse error(s) at offset ${parseErrors
        .map((e) => e.offset)
        .join(", ")} — fix the config first`
    );
    return 1;
  }
  if (!rootConfig || typeof rootConfig !== "object") {
    out("cf:setup: wrangler.jsonc did not parse to an object");
    return 1;
  }
  const envCfg = rootConfig.env?.[opts.env] as EnvConfig | undefined;
  if (!envCfg || typeof envCfg !== "object") {
    out(`cf:setup: wrangler.jsonc has no env.${opts.env} block`);
    return 1;
  }

  const dotEnv = existsSync(envFilePath)
    ? parseEnv(readFileSync(envFilePath, "utf8"))
    : ({} as Record<string, string>);

  let account: { id: string; source: string };
  try {
    account = resolveAccountId({
      cli: opts.accountId,
      processEnv: processEnv.CLOUDFLARE_ACCOUNT_ID,
      dotEnvFile: dotEnv.CLOUDFLARE_ACCOUNT_ID,
      envAccountId: envCfg.account_id,
      configAccountId: rootConfig.account_id
    });
  } catch (e) {
    out(`cf:setup: ${e instanceof Error ? e.message : e}`);
    return 1;
  }
  if (REQUIRED_ACCOUNT_ID && account.id !== REQUIRED_ACCOUNT_ID) {
    out(
      `cf:setup: resolved account ${account.id} does not match the required account ` +
        `${REQUIRED_ACCOUNT_ID} — shared bindings live there; refusing`
    );
    return 1;
  }
  for (const [pinned, where] of [
    [envCfg.account_id, `env.${opts.env}`],
    [rootConfig.account_id, "wrangler.jsonc"]
  ] as const) {
    if (pinned && !PLACEHOLDER_ID.test(pinned) && pinned !== account.id) {
      out(
        `cf:setup: ${where} pins account_id ${pinned} but the resolved ` +
          `account is ${account.id} — refusing to rehome resources automatically`
      );
      return 1;
    }
  }

  let plan: Plan;
  try {
    plan = buildPlan(envCfg, opts.env, rootConfig);
  } catch (e) {
    out(`cf:setup: ${e instanceof Error ? e.message : e}`);
    return 1;
  }
  out(
    `cf:setup plan — account ${account.id} (${account.source}), env=${opts.env}, worker=${plan.workerName}`
  );
  for (const d of plan.d1) {
    out(
      `  d1 ${d.binding} → "${d.name}" ${d.configuredId && !PLACEHOLDER_ID.test(d.configuredId) ? `(configured ${d.configuredId} — verify/reuse)` : "(create)"}`
    );
  }
  for (const k of plan.kv) {
    out(
      `  kv ${k.binding} → "${k.title}" ${k.configuredId && !PLACEHOLDER_ID.test(k.configuredId) ? `(configured ${k.configuredId} — verify/reuse)` : "(create)"}`
    );
  }
  for (const b of plan.r2) out(`  r2 → "${b}" (create)`);
  for (const q of plan.queues) out(`  queue → "${q}" (create)`);
  out("  external bindings, send_email, DNS, Worker deploy and migrations are never touched");

  if (!opts.apply) {
    out(
      `\nDry run only — re-run with --apply to provision. Remote changes are explicit; nothing was sent.`
    );
    return 0;
  }

  if (opts.confirmAccount !== undefined) {
    if (opts.confirmAccount !== account.id) {
      out(`cf:setup: --confirm-account does not match the resolved account ${account.id}`);
      return 1;
    }
  } else if (deps.prompt) {
    const answer = (await deps.prompt(`Type the account ID to confirm (${account.id}): `)).trim();
    if (answer !== account.id) {
      out("cf:setup: confirmation did not match — nothing was provisioned");
      return 1;
    }
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (await rl.question(`Type the account ID to confirm (${account.id}): `)).trim();
      if (answer !== account.id) {
        out("cf:setup: confirmation did not match — nothing was provisioned");
        return 1;
      }
    } finally {
      rl.close();
    }
  }

  const token = processEnv.CLOUDFLARE_API_TOKEN ?? dotEnv.CLOUDFLARE_API_TOKEN;
  if (token) secretsToRedact.push(token);
  const spawnEnv: NodeJS.ProcessEnv = {
    ...processEnv,
    CLOUDFLARE_ACCOUNT_ID: account.id,
    CLOUDFLARE_ENV: undefined,
    ...(token ? { CLOUDFLARE_API_TOKEN: token } : {})
  };
  delete spawnEnv.CLOUDFLARE_ENV;

  const spawn: SpawnFn = deps.spawn ?? ((argv, env) => realSpawn(argv, env));
  const wrap = (argv: string[]) => {
    const r = spawn(argv, spawnEnv);
    if (r.status !== 0) {
      throw new Error(
        `wrangler ${argv.slice(0, 2).join(" ")} failed (exit ${r.status}): ${redact((r.stderr || r.stdout).trim(), secretsToRedact)}`
      );
    }
    return r;
  };
  const wrapAllowExists = (argv: string[]) => {
    const r = spawn(argv, spawnEnv);
    if (r.status !== 0 && !ALREADY_EXISTS_RE.test(r.stderr + r.stdout)) {
      throw new Error(
        `wrangler ${argv.slice(0, 2).join(" ")} failed (exit ${r.status}): ${redact((r.stderr || r.stdout).trim(), secretsToRedact)}`
      );
    }
    return r;
  };

  const tmp = mkdtempSync(join(tmpdir(), "cf-setup-"));
  const tmpConfig = join(tmp, "wrangler.jsonc");
  writeFileSync(
    tmpConfig,
    JSON.stringify({ name: plan.workerName, account_id: account.id }, null, 2)
  );
  const createdNames: string[] = [];

  try {
    const d1ListRaw = JSON.parse(wrap(["d1", "list", "--json", "--config", tmpConfig]).stdout);
    if (!Array.isArray(d1ListRaw)) {
      throw new Error("wrangler d1 list returned a non-array response — stopping");
    }
    const d1List = d1ListRaw as { uuid?: string; id?: string; name: string }[];
    for (const d of d1List) {
      if (!d || typeof d.name !== "string") {
        throw new Error("wrangler d1 list returned an entry without a name — stopping");
      }
    }
    const kvListRaw = JSON.parse(wrap(["kv", "namespace", "list", "--config", tmpConfig]).stdout);
    if (!Array.isArray(kvListRaw)) {
      throw new Error("wrangler kv namespace list returned a non-array response — stopping");
    }
    const kvList = kvListRaw as { id: string; title: string }[];
    for (const k of kvList) {
      if (!k || typeof k.title !== "string" || !KV_ID_RE.test(k.id ?? "")) {
        throw new Error(
          `wrangler kv namespace list returned an entry with a missing/malformed id — stopping`
        );
      }
    }

    const byD1Id = (id: string) => d1List.find((d) => (d.uuid ?? d.id) === id);
    const resolvedD1 = new Map<number, string>();
    const resolvedKv = new Map<number, string>();
    for (const d of plan.d1) {
      if (d.configuredId && !PLACEHOLDER_ID.test(d.configuredId)) {
        const remote = byD1Id(d.configuredId);
        if (!remote) {
          throw new Error(
            `env.${opts.env} d1 "${d.binding}" is configured with id ${d.configuredId} but no database with that id exists on account ${account.id} — refusing to adopt a different database`
          );
        }
        if (remote.name !== d.name) {
          throw new Error(
            `env.${opts.env} d1 "${d.binding}" id ${d.configuredId} resolves to remote name "${remote.name}", expected "${d.name}" — refusing to adopt a different database`
          );
        }
        resolvedD1.set(d.index, d.configuredId);
      } else {
        const matches = d1List.filter((x) => x.name === d.name);
        if (matches.length > 1) {
          throw new Error(`multiple remote D1 databases named "${d.name}" — resolve manually`);
        }
        if (matches.length === 1) {
          const id = matches[0].uuid ?? matches[0].id;
          if (!id || !D1_ID_RE.test(id)) {
            throw new Error(`d1 list returned a malformed id for "${d.name}" — stopping`);
          }
          resolvedD1.set(d.index, id);
        }
      }
    }
    for (const k of plan.kv) {
      if (k.configuredId && !PLACEHOLDER_ID.test(k.configuredId)) {
        const remote = kvList.find((x) => x.id === k.configuredId);
        if (!remote) {
          throw new Error(
            `env.${opts.env} kv "${k.binding}" is configured with id ${k.configuredId} but no namespace with that id exists on account ${account.id} — refusing`
          );
        }
        resolvedKv.set(k.index, k.configuredId);
      } else {
        const matches = kvList.filter((x) => x.title === k.title);
        if (matches.length > 1) {
          throw new Error(`multiple remote KV namespaces titled "${k.title}" — resolve manually`);
        }
        if (matches.length === 1) {
          resolvedKv.set(k.index, matches[0].id);
        }
      }
    }

    for (const d of plan.d1) {
      if (resolvedD1.has(d.index)) continue;
      wrap(["d1", "create", d.name, "--update-config=false", "--config", tmpConfig]);
      const after = JSON.parse(
        wrap(["d1", "list", "--json", "--config", tmpConfig]).stdout
      ) as { uuid?: string; id?: string; name: string }[];
      const created = after.filter((x) => x.name === d.name);
      const id = created.length === 1 ? (created[0].uuid ?? created[0].id) : undefined;
      if (!id || !D1_ID_RE.test(id)) {
        throw new Error(`could not resolve a unique uuid for created D1 "${d.name}" — stopping`);
      }
      resolvedD1.set(d.index, id);
      createdNames.push(`d1 "${d.name}"`);
      out(`  created D1 "${d.name}"`);
    }
    for (const k of plan.kv) {
      if (resolvedKv.has(k.index)) continue;
      wrap([
        "kv",
        "namespace",
        "create",
        k.title,
        "--update-config=false",
        "--config",
        tmpConfig
      ]);
      const after = JSON.parse(
        wrap(["kv", "namespace", "list", "--config", tmpConfig]).stdout
      ) as { id: string; title: string }[];
      const created = after.filter((x) => x.title === k.title);
      if (created.length !== 1 || !KV_ID_RE.test(created[0].id)) {
        throw new Error(`could not resolve a unique id for created KV "${k.title}" — stopping`);
      }
      resolvedKv.set(k.index, created[0].id);
      createdNames.push(`kv "${k.title}"`);
      out(`  created KV "${k.title}"`);
    }
    for (const b of plan.r2) {
      wrapAllowExists([
        "r2",
        "bucket",
        "create",
        b,
        "--update-config=false",
        "--config",
        tmpConfig
      ]);
      out(`  r2 "${b}" ready`);
    }
    for (const q of plan.queues) {
      wrapAllowExists(["queues", "create", q, "--config", tmpConfig]);
      out(`  queue "${q}" ready`);
    }

    const latestText = readFileSync(configPath, "utf8");
    if (latestText !== configText) {
      throw new Error(
        "wrangler.jsonc changed on disk while provisioning ran — refusing to overwrite your edits; re-run cf:setup"
      );
    }
    const d1Updates = plan.d1
      .filter((d) => resolvedD1.has(d.index))
      .map((d) => ({ index: d.index, id: resolvedD1.get(d.index)!, name: d.name }));
    const kvUpdates = plan.kv
      .filter((k) => resolvedKv.has(k.index))
      .map((k) => ({ index: k.index, id: resolvedKv.get(k.index)!, binding: k.binding, title: k.title }));

    const edits: { path: (string | number)[]; value: unknown }[] = [];
    if (!rootConfig.account_id || PLACEHOLDER_ID.test(rootConfig.account_id)) {
      edits.push({ path: ["account_id"], value: account.id });
    }
    const patchD1 = (cfg: EnvConfig | undefined, envPath: (string | number)[]) => {
      for (const upd of d1Updates) {
        const idx = (cfg?.d1_databases ?? []).findIndex(
          (d) => OWNED_D1_BINDINGS.includes(d.binding) && d.database_name === upd.name
        );
        if (idx >= 0) {
          edits.push({ path: [...envPath, "d1_databases", idx, "database_id"], value: upd.id });
        }
      }
    };
    const patchKv = (
      cfg: EnvConfig | undefined,
      envPath: (string | number)[],
      byTitle: { binding: string; id: string }[]
    ) => {
      for (const upd of byTitle) {
        const idx = (cfg?.kv_namespaces ?? []).findIndex((n) => n.binding === upd.binding);
        if (idx >= 0) {
          const existing = cfg!.kv_namespaces![idx].id;
          if (existing && !PLACEHOLDER_ID.test(existing) && existing !== upd.id) continue;
          edits.push({ path: [...envPath, "kv_namespaces", idx, "id"], value: upd.id });
        }
      }
    };
    patchD1(envCfg, ["env", opts.env]);
    patchKv(envCfg, ["env", opts.env], kvUpdates);
    if (opts.env === "dev") {
      patchD1(rootConfig as EnvConfig, []);
      patchKv(rootConfig as EnvConfig, [], kvUpdates);
      patchD1(rootConfig.env?.local as EnvConfig | undefined, ["env", "local"]);
      patchKv(rootConfig.env?.local as EnvConfig | undefined, ["env", "local"], kvUpdates);
    }
    let text = configText;
    for (const e of edits) {
      text = applyEdits(text, modify(text, e.path, e.value, {}));
    }
    const verifyErrors: ParseError[] = [];
    parseJsonc(text, verifyErrors);
    if (verifyErrors.length > 0) {
      throw new Error("generated wrangler.jsonc patch did not parse — config left untouched");
    }
    writeFileSync(configPath, text);

    out(`\ncf:setup: env.${opts.env} provisioned; wrangler.jsonc updated`);
    out(
      "next: set worker secrets in .dev.vars / .dev.vars.prod and `wrangler secret put` for deploys; run `pnpm db` / `pnpm db:prod` migrations when ready; deploy via pnpm deploy/deploy:prod"
    );
    return 0;
  } catch (e) {
    out(`cf:setup: FAILED — ${redact(e instanceof Error ? e.message : String(e), secretsToRedact)}`);
    if (createdNames.length > 0) {
      out(`created so far: ${createdNames.join(", ")}`);
    }
    out(
      "Nothing was rolled back; wrangler.jsonc was left untouched — re-run to reuse created resources."
    );
    return 1;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main({ argv: process.argv.slice(2) }).then((code) => process.exit(code));
}
