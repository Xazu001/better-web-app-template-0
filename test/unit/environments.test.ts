import { existsSync, readFileSync } from "node:fs";

import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { resolveCloudflareEnv } from "../../vite-preflight";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const wranglerExample = parseJsonc(readFileSync("wrangler.example.jsonc", "utf8"));

describe("package script matrix", () => {
  it("dev/dev:local/dev:prod all keep APP_ENV=local and select CLOUDFLARE_ENV", () => {
    expect(pkg.scripts.dev).toContain("APP_ENV=local");
    expect(pkg.scripts.dev).toContain("CLOUDFLARE_ENV=dev");
    expect(pkg.scripts["dev:local"]).toContain("APP_ENV=local");
    expect(pkg.scripts["dev:local"]).toContain("CLOUDFLARE_ENV=local");
    expect(pkg.scripts["dev:prod"]).toContain("APP_ENV=local");
    expect(pkg.scripts["dev:prod"]).toContain("CLOUDFLARE_ENV=prod");
  });

  it("has no deploy:local and no removed wrangler aliases", () => {
    expect(pkg.scripts["deploy:local"]).toBeUndefined();
    expect(pkg.scripts["dev:wrangler"]).toBeUndefined();
    expect(pkg.scripts["dev:wrangler:prod"]).toBeUndefined();
  });

  it("db scripts carry explicit env flags", () => {
    expect(pkg.scripts.db).toContain("--remote --env dev");
    expect(pkg.scripts["db:local"]).toContain("--local --env local");
    expect(pkg.scripts["db:prod"]).toContain("--remote --env prod");
    expect(pkg.scripts["db:migrate"]).toBe("npm run db");
    expect(pkg.scripts["db:migrate:local"]).toBe("npm run db:local");
    expect(pkg.scripts["db:migrate:prod"]).toBe("npm run db:prod");
  });

  it("deploy builds then uses the generated wrangler config without --name/--env", () => {
    expect(pkg.scripts.deploy).toBe(
      "npm run build && wrangler deploy --config .build/server/wrangler.json"
    );
    expect(pkg.scripts["deploy:prod"]).toBe(
      "npm run build:prod && wrangler deploy --config .build/server/wrangler.json"
    );
  });
  it('prod generation + full:prod use the prod config and history', () => {
    expect(pkg.scripts['db:generate:prod']).toBe('drizzle-kit generate --config=drizzle.config.prod.ts');
    expect(pkg.scripts['db:full:prod']).toBe('npm run db:generate:prod && npm run db:prod');
  });
});

describe("wrangler.example.jsonc environments", () => {
  const config = wranglerExample;

  it("defines local/dev/prod envs with explicit worker names", () => {
    expect(config.env.local.name).toBe("template-local");
    expect(config.env.dev.name).toBe("template-dev");
    expect(config.env.prod.name).toBe("template");
  });

  it("marks every d1/r2/kv/send_email/queue-producer binding remote in dev/prod and local in env.local", () => {
    for (const env of ["dev", "prod"]) {
      for (const db of config.env[env].d1_databases) {
        expect(db.remote).toBe(true);
      }
      for (const bucket of config.env[env].r2_buckets) {
        expect(bucket.remote).toBe(true);
      }
      for (const ns of config.env[env].kv_namespaces) {
        expect(ns.remote).toBe(true);
      }
      for (const producer of config.env[env].queues.producers) {
        expect(producer.remote).toBe(true);
      }
      for (const email of config.env[env].send_email) {
        expect(email.remote).toBe(true);
      }
    }
    const local = config.env.local;
    for (const db of local.d1_databases) expect(db.remote).toBe(false);
    for (const bucket of local.r2_buckets) expect(bucket.remote).toBe(false);
    for (const ns of local.kv_namespaces) expect(ns.remote).toBe(false);
    for (const producer of local.queues.producers) expect(producer.remote).toBe(false);
    for (const email of local.send_email) expect(email.remote).toBe(false);
  });

  it("keeps crons, DO migrations and consumers preserved", () => {
    expect(config.triggers.crons).toEqual(["0 0 * * *"]);
    expect(config.migrations[0].new_sqlite_classes).toContain("RateLimiterDO");
    for (const env of ["local", "dev", "prod"]) {
      expect(config.env[env].queues.consumers.length).toBeGreaterThan(0);
      expect(config.env[env].queues.consumers[0].remote).toBeUndefined();
    }
  });
});

describe("resolveCloudflareEnv", () => {
  const withEnv = (value: string | undefined, fn: () => void) => {
    const prev = process.env.CLOUDFLARE_ENV;
    if (value === undefined) delete process.env.CLOUDFLARE_ENV;
    else process.env.CLOUDFLARE_ENV = value;
    try {
      fn();
    } finally {
      if (prev === undefined) delete process.env.CLOUDFLARE_ENV;
      else process.env.CLOUDFLARE_ENV = prev;
    }
  };

  it("defaults serve to local and build to dev", () => {
    withEnv(undefined, () => {
      expect(resolveCloudflareEnv("serve")).toBe("local");
      expect(resolveCloudflareEnv("build")).toBe("dev");
    });
  });

  it("honours explicit local/dev/prod", () => {
    for (const env of ["local", "dev", "prod"] as const) {
      withEnv(env, () => {
        expect(resolveCloudflareEnv("serve")).toBe(env);
        expect(resolveCloudflareEnv("build")).toBe(env);
      });
    }
  });

  it("rejects invalid explicit values instead of remapping", () => {
    withEnv("staging", () => {
      expect(() => resolveCloudflareEnv("serve")).toThrowError(/Invalid CLOUDFLARE_ENV/);
      expect(() => resolveCloudflareEnv("build")).toThrowError(/Invalid CLOUDFLARE_ENV/);
    });
  });
});


describe('env.prod migrations history', () => {
  it(`env.prod points at drizzle-prod; dev at drizzle`, () => {
    for (const cfg of [wranglerExample, ...(existsSync("wrangler.jsonc") ? [parseJsonc(readFileSync("wrangler.jsonc", "utf8"))] : [])]) {
      expect(cfg.env.prod.d1_databases.find((d: {binding:string}) => d.binding === 'db').migrations_dir).toBe('drizzle-prod');
      expect(cfg.env.dev.d1_databases.find((d: {binding:string}) => d.binding === 'db').migrations_dir).toBe('drizzle');
    }
  });
});
