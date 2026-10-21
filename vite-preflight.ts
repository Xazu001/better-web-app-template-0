export type CloudflareEnv = "local" | "dev" | "prod";

const CLOUDFLARE_ENV_VALUES: CloudflareEnv[] = ["local", "dev", "prod"];

export function resolveCloudflareEnv(command: "serve" | "build"): CloudflareEnv {
  const raw = process.env.CLOUDFLARE_ENV;
  if (raw === undefined || raw === "") {
    return "local";
  }
  const lowered = raw.toLowerCase();
  if (!(CLOUDFLARE_ENV_VALUES as string[]).includes(lowered)) {
    throw new Error(
      `Invalid CLOUDFLARE_ENV="${raw}" — expected one of ${CLOUDFLARE_ENV_VALUES.join(", ")}.`
    );
  }
  if (command === "serve" && lowered === "prod") {
    throw new Error(
      "CLOUDFLARE_ENV=prod cannot be served locally — use the deployed prod worker, `pnpm dev` (local) or `pnpm dev:remote` (env.dev)."
    );
  }
  return lowered as CloudflareEnv;
}
