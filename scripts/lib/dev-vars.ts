import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

import { ENV_VARS } from "./env-manifest.ts";

export type JwtPairState = "ok" | "absent" | `missing-${"private" | "public"}`;

export function jwtPairState(vars: Record<string, string | undefined>): JwtPairState {
  const hasPriv = Boolean(vars.JWT_PRIVATE_KEY);
  const hasPub = Boolean(vars.JWT_PUBLIC_KEY);
  if (hasPriv && hasPub) return "ok";
  if (!hasPriv && !hasPub) return "absent";
  return hasPriv ? "missing-public" : "missing-private";
}

export type DevVarsEnv = "local" | "dev" | "prod";

export function devVarsFile(env: DevVarsEnv): string {
  if (env === "prod") {
    throw new Error(
      "No local production secrets file is supported — set deployed prod secrets " +
        "with `pnpm exec wrangler secret put <NAME> --env prod`."
    );
  }
  return env === "local" ? ".dev.vars" : `.dev.vars.${env}`;
}

export const LOCAL_CORE_KEYS = ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PRIV_API_KEY"] as const;

export function resolveSecretsRequired(opts: { cwd?: string; env: DevVarsEnv }): string[] {
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env;
  const file = devVarsFile(env);
  const path = join(cwd, file);
  if (!existsSync(path)) {
    const init = env === "local" ? "pnpm env:init" : `pnpm env:init --env ${env}`;
    throw new Error(
      `${file} not found — run \`${init}\` to create it before serving env '${env}'.`
    );
  }
  const vars = parseEnv(readFileSync(path, "utf8")) as Record<string, string | undefined>;
  const missingCore = LOCAL_CORE_KEYS.filter((key) => !vars[key]);
  if (missingCore.length > 0) {
    const init = env === "local" ? "pnpm env:init" : `pnpm env:init --env ${env}`;
    throw new Error(
      `${file} is missing required local secrets: ${missingCore.join(", ")} — run \`${init}\` (existing values are preserved).`
    );
  }
  const optional = ENV_VARS.filter(
    (spec) =>
      spec.file === "dev-vars" &&
      !(LOCAL_CORE_KEYS as readonly string[]).includes(spec.name) &&
      Boolean(vars[spec.name])
  ).map((spec) => spec.name);
  return [...new Set([...LOCAL_CORE_KEYS, ...optional])];
}
