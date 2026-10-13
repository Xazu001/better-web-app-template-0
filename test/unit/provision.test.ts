import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildPlan, main, parseArgs, resolveAccountId } from "../../scripts/provision";

const ACCOUNT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const baseConfig = (over: Record<string, unknown> = {}) => ({
  name: "template",
  account_id: ACCOUNT,
  env: {
    dev: {
      name: "template-dev",
      d1_databases: [
        {
          binding: "db",
          database_name: "template-db-dev",
          database_id: "00000000-0000-0000-0000-000000000000"
        }
      ],
      kv_namespaces: [{ binding: "kv", id: "00000000000000000000000000000000" }],
      r2_buckets: [{ binding: "r2", bucket_name: "template-r2-dev" }],
      queues: {
        producers: [{ binding: "QUEUE", queue: "template-queue-dev" }],
        consumers: [{ queue: "template-queue-dev", dead_letter_queue: "template-queue-dev-dlq" }]
      }
    },
    ...over
  }
});

const withoutToken = () => {
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  return env;
};

const withTmpConfig = (config: object, envContent = "") => {
  const dir = mkdtempSync(join(tmpdir(), "prov-test-"));
  writeFileSync(join(dir, "wrangler.jsonc"), JSON.stringify(config, null, 2));
  if (envContent) writeFileSync(join(dir, ".env"), envContent);
  return dir;
};

const spawnLog = () => {
  const calls: { argv: string[]; env: NodeJS.ProcessEnv }[] = [];
  const dbs: { uuid: string; name: string }[] = [];
  const kvs: { id: string; title: string }[] = [];
  const spawn = (argv: string[], env: NodeJS.ProcessEnv) => {
    calls.push({ argv, env });
    const key = argv.slice(0, 2).join(" ");
    if (key === "d1 list") {
      return { status: 0, stdout: JSON.stringify(dbs), stderr: "" };
    }
    if (key === "kv namespace" && argv[2] === "list") {
      return { status: 0, stdout: JSON.stringify(kvs), stderr: "" };
    }
    if (key === "d1 create") {
      dbs.push({ uuid: "11111111-2222-3333-4444-555555555555", name: argv[2] });
      return { status: 0, stdout: `created ${argv[2]}`, stderr: "" };
    }
    if (key === "kv namespace") {
      kvs.push({ id: "cccccccccccccccccccccccccccccccc", title: argv[3] });
      return { status: 0, stdout: `created ${argv[3]}`, stderr: "" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };
  return { calls, spawn };
};

const silent = { out: () => {} };

describe("cf:setup parseArgs", () => {
  it("defaults to dev plan mode", () => {
    expect(parseArgs([])).toEqual({ env: "dev", apply: false });
    expect(parseArgs(["--env", "prod"])).toMatchObject({ env: "prod" });
  });
  it("rejects local and unknown args", () => {
    expect(() => parseArgs(["--env", "local"])).toThrow(/local is never provisioned/);
    expect(() => parseArgs(["--bogus"])).toThrow(/unknown argument/);
  });
});

describe("cf:setup resolveAccountId", () => {
  it("prefers CLI > env > .env > config", () => {
    expect(resolveAccountId({ cli: OTHER, processEnv: ACCOUNT }).id).toBe(OTHER);
    expect(resolveAccountId({ processEnv: ACCOUNT }).id).toBe(ACCOUNT);
    expect(resolveAccountId({ dotEnvFile: ACCOUNT }).id).toBe(ACCOUNT);
    expect(resolveAccountId({ configAccountId: ACCOUNT }).id).toBe(ACCOUNT);
    expect(() => resolveAccountId({})).toThrow(/no valid Cloudflare account ID/);
    expect(() =>
      resolveAccountId({ configAccountId: "00000000000000000000000000000000" })
    ).toThrow();
  });
});

describe("cf:setup buildPlan", () => {
  it("derives owned resources only, dedupes queues and skips local", () => {
    const config = baseConfig();
    const plan = buildPlan(config.env.dev as never, "dev", config);
    expect(plan.workerName).toBe("template-dev");
    expect(plan.d1).toHaveLength(1);
    expect(plan.kv[0].title).toBe("template-dev-kv");
    expect(plan.r2).toEqual(["template-r2-dev"]);
    expect(plan.queues.sort()).toEqual(["template-queue-dev", "template-queue-dev-dlq"]);
  });
});

describe("cf:setup arg/account strictness", () => {
  it("accepts a standalone -- separator (pnpm forwarding)", () => {
    expect(parseArgs(["--", "--env", "prod"])).toMatchObject({ env: "prod" });
  });
  it("rejects flags with missing values", () => {
    expect(() => parseArgs(["--env"])).toThrow(/requires a value/);
    expect(() => parseArgs(["--account-id"])).toThrow(/requires a value/);
    expect(() => parseArgs(["--confirm-account", "--apply"])).toThrow(/requires a value/);
    expect(() => parseArgs(["--env", "dev", "--env", "prod"])).toThrow(/conflicting/);
  });
  it("rejects an invalid CLI account even when .env/config are valid", () => {
    expect(() =>
      resolveAccountId({ cli: "not-an-id", processEnv: ACCOUNT, configAccountId: ACCOUNT })
    ).toThrow(/invalid Cloudflare account ID/);
  });
  it("rejects invalid env/.env values instead of falling back", () => {
    expect(() =>
      resolveAccountId({ processEnv: "zzz", dotEnvFile: ACCOUNT, configAccountId: ACCOUNT })
    ).toThrow(/invalid Cloudflare account ID/);
    expect(() =>
      resolveAccountId({ dotEnvFile: "xyz", configAccountId: ACCOUNT })
    ).toThrow(/invalid Cloudflare account ID/);
  });
  it("rejects all-zero account ids from every source", () => {
    expect(() => resolveAccountId({ cli: "00000000000000000000000000000000" })).toThrow();
  });
  it("empty optional values fall through to the next source", () => {
    expect(
      resolveAccountId({ processEnv: "", dotEnvFile: "", configAccountId: ACCOUNT }).id
    ).toBe(ACCOUNT);
  });
  it("honors env-level account_id ahead of root", () => {
    expect(
      resolveAccountId({ envAccountId: OTHER, configAccountId: ACCOUNT }).id
    ).toBe(OTHER);
  });
});

describe("cf:setup main", () => {
  it("plan mode performs zero spawns and zero writes", async () => {
    const dir = withTmpConfig(baseConfig());
    const before = readFileSync(join(dir, "wrangler.jsonc"), "utf8");
    const { calls, spawn } = spawnLog();
    const code = await main({ argv: [], spawn, prompt: async () => ACCOUNT, cwd: dir, ...silent });
    expect(code).toBe(0);
    expect(calls).toHaveLength(0);
    expect(readFileSync(join(dir, "wrangler.jsonc"), "utf8")).toBe(before);
  });

  it("rejects --apply when confirmation does not match", async () => {
    const dir = withTmpConfig(baseConfig());
    const { calls, spawn } = spawnLog();
    const code = await main({
      argv: ["--apply", "--confirm-account", OTHER],
      spawn,
      prompt: async () => OTHER,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it("fails before spawning when config account_id mismatches", async () => {
    const dir = withTmpConfig(baseConfig());
    const { calls, spawn } = spawnLog();
    const code = await main({
      argv: ["--apply", "--account-id", OTHER, "--confirm-account", OTHER],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it("rejects an empty --account-id and makes zero remote calls or edits", async () => {
    expect(() => parseArgs(["--account-id", ""])).toThrow(/requires a value/);
    const dir = withTmpConfig(baseConfig());
    const before = readFileSync(join(dir, "wrangler.jsonc"), "utf8");
    const { calls, spawn } = spawnLog();
    const code = await main({
      argv: ["--apply", "--account-id", "not-an-id", "--confirm-account", "not-an-id"],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
    expect(readFileSync(join(dir, "wrangler.jsonc"), "utf8")).toBe(before);
  });

  it("provisions missing resources, pins the account on every command and writes only the selected env", async () => {
    const dir = withTmpConfig(baseConfig());
    const { calls, spawn } = spawnLog();
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(0);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.env.CLOUDFLARE_ACCOUNT_ID).toBe(ACCOUNT);
    }
    const written = JSON.parse(readFileSync(join(dir, "wrangler.jsonc"), "utf8"));
    expect(written.env.dev.d1_databases[0].database_id).toBe(
      "11111111-2222-3333-4444-555555555555"
    );
    expect(written.env.dev.kv_namespaces[0].id).toBe("cccccccccccccccccccccccccccccccc");
    expect(written.account_id).toBe(ACCOUNT);
    const commandArrays = calls.map((c) => c.argv.slice(0, 2).join(" "));
    expect(commandArrays).toContain("d1 list");
    expect(commandArrays).toContain("d1 create");
    expect(commandArrays).toContain("kv namespace");
    expect(commandArrays).toContain("r2 bucket");
    expect(commandArrays).toContain("queues create");
  });

  it("prod apply never touches dev/local entries", async () => {
    const dir = withTmpConfig(
      baseConfig({
        prod: {
          name: "template",
          d1_databases: [
            {
              binding: "db",
              database_name: "template-db",
              database_id: "99999999-8888-7777-6666-555555555555"
            }
          ]
        }
      })
    );
    const { calls } = { calls: [] as { argv: string[]; env: NodeJS.ProcessEnv }[] };
    const spawn = (argv: string[], env: NodeJS.ProcessEnv) => {
      calls.push({ argv, env });
      if (argv.slice(0, 2).join(" ") === "d1 list") {
        return {
          status: 0,
          stdout: JSON.stringify([
            { uuid: "99999999-8888-7777-6666-555555555555", name: "template-db" }
          ]),
          stderr: ""
        };
      }
      if (argv.slice(0, 3).join(" ") === "kv namespace list") {
        return { status: 0, stdout: "[]", stderr: "" };
      }
      return { status: 0, stdout: "", stderr: "" };
    };
    const code = await main({
      argv: ["--env", "prod", "--apply", "--confirm-account", ACCOUNT],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(join(dir, "wrangler.jsonc"), "utf8"));
    expect(written.env.dev.d1_databases[0].database_id).toBe(
      "00000000-0000-0000-0000-000000000000"
    );
    expect(written.env.dev.kv_namespaces[0].id).toBe("00000000000000000000000000000000");
  });

  it("emits exact command argv with the pinned account env on every call", async () => {
    const dir = withTmpConfig(baseConfig());
    const { calls, spawn } = spawnLog();
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(0);
    const normalize = (argv: string[]) => argv.map((a) => (a.includes("cf-setup-") ? "<TMP>" : a));
    const argvs = calls.map((c) => normalize(c.argv));
    expect(argvs[0]).toEqual(["d1", "list", "--json", "--config", "<TMP>"]);
    expect(argvs[1]).toEqual(["kv", "namespace", "list", "--config", "<TMP>"]);
    expect(argvs).toContainEqual([
      "d1",
      "create",
      "template-db-dev",
      "--update-config=false",
      "--config",
      "<TMP>"
    ]);
    expect(argvs).toContainEqual([
      "kv",
      "namespace",
      "create",
      "template-dev-kv",
      "--update-config=false",
      "--config",
      "<TMP>"
    ]);
    expect(argvs).toContainEqual([
      "r2",
      "bucket",
      "create",
      "template-r2-dev",
      "--update-config=false",
      "--config",
      "<TMP>"
    ]);
    expect(argvs).toContainEqual(["queues", "create", "template-queue-dev", "--config", "<TMP>"]);
    expect(argvs).toContainEqual([
      "queues",
      "create",
      "template-queue-dev-dlq",
      "--config",
      "<TMP>"
    ]);
    for (const c of calls) {
      expect(c.env.CLOUDFLARE_ACCOUNT_ID).toBe(ACCOUNT);
      expect(c.env.CLOUDFLARE_ENV).toBeUndefined();
    }
  });

  it("reuses existing remote names on rerun — no create calls", async () => {
    const dir = withTmpConfig(baseConfig());
    const seeded = {
      dbs: [{ uuid: "11111111-2222-3333-4444-555555555555", name: "template-db-dev" }],
      kvs: [{ id: "cccccccccccccccccccccccccccccccc", title: "template-dev-kv" }]
    };
    const calls: string[][] = [];
    const spawn = (argv: string[]) => {
      calls.push(argv);
      if (argv.slice(0, 2).join(" ") === "d1 list")
        return { status: 0, stdout: JSON.stringify(seeded.dbs), stderr: "" };
      if (argv.slice(0, 3).join(" ") === "kv namespace list")
        return { status: 0, stdout: JSON.stringify(seeded.kvs), stderr: "" };
      if (argv.slice(0, 3).join(" ") === "r2 bucket create")
        return { status: 1, stdout: "", stderr: "bucket already exists" };
      if (argv.slice(0, 2).join(" ") === "queues create")
        return { status: 1, stdout: "", stderr: "queue already exists" };
      return { status: 0, stdout: "", stderr: "" };
    };
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(0);
    expect(calls.some((a) => a[0] === "d1" && a[1] === "create")).toBe(false);
    expect(
      calls.some((a) => a[0] === "kv" && a[1] === "namespace" && a[2] === "create")
    ).toBe(false);
    const written = JSON.parse(readFileSync(join(dir, "wrangler.jsonc"), "utf8"));
    expect(written.env.dev.d1_databases[0].database_id).toBe(
      "11111111-2222-3333-4444-555555555555"
    );
  });

  it("aborts on auth failure — nothing created, config untouched", async () => {
    const dir = withTmpConfig(baseConfig());
    const before = readFileSync(join(dir, "wrangler.jsonc"), "utf8");
    const spawn = () => ({
      status: 1,
      stdout: "",
      stderr: "Authentication error [code: 9109]"
    });
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(1);
    expect(readFileSync(join(dir, "wrangler.jsonc"), "utf8")).toBe(before);
  });

  it("does not treat a permission error on r2 create as reuse", async () => {
    const dir = withTmpConfig(baseConfig());
    const { spawn } = spawnLog();
    const wrapped: typeof spawn = (argv, env) => {
      if (argv.slice(0, 3).join(" ") === "r2 bucket create") {
        return { status: 1, stdout: "", stderr: "forbidden: insufficient permissions" };
      }
      return spawn(argv, env!);
    };
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn: wrapped,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(1);
    expect(JSON.parse(readFileSync(join(dir, "wrangler.jsonc"), "utf8")).env.dev.d1_databases[0]
      .database_id).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("validates all configured ids before any create runs", async () => {
    const config = baseConfig();
    config.env.dev.kv_namespaces = [
      { binding: "kv", id: "dddddddddddddddddddddddddddddddd" }
    ];
    const dir = withTmpConfig(config);
    const calls: string[] = [];
    const spawn = (argv: string[]) => {
      calls.push(argv.join(" "));
      if (argv.slice(0, 2).join(" ") === "d1 list")
        return { status: 0, stdout: "[]", stderr: "" };
      if (argv.slice(0, 3).join(" ") === "kv namespace list")
        return { status: 0, stdout: "[]", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    };
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(1);
    expect(calls.some((c) => c.includes("create"))).toBe(false);
  });

  it("fails on malformed provider list shapes and duplicate remote names", async () => {
    const dir = withTmpConfig(baseConfig());
    const spawnBadShape = (argv: string[]) =>
      argv.slice(0, 2).join(" ") === "d1 list"
        ? { status: 0, stdout: "{}", stderr: "" }
        : { status: 0, stdout: "[]", stderr: "" };
    expect(
      await main({
        argv: ["--apply", "--confirm-account", ACCOUNT],
        spawn: spawnBadShape,
        cwd: dir,
        ...silent
      })
    ).toBe(1);

    const dir2 = withTmpConfig(baseConfig());
    const spawnDup = (argv: string[]) =>
      argv.slice(0, 2).join(" ") === "d1 list"
        ? {
            status: 0,
            stdout: JSON.stringify([
              { uuid: "11111111-2222-3333-4444-555555555555", name: "template-db-dev" },
              { uuid: "22222222-2222-3333-4444-555555555555", name: "template-db-dev" }
            ]),
            stderr: ""
          }
        : { status: 0, stdout: "[]", stderr: "" };
    expect(
      await main({
        argv: ["--apply", "--confirm-account", ACCOUNT],
        spawn: spawnDup,
        cwd: dir2,
        ...silent
      })
    ).toBe(1);

    const dir3 = withTmpConfig(baseConfig());
    const spawnBadId = (argv: string[]) =>
      argv.slice(0, 2).join(" ") === "d1 list"
        ? {
            status: 0,
            stdout: JSON.stringify([{ uuid: "not-hex", name: "template-db-dev" }]),
            stderr: ""
          }
        : { status: 0, stdout: "[]", stderr: "" };
    expect(
      await main({
        argv: ["--apply", "--confirm-account", ACCOUNT],
        spawn: spawnBadId,
        cwd: dir3,
        ...silent
      })
    ).toBe(1);
  });

  it("loads CLOUDFLARE_API_TOKEN from .env only when process lacks it; never in argv/output/config", async () => {
    const dir = withTmpConfig(baseConfig(), "CLOUDFLARE_API_TOKEN=synthetic-dotenv-token\n");
    const seen: { argv: string[]; env: NodeJS.ProcessEnv }[] = [];
    const msgs: string[] = [];
    const spawn = (argv: string[], env: NodeJS.ProcessEnv) => {
      seen.push({ argv, env });
      return { status: 1, stdout: "", stderr: "auth failed synthetic-dotenv-token" };
    };
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn,
      processEnv: withoutToken(),
      cwd: dir,
      out: (m) => msgs.push(m)
    });
    expect(code).toBe(1);
    expect(seen[0].env.CLOUDFLARE_API_TOKEN).toBe("synthetic-dotenv-token");
    expect(seen[0].argv.join(" ")).not.toContain("synthetic-dotenv-token");
    expect(msgs.join("\n")).toContain("[REDACTED]");
    expect(msgs.join("\n")).not.toContain("synthetic-dotenv-token");
    expect(readFileSync(join(dir, "wrangler.jsonc"), "utf8")).not.toContain(
      "synthetic-dotenv-token"
    );
  });

  it("process env token wins over .env", async () => {
    const dir = withTmpConfig(baseConfig(), "CLOUDFLARE_API_TOKEN=synthetic-dotenv-token\n");
    const seen: NodeJS.ProcessEnv[] = [];
    const spawn = (_argv: string[], env: NodeJS.ProcessEnv) => {
      seen.push(env);
      return { status: 1, stdout: "", stderr: "denied" };
    };
    await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn,
      processEnv: { ...process.env, CLOUDFLARE_API_TOKEN: "synthetic-process-token" },
      cwd: dir,
      ...silent
    });
    expect(seen[0].CLOUDFLARE_API_TOKEN).toBe("synthetic-process-token");
  });

  it("refuses to overwrite wrangler.jsonc if it changed during provisioning", async () => {
    const dir = withTmpConfig(baseConfig());
    const path = join(dir, "wrangler.jsonc");
    const original = readFileSync(path, "utf8");
    let edited = false;
    const { calls, spawn } = spawnLog();
    const wrapped: typeof spawn = (argv, env) => {
      if (!edited && argv.slice(0, 3).join(" ") === "kv namespace list") {
        writeFileSync(path, original + "\n// operator edit\n");
        edited = true;
      }
      return spawn(argv, env!);
    };
    const code = await main({
      argv: ["--apply", "--confirm-account", ACCOUNT],
      spawn: wrapped,
      cwd: dir,
      ...silent
    });
    expect(code).toBe(1);
    expect(readFileSync(path, "utf8")).toBe(original + "\n// operator edit\n");
    expect(calls.length).toBeGreaterThan(0);
  });

  it("fails on a malformed wrangler.jsonc without touching anything", async () => {
    const dir = mkdtempSync(join(tmpdir(), "prov-test-"));
    writeFileSync(join(dir, "wrangler.jsonc"), "{ name: 'oops',, }");
    const { calls, spawn } = spawnLog();
    const code = await main({ argv: ["--apply"], spawn, cwd: dir, ...silent });
    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
  });
});
