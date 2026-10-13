
export type CloudflareEnv = "local" | "dev" | "prod";

const CLOUDFLARE_ENV_VALUES: CloudflareEnv[] = ["local", "dev", "prod"];

export function resolveCloudflareEnv(command: "serve" | "build"): CloudflareEnv {
  const raw = process.env.CLOUDFLARE_ENV;
  if (raw === undefined || raw === "") {
    return command === "serve" ? "local" : "dev";
  }
  const lowered = raw.toLowerCase();
  if ((CLOUDFLARE_ENV_VALUES as string[]).includes(lowered)) {
    return lowered as CloudflareEnv;
  }
  throw new Error(
    `Invalid CLOUDFLARE_ENV="${raw}" — expected one of ${CLOUDFLARE_ENV_VALUES.join(", ")}.`
  );
}
