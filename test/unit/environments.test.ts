import { existsSync, readFileSync } from "node:fs";

import { parse as parseJsonc } from "jsonc-parser";
import { describe, expect, it } from "vitest";

import { resolveCloudflareEnv } from "../../vite-preflight";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const wranglerExample = parseJsonc(readFileSync("wrangler.example.jsonc", "utf8"));
const wrangler = existsSync("wrangler.jsonc")
  ? parseJsonc(readFileSync("wrangler.jsonc", "utf8"))
  : undefined;

describe("package script matrix", () => {
  it("dev is the local serve; dev:local aliases it; dev:remote selects env.dev", () => {
    expect(pkg.scripts.dev).toBe("cross-env CLOUDFLARE_ENV= react-router dev");
    expect(pkg.scripts["dev:local"]).toBe("npm run dev");
    expect(pkg.scripts["dev:remote"]).toBe("cross-env CLOUDFLARE_ENV=dev react-router dev");
    expect(pkg.scripts.dev).not.toContain("APP_ENV");
    expect(pkg.scripts["dev:remote"]).not.toContain("APP_ENV");
  });

  it("dev:prod is gone and no removed wrangler aliases exist", () => {
    expect(pkg.scripts["dev:prod"]).toBeUndefined();
    expect(pkg.scripts["deploy:local"]).toBeUndefined();
    expect(pkg.scripts["dev:wrangler"]).toBeUndefined();
    expect(pkg.scripts["dev:wrangler:prod"]).toBeUndefined();
  });

  it("dev:clean keeps cache wiping and chains the local dev server", () => {
    expect(pkg.scripts["dev:clean"]).toContain("rmSync");
    expect(pkg.scripts["dev:clean"]).toContain("npm run dev");
  });

  it("builds target explicit named envs; deploy goes through the generated config", () => {
    expect(pkg.scripts.build).toBe("cross-env CLOUDFLARE_ENV=dev react-router build");
    expect(pkg.scripts["build:dev"]).toBe("npm run build");
    expect(pkg.scripts["build:prod"]).toBe("cross-env CLOUDFLARE_ENV=prod react-router build");
    expect(pkg.scripts["build:prod"]).not.toContain("APP_ENV");
    expect(pkg.scripts.deploy).toBe("npm run deploy:dev");
    expect(pkg.scripts["deploy:dev"]).toBe(
      "npm run build && wrangler deploy --config .build/server/wrangler.json"
    );
    expect(pkg.scripts["deploy:prod"]).toBe(
      "npm run build:prod && wrangler deploy --config .build/server/wrangler.json"
    );
  });

  it("db scripts pin --config wrangler.jsonc; db:local drops --env local", () => {
    expect(pkg.scripts.db).toContain("--remote --env dev");
    expect(pkg.scripts.db).toContain("--config wrangler.jsonc");
    expect(pkg.scripts["db:local"]).toContain("--local");
    expect(pkg.scripts["db:local"]).toContain("--config wrangler.jsonc");
    expect(pkg.scripts["db:local"]).not.toContain("--env");
    expect(pkg.scripts["db:prod"]).toContain("--remote --env prod");
    expect(pkg.scripts["db:prod"]).toContain("--config wrangler.jsonc");
    expect(pkg.scripts["db:migrate"]).toBe("npm run db");
    expect(pkg.scripts["db:migrate:local"]).toBe("npm run db:local");
    expect(pkg.scripts["db:migrate:prod"]).toBe("npm run db:prod");
  });

  it("prod generation + full:prod use the prod config and history", () => {
    expect(pkg.scripts["db:generate:prod"]).toBe(
      "drizzle-kit generate --config=drizzle.config.prod.ts"
    );
    expect(pkg.scripts["db:full:prod"]).toBe("npm run db:generate:prod && npm run db:prod");
  });

  it("wrangler CLI calls pin the source config", () => {
    expect(pkg.scripts.typegen).toContain("wrangler types --config wrangler.jsonc");
  });

  it("postinstall targets a tracked config (actual wrangler.jsonc is gitignored)", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    const actualIgnored = gitignore.split(/\r?\n/).some((line) => line.trim() === "wrangler.jsonc");
    expect(pkg.scripts.postinstall).toContain(
      actualIgnored ? "wrangler.example.jsonc" : "wrangler.jsonc"
    );
  });
});

describe.each(
  wrangler
    ? ([
        ["wrangler.jsonc", wrangler],
        ["wrangler.example.jsonc", wranglerExample]
      ] as const)
    : ([["wrangler.example.jsonc", wranglerExample]] as const)
)("%s environments", (_file, config) => {
  it("top-level is the local config; env.local is gone; dev/prod names kept", () => {
    expect(config.name).toBe("template-local");
    expect(config.env.local).toBeUndefined();
    expect(config.env.dev.name).toBe("template-dev");
    expect(config.env.prod.name).toBe("template");
  });

  it("top-level remote-capable bindings are all emulated", () => {
    for (const db of config.d1_databases ?? []) expect(db.remote).toBe(false);
    for (const bucket of config.r2_buckets ?? []) expect(bucket.remote).toBe(false);
    for (const ns of config.kv_namespaces ?? []) expect(ns.remote).toBe(false);
    for (const producer of config.queues?.producers ?? []) {
      expect(producer.remote).toBe(false);
    }
    for (const email of config.send_email ?? []) expect(email.remote).toBe(false);
    expect(config.triggers?.crons ?? []).toEqual([]);
  });

  it("env.dev keeps data bindings remote but emulates queues/email/crons", () => {
    const dev = config.env.dev;
    for (const db of dev.d1_databases ?? []) expect(db.remote).toBe(true);
    for (const bucket of dev.r2_buckets ?? []) expect(bucket.remote).toBe(true);
    for (const ns of dev.kv_namespaces ?? []) expect(ns.remote).toBe(true);
    for (const producer of dev.queues?.producers ?? []) {
      expect(producer.remote).toBe(false);
    }
    for (const email of dev.send_email ?? []) expect(email.remote).toBe(false);
    expect(dev.triggers?.crons ?? []).toEqual([]);
  });

  it("env.prod keeps prod names/ids, remote bindings and the prod cron schedule", () => {
    const prod = config.env.prod;
    for (const db of prod.d1_databases ?? []) expect(db.remote).toBe(true);
    for (const bucket of prod.r2_buckets ?? []) expect(bucket.remote).toBe(true);
    for (const ns of prod.kv_namespaces ?? []) expect(ns.remote).toBe(true);
    for (const producer of prod.queues?.producers ?? []) {
      expect(producer.remote).toBe(true);
    }
    for (const email of prod.send_email ?? []) expect(email.remote).toBe(true);
    expect(
      prod.d1_databases.find((d: { binding: string }) => d.binding === "db").database_name
    ).toBe("template-db");
    if (config.queues || config.triggers) {
      expect(prod.triggers.crons).toEqual(["0 0 * * *"]);
    }
  });

  it("keeps DO migrations and queue consumers preserved", () => {
    expect(config.migrations[0].new_sqlite_classes).toContain("RateLimiterDO");
    for (const env of ["dev", "prod"]) {
      for (const consumer of config.env[env].queues?.consumers ?? []) {
        expect(consumer.remote).toBeUndefined();
      }
    }
  });
});

describe("env.prod migrations history", () => {
  it("env.prod points at drizzle-prod; dev and top-level at drizzle", () => {
    for (const cfg of wrangler ? [wranglerExample, wrangler] : [wranglerExample]) {
      expect(
        cfg.env.prod.d1_databases.find((d: { binding: string }) => d.binding === "db")
          .migrations_dir
      ).toBe("drizzle-prod");
      expect(
        cfg.env.dev.d1_databases.find((d: { binding: string }) => d.binding === "db").migrations_dir
      ).toBe("drizzle");
      expect(
        cfg.d1_databases.find((d: { binding: string }) => d.binding === "db").migrations_dir
      ).toBe("drizzle");
    }
  });
});

describe("resolveCloudflareEnv", () => {
  const withEnv = (value: string | undefined, fn: () => void) => {
    const prev = process.env.CLOUDFLARE_ENV;
    const prevApp = process.env.APP_ENV;
    if (value === undefined) delete process.env.CLOUDFLARE_ENV;
    else process.env.CLOUDFLARE_ENV = value;
    try {
      fn();
    } finally {
      if (prev === undefined) delete process.env.CLOUDFLARE_ENV;
      else process.env.CLOUDFLARE_ENV = prev;
      if (prevApp === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = prevApp;
    }
  };

  it("defaults serve and build to local when unset or empty", () => {
    for (const value of [undefined, ""]) {
      withEnv(value, () => {
        expect(resolveCloudflareEnv("serve")).toBe("local");
        expect(resolveCloudflareEnv("build")).toBe("local");
      });
    }
  });

  it("accepts explicit local for serve and build", () => {
    withEnv("local", () => {
      expect(resolveCloudflareEnv("serve")).toBe("local");
      expect(resolveCloudflareEnv("build")).toBe("local");
    });
  });

  it("accepts dev for serve and dev/prod for build", () => {
    withEnv("dev", () => {
      expect(resolveCloudflareEnv("serve")).toBe("dev");
      expect(resolveCloudflareEnv("build")).toBe("dev");
    });
    withEnv("prod", () => {
      expect(resolveCloudflareEnv("build")).toBe("prod");
    });
  });

  it("rejects serving prod locally with an actionable error", () => {
    withEnv("prod", () => {
      expect(() => resolveCloudflareEnv("serve")).toThrowError(/prod/);
    });
  });

  it("rejects invalid explicit values instead of remapping", () => {
    withEnv("staging", () => {
      expect(() => resolveCloudflareEnv("serve")).toThrowError(/Invalid CLOUDFLARE_ENV/);
      expect(() => resolveCloudflareEnv("build")).toThrowError(/Invalid CLOUDFLARE_ENV/);
    });
  });

  it("ignores APP_ENV entirely", () => {
    const previousAppEnv = process.env.APP_ENV;
    try {
      process.env.APP_ENV = "prod";
      withEnv(undefined, () => {
        expect(resolveCloudflareEnv("serve")).toBe("local");
        expect(resolveCloudflareEnv("build")).toBe("local");
      });
    } finally {
      if (previousAppEnv === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previousAppEnv;
    }
    expect(process.env.APP_ENV).toBe(previousAppEnv);
  });
});
