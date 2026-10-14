import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { initEnvFiles } from "../../scripts/env-init";
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

  it("initializes independent local/prod keys, fills config IDs and is idempotent", () => {
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
      const devVars = parseEnv(readFileSync(join(cwd, ".dev.vars"), "utf8"));
      const prodVars = parseEnv(readFileSync(join(cwd, ".dev.vars.prod"), "utf8"));
      const dotEnv = parseEnv(readFileSync(join(cwd, ".env"), "utf8"));
      expect(devVars.JWT_PRIVATE_KEY).toBeTruthy();
      expect(prodVars.JWT_PRIVATE_KEY).toBeTruthy();
      expect(devVars.JWT_PRIVATE_KEY).not.toBe(prodVars.JWT_PRIVATE_KEY);
      expect(devVars.PRIV_API_KEY).toMatch(/^[0-9a-f]{64}$/);
      expect(prodVars.PRIV_API_KEY).toMatch(/^[0-9a-f]{64}$/);
      expect(dotEnv.CLOUDFLARE_ACCOUNT_ID).toBe(accountId);
      expect(dotEnv.CLOUDFLARE_DB_ID).toBe(devDatabaseId);
      expect(dotEnv.CLOUDFLARE_DB_PROD_ID).toBe(prodDatabaseId);

      const before = [".dev.vars", ".dev.vars.prod", ".env"].map((file) =>
        readFileSync(join(cwd, file), "utf8")
      );
      initEnvFiles({ cwd, log: () => undefined });
      const after = [".dev.vars", ".dev.vars.prod", ".env"].map((file) =>
        readFileSync(join(cwd, file), "utf8")
      );
      expect(after).toEqual(before);
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
