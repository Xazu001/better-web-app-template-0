import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { jwtPairState } from "../../scripts/lib/dev-vars";

const DOCTOR = join(process.cwd(), "scripts", "doctor.ts");
const TSX = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");

const runDoctor = (cwd: string, args: string[] = []) =>
  spawnSync(process.execPath, [TSX, DOCTOR, ...args], { cwd, encoding: "utf8" });

const fixture = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "doctor-test-"));
  mkdirSync(join(dir, "node_modules"), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
};

const ACCOUNT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PH = "00000000-0000-0000-0000-000000000000";
const wrangler = (env: Record<string, unknown> = {}) =>
  JSON.stringify({ name: "template", account_id: ACCOUNT, env }, null, 2);

describe("dev-vars helpers", () => {
  it("classifies the JWT keypair states", () => {
    expect(jwtPairState({})).toBe("absent");
    expect(jwtPairState({ JWT_PRIVATE_KEY: "a", JWT_PUBLIC_KEY: "b" })).toBe("ok");
    expect(jwtPairState({ JWT_PRIVATE_KEY: "a" })).toBe("missing-public");
    expect(jwtPairState({ JWT_PUBLIC_KEY: "b" })).toBe("missing-private");
  });
});

describe("check:setup doctor", () => {
  it("fails when --env has no value", () => {
    const dir = fixture({ "wrangler.jsonc": wrangler() });
    const r = runDoctor(dir, ["--env"]);
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toContain("--env requires a value");
  });
  it("rejects an invalid --env value", () => {
    const dir = fixture({ "wrangler.jsonc": wrangler() });
    const r = runDoctor(dir, ["--env", "staging"]);
    expect(r.status).toBe(1);
  });
  it("fails on a malformed wrangler.jsonc", () => {
    const dir = fixture({ "wrangler.jsonc": "{ bad,," });
    const r = runDoctor(dir, ["--env", "dev"]);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain("parse");
  });
  it("--env prod does not require local .dev.vars or local D1 state", () => {
    const dir = fixture({
      "wrangler.jsonc": wrangler({
        prod: {
          name: "template",
          d1_databases: [
            {
              binding: "db",
              database_name: "template-db",
              database_id: PH,
              migrations_dir: "drizzle-prod"
            }
          ],
          kv_namespaces: [{ binding: "kv", id: PH }]
        }
      })
    });
    const r = runDoctor(dir, ["--env", "prod"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(".dev.vars.prod");
    expect(r.stdout).not.toContain("JWT keypair in .dev.vars");
  });
  it("--env prod --strict fails on placeholder IDs", () => {
    const dir = fixture({
      "wrangler.jsonc": wrangler({
        prod: {
          name: "template",
          d1_databases: [{ binding: "db", database_name: "template-db", database_id: PH }],
          kv_namespaces: [{ binding: "kv", id: PH }]
        }
      })
    });
    expect(runDoctor(dir, ["--env", "prod", "--strict"]).status).toBe(1);
  });
  it("warns on missing/malformed ids in the selected env only", () => {
    const dir = fixture({
      "wrangler.jsonc": wrangler({
        dev: {
          name: "template-dev",
          d1_databases: [{ binding: "db", database_name: "template-db-dev" }],
          kv_namespaces: [{ binding: "kv", id: "not-an-id" }]
        },
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
    });
    const r = runDoctor(dir, ["--env", "dev"]);
    expect(r.stdout).toContain("placeholder/missing id");
    expect(r.stdout).toContain("malformed id");
  });
});
