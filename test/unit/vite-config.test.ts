import { describe, expect, it, vi } from "vitest";

import type { ConfigEnv } from "vite";

const cloudflareOptions: Record<string, unknown>[] = [];

vi.mock("@cloudflare/vite-plugin", () => ({
  cloudflare: (options: Record<string, unknown>) => {
    cloudflareOptions.push(options);
    return { name: "mock:cloudflare" };
  }
}));
vi.mock("@react-router/dev/vite", () => ({ reactRouter: () => ({ name: "mock:rr" }) }));
vi.mock("@rolldown/plugin-babel", () => ({ default: () => ({ name: "mock:babel" }) }));
vi.mock("@tailwindcss/vite", () => ({ default: () => ({ name: "mock:tailwind" }) }));

vi.mock("../../scripts/lib/dev-vars.ts", () => ({
  resolveSecretsRequired: () => ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PRIV_API_KEY"]
}));

import configFactory from "../../vite.config";

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

const buildConfig = () => {
  const env: ConfigEnv = {
    command: "build",
    mode: "production",
    isSsrBuild: false,
    isPreview: false
  };
  if (typeof configFactory !== "function") throw new Error("expected a config factory");
  return configFactory(env);
};

describe("vite config CLOUDFLARE_ENV normalization", () => {
  it("normalizes explicit local to the top-level config before plugin construction", () => {
    withEnv("local", () => {
      buildConfig();
      expect(process.env.CLOUDFLARE_ENV).toBe("");
      expect(cloudflareOptions.at(-1)?.remoteBindings).toBe(false);
    });
  });

  it("normalizes case variants so the plugin selects the resolved env", () => {
    withEnv("DEV", () => {
      buildConfig();
      expect(process.env.CLOUDFLARE_ENV).toBe("dev");
      expect(cloudflareOptions.at(-1)?.remoteBindings).toBe(true);
    });
    withEnv("Prod", () => {
      buildConfig();
      expect(process.env.CLOUDFLARE_ENV).toBe("prod");
    });
  });

  it("normalizes unset to the top-level local config for builds too", () => {
    withEnv(undefined, () => {
      buildConfig();
      expect(process.env.CLOUDFLARE_ENV).toBe("");
      expect(cloudflareOptions.at(-1)?.remoteBindings).toBe(false);
    });
  });
});

const CORE_KEYS = ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PRIV_API_KEY"];

type FakeWorkerConfig = {
  migrations: { tag: string; new_sqlite_classes: string[] }[];
  secrets: { required: string[] };
  vars: Record<string, string>;
};

const serveCallback = () => {
  const env: ConfigEnv = {
    command: "serve",
    mode: "development",
    isSsrBuild: false,
    isPreview: false
  };
  if (typeof configFactory !== "function") throw new Error("expected a config factory");
  configFactory(env);
  return cloudflareOptions.at(-1)?.config as (workerConfig: FakeWorkerConfig) => unknown;
};

const freshWorkerConfig = (): FakeWorkerConfig => ({
  migrations: [{ tag: "v1", new_sqlite_classes: ["RateLimiterDO"] }],
  secrets: { required: [...CORE_KEYS, "UNCONFIGURED_OPTIONAL"] },
  vars: { EXISTING: "kept" }
});

describe("serve worker config callback (no defu array duplication)", () => {
  it("mutates the worker config in place and returns nothing", () => {
    withEnv(undefined, () => {
      const callback = serveCallback();
      const workerConfig = freshWorkerConfig();
      const migrations = workerConfig.migrations;
      expect(callback(workerConfig)).toBeUndefined();
      expect(workerConfig.migrations).toBe(migrations);
      expect(workerConfig.migrations).toEqual([{ tag: "v1", new_sqlite_classes: ["RateLimiterDO"] }]);
      expect(workerConfig.secrets.required).toEqual(CORE_KEYS);
      expect(workerConfig.vars.EXISTING).toBe("kept");
    });
  });
});
