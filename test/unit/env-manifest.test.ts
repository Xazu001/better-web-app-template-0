import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { initEnvFiles } from "../../scripts/env-init";
import { devVarsFile, resolveSecretsRequired } from "../../scripts/lib/dev-vars";
import {
  ENV_VARS,
  fillEnvFile,
  renderEnvFile,
  type EnvFileKind
} from "../../scripts/lib/env-manifest";

const exampleFiles: [EnvFileKind, string][] = [
  ["dev-vars", ".dev.vars.example"],
  ["env", ".env.example"]
];
const wranglerPath = existsSync("wrangler.example.jsonc")
  ? "wrangler.example.jsonc"
  : "wrangler.jsonc";

describe("environment manifest", () => {
  it.each(exampleFiles)("%s example matches the manifest", (kind, file) => {
    expect(readFileSync(file, "utf8")).toBe(renderEnvFile(kind));
  });

  it("matches every tracked Wrangler secrets.required section", () => {
    const config = parseJsonc(readFileSync(wranglerPath, "utf8")) as {
      secrets?: { required?: string[] };
      env?: Record<string, { secrets?: { required?: string[] } }>;
    };
    const sections = [["default", config], ...Object.entries(config.env ?? {})] as const;

    for (const [sectionName, section] of sections) {
      const actual = [...(section.secrets?.required ?? [])].sort();
      const expected = ENV_VARS.filter(
        (spec) => spec.file === "dev-vars" && spec.secretIn?.includes(sectionName)
      )
        .map((spec) => spec.name)
        .sort();
      expect(actual, sectionName).toEqual(expected);
    }
  });

  it("renders new files, preserves existing content, fills values and appends missing variables", () => {
    const generated = {
      JWT_PRIVATE_KEY: "generated-private",
      JWT_PUBLIC_KEY: "generated-public",
      PRIV_API_KEY: "generated-hex"
    };
    const fresh = fillEnvFile(null, "dev-vars", generated);
    expect(fresh.content).toBe(renderEnvFile("dev-vars", generated));
    expect(fresh.added).toEqual(
      ENV_VARS.filter((spec) => spec.file === "dev-vars").map((spec) => spec.name)
    );
    expect(fresh.filled).toEqual([]);

    const existing = [
      "# Keep this note",
      "UNKNOWN_VALUE=preserve",
      "JWT_PRIVATE_KEY=existing-private",
      "JWT_PUBLIC_KEY=",
      ""
    ].join("\n");
    const updated = fillEnvFile(existing, "dev-vars", generated);
    expect(updated.content).toContain("# Keep this note\nUNKNOWN_VALUE=preserve");
    expect(updated.content).toContain("JWT_PRIVATE_KEY=existing-private");
    expect(updated.content).toContain("JWT_PUBLIC_KEY=generated-public");
    expect(updated.content).toContain("# X-API-Key for private /api/priv endpoints.");
    expect(updated.content).toContain("PRIV_API_KEY=generated-hex");
    expect(updated.added).toEqual(["PRIV_API_KEY"]);
    expect(updated.filled).toEqual(["JWT_PUBLIC_KEY"]);
    expect(fillEnvFile(updated.content, "dev-vars", {}).content).toBe(updated.content);
  });

  it("fills quoted-empty values and never rotates non-empty keys", () => {
    const generated = {
      JWT_PRIVATE_KEY: "generated-private",
      JWT_PUBLIC_KEY: "generated-public",
      PRIV_API_KEY: "generated-hex"
    };
    const existing = ['JWT_PRIVATE_KEY=""', "JWT_PUBLIC_KEY=''", "PRIV_API_KEY=keep-me"].join("\n");
    const updated = fillEnvFile(existing, "dev-vars", generated);
    expect(updated.content).toContain("JWT_PRIVATE_KEY=generated-private");
    expect(updated.content).toContain("JWT_PUBLIC_KEY=generated-public");
    expect(updated.content).toContain("PRIV_API_KEY=keep-me");
    expect(updated.filled).toEqual(["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY"]);
    expect(updated.added).toEqual([]);
    expect(fillEnvFile(updated.content, "dev-vars", generated).content).toBe(updated.content);
  });

  it("fills dotenv spellings with leading spaces, export and spaces around =", () => {
    const generated = {
      JWT_PRIVATE_KEY: "generated-private",
      JWT_PUBLIC_KEY: "generated-public",
      PRIV_API_KEY: "generated-hex"
    };
    const existing = [
      '  JWT_PRIVATE_KEY = ""',
      "export JWT_PUBLIC_KEY = ''",
      "export PRIV_API_KEY = keep-me"
    ].join("\n");
    const updated = fillEnvFile(existing, "dev-vars", generated);
    expect(parseEnv(updated.content).JWT_PRIVATE_KEY).toBe("generated-private");
    expect(parseEnv(updated.content).JWT_PUBLIC_KEY).toBe("generated-public");
    expect(parseEnv(updated.content).PRIV_API_KEY).toBe("keep-me");
    expect(updated.filled).toEqual(["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY"]);
    expect(updated.added).toEqual([]);
    expect(fillEnvFile(updated.content, "dev-vars", generated).content).toBe(updated.content);
  });

  it("default init creates only .dev.vars + .env, fills config IDs and is idempotent", () => {
    const cwd = mkdtempSync(join(tmpdir(), "env-init-"));
    const accountId = "a".repeat(32);
    const devDatabaseId = "11111111-2222-3333-4444-555555555555";
    const prodDatabaseId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    writeFileSync(
      join(cwd, "wrangler.jsonc"),
      JSON.stringify({
        account_id: accountId,
        env: {
          dev: { d1_databases: [{ binding: "db", database_id: devDatabaseId }] },
          prod: { d1_databases: [{ binding: "db", database_id: prodDatabaseId }] }
        }
      })
    );

    try {
      initEnvFiles({ cwd, log: () => undefined });
      expect(existsSync(join(cwd, ".dev.vars"))).toBe(true);
      expect(existsSync(join(cwd, ".dev.vars.dev"))).toBe(false);
      expect(existsSync(join(cwd, ".dev.vars.prod"))).toBe(false);
      const devVars = parseEnv(readFileSync(join(cwd, ".dev.vars"), "utf8"));
      const dotEnv = parseEnv(readFileSync(join(cwd, ".env"), "utf8"));
      expect(devVars.JWT_PRIVATE_KEY).toBeTruthy();
      expect(devVars.JWT_PUBLIC_KEY).toBeTruthy();
      expect(devVars.PRIV_API_KEY).toMatch(/^[0-9a-f]{64}$/);
      expect(dotEnv.CLOUDFLARE_ACCOUNT_ID).toBe(accountId);
      expect(dotEnv.CLOUDFLARE_DB_ID).toBe(devDatabaseId);
      expect(dotEnv.CLOUDFLARE_DB_PROD_ID).toBe(prodDatabaseId);

      const before = [".dev.vars", ".env"].map((file) => readFileSync(join(cwd, file), "utf8"));
      initEnvFiles({ cwd, log: () => undefined });
      const after = [".dev.vars", ".env"].map((file) => readFileSync(join(cwd, file), "utf8"));
      expect(after).toEqual(before);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("env:init --env prod rejects before writing anything", () => {
    const cwd = mkdtempSync(join(tmpdir(), "env-init-prod-"));
    writeFileSync(join(cwd, ".dev.vars"), "CUSTOM=keep-me\n");
    try {
      expect(() => initEnvFiles({ cwd, env: "prod", log: () => undefined })).toThrow(
        /wrangler secret put/
      );
      expect(existsSync(join(cwd, ".dev.vars.prod"))).toBe(false);
      expect(readFileSync(join(cwd, ".dev.vars"), "utf8")).toBe("CUSTOM=keep-me\n");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it.each(["dev"] as const)(
    "--env %s initializes a complete independent file pair without touching local keys",
    (env) => {
      const cwd = mkdtempSync(join(tmpdir(), `env-init-${env}-`));
      try {
        initEnvFiles({ cwd, log: () => undefined });
        const localPrivate = parseEnv(readFileSync(join(cwd, ".dev.vars"), "utf8")).JWT_PRIVATE_KEY;

        initEnvFiles({ cwd, env, log: () => undefined });
        const file = `.dev.vars.${env}`;
        const vars = parseEnv(readFileSync(join(cwd, file), "utf8"));
        expect(vars.JWT_PRIVATE_KEY).toBeTruthy();
        expect(vars.JWT_PUBLIC_KEY).toBeTruthy();
        expect(vars.PRIV_API_KEY).toMatch(/^[0-9a-f]{64}$/);
        expect(vars.JWT_PRIVATE_KEY).not.toBe(localPrivate);
        expect(parseEnv(readFileSync(join(cwd, ".dev.vars"), "utf8")).JWT_PRIVATE_KEY).toBe(
          localPrivate
        );

        const beforeContent = readFileSync(join(cwd, file), "utf8");
        initEnvFiles({ cwd, env, log: () => undefined });
        expect(readFileSync(join(cwd, file), "utf8")).toBe(beforeContent);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }
  );

  it("fills a partial existing env file without losing unknown content", () => {
    const cwd = mkdtempSync(join(tmpdir(), "env-init-partial-"));
    writeFileSync(
      join(cwd, ".dev.vars.dev"),
      ["# my note", "CUSTOM_THING=keep", "JWT_PUBLIC_KEY=''", ""].join("\n")
    );
    try {
      initEnvFiles({ cwd, env: "dev", log: () => undefined });
      const text = readFileSync(join(cwd, ".dev.vars.dev"), "utf8");
      expect(text).toContain("# my note");
      expect(text).toContain("CUSTOM_THING=keep");
      const vars = parseEnv(text);
      expect(vars.JWT_PRIVATE_KEY).toBeTruthy();
      expect(vars.JWT_PUBLIC_KEY).toBeTruthy();
      expect(vars.PRIV_API_KEY).toBeTruthy();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects an orphaned JWT key", () => {
    const cwd = mkdtempSync(join(tmpdir(), "env-init-half-pair-"));
    writeFileSync(join(cwd, ".dev.vars"), "JWT_PRIVATE_KEY=orphan\n");

    try {
      expect(() => initEnvFiles({ cwd, log: () => undefined })).toThrow(
        /remove the orphan line and run `pnpm gen:keys \.dev\.vars`/
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("dev-vars helpers", () => {
  it("maps each env to its own secrets file", () => {
    expect(devVarsFile("local")).toBe(".dev.vars");
    expect(devVarsFile("dev")).toBe(".dev.vars.dev");
    expect(() => devVarsFile("prod")).toThrow(/wrangler secret put/);
  });

  const CORE = "JWT_PRIVATE_KEY=a\nJWT_PUBLIC_KEY=b\nPRIV_API_KEY=c\n";

  it("fails before serving when the env file is missing, with the right init hint", () => {
    const cwd = mkdtempSync(join(tmpdir(), "dev-vars-missing-"));
    try {
      expect(() => resolveSecretsRequired({ cwd, env: "local" })).toThrow(/pnpm env:init/);
      expect(() => resolveSecretsRequired({ cwd, env: "dev" })).toThrow(
        /\.dev\.vars\.dev not found — run `pnpm env:init --env dev`/
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("fails clearly when a core key is absent", () => {
    const cwd = mkdtempSync(join(tmpdir(), "dev-vars-core-"));
    writeFileSync(join(cwd, ".dev.vars"), "JWT_PRIVATE_KEY=a\n");
    try {
      expect(() => resolveSecretsRequired({ cwd, env: "local" })).toThrow(
        /missing required local secrets: JWT_PUBLIC_KEY, PRIV_API_KEY/
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("never falls back to .dev.vars for remote dev", () => {
    const cwd = mkdtempSync(join(tmpdir(), "dev-vars-nofallback-"));
    writeFileSync(join(cwd, ".dev.vars"), CORE);
    try {
      expect(() => resolveSecretsRequired({ cwd, env: "dev" })).toThrow(/\.dev\.vars\.dev/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("includes present optional vars once and excludes absent ones", () => {
    const cwd = mkdtempSync(join(tmpdir(), "dev-vars-optional-"));
    const optional = ENV_VARS.filter(
      (spec) =>
        spec.file === "dev-vars" &&
        !["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PRIV_API_KEY"].includes(spec.name)
    ).map((spec) => spec.name);
    writeFileSync(join(cwd, ".dev.vars"), CORE + (optional[0] ? `${optional[0]}=present\n` : ""));
    try {
      const required = resolveSecretsRequired({ cwd, env: "local" });
      expect(required).toEqual(
        expect.arrayContaining(["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PRIV_API_KEY"])
      );
      if (optional[0]) {
        expect(required.filter((name) => name === optional[0])).toHaveLength(1);
      }
      for (const name of optional.slice(1)) {
        expect(required).not.toContain(name);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
