import { parseEnv } from "node:util";

export type EnvFileKind = "dev-vars" | "env";
export type EnvGenerator = "jwt-pair" | "hex32";

export interface EnvVarSpec {
  name: string;
  file: EnvFileKind;
  comment?: readonly string[];
  secretIn?: readonly string[];
  generate?: EnvGenerator;
}

export const ENV_FILE_HEADERS: Record<EnvFileKind, readonly string[]> = {
  "dev-vars": [
    "# Generated from scripts/lib/env-manifest.ts — edit the manifest, then run `pnpm env:examples`.",
    "# `pnpm env:init` creates `.dev.vars`; `pnpm env:init --env dev` creates `.dev.vars.dev` —",
    "# each a complete independent file with its own JWT pair (never merged).",
    "# `.dev.vars.dev` is only for `pnpm dev:remote` (localhost against remote dev resources).",
    "# Deployed dev/prod secrets are set with `wrangler secret put <NAME> --env dev|prod` — these",
    "# files are never deployed and there is no local production secrets file.",
    "# Local Worker secrets for Wrangler; `.dev.vars*` files are gitignored."
  ],
  env: [
    "# Generated from scripts/lib/env-manifest.ts — edit the manifest, then run `pnpm env:examples`.",
    "# Tooling only; never put Worker secrets here.",
    "# Worker secrets belong in `.dev.vars`; see `.dev.vars.example`."
  ]
};

const ALL_SECRET_SECTIONS = ["default", "dev", "prod"] as const;

export const ENV_VARS: readonly EnvVarSpec[] = [
  {
    name: "JWT_PRIVATE_KEY",
    file: "dev-vars",
    comment: [
      "RS256 key pair for JWT sessions (base64-encoded PKCS8 / SPKI).",
      "Rotate with `pnpm gen:keys [file]`; `pnpm env:init` creates distinct pairs."
    ],
    secretIn: ALL_SECRET_SECTIONS,
    generate: "jwt-pair"
  },
  {
    name: "JWT_PUBLIC_KEY",
    file: "dev-vars",
    secretIn: ALL_SECRET_SECTIONS,
    generate: "jwt-pair"
  },
  {
    name: "PRIV_API_KEY",
    file: "dev-vars",
    comment: [
      "X-API-Key for private /api/priv endpoints.",
      "Generated as a 32-byte hex secret for local development."
    ],
    secretIn: ALL_SECRET_SECTIONS,
    generate: "hex32"
  },
  {
    name: "CLOUDFLARE_ACCOUNT_ID",
    file: "env",
    comment: ["Cloudflare account + API token (used by drizzle.config.*.ts d1-http)."]
  },
  { name: "CLOUDFLARE_API_TOKEN", file: "env" },
  {
    name: "CLOUDFLARE_DB_ID",
    file: "env",
    comment: ["D1 database IDs (from `wrangler d1 create` / `wrangler d1 list`)."]
  },
  { name: "CLOUDFLARE_DB_PROD_ID", file: "env" }
];

export function renderEnvFile(kind: EnvFileKind, values: Record<string, string> = {}): string {
  const lines = [...ENV_FILE_HEADERS[kind], ""];
  let hasVariable = false;

  for (const spec of ENV_VARS.filter((item) => item.file === kind)) {
    if (spec.comment) {
      if (hasVariable) lines.push("");
      lines.push(...spec.comment.map((line) => `# ${line}`));
    }
    lines.push(`${spec.name}=${values[spec.name] ?? ""}`);
    hasVariable = true;
  }

  return `${lines.join("\n")}\n`;
}

export function fillEnvFile(
  existing: string | null,
  kind: EnvFileKind,
  generated: Record<string, string>
): { content: string; added: string[]; filled: string[] } {
  const specs = ENV_VARS.filter((item) => item.file === kind);
  if (existing === null) {
    return {
      content: renderEnvFile(kind, generated),
      added: specs.map((spec) => spec.name),
      filled: []
    };
  }

  let content = existing;
  const added: string[] = [];
  const filled: string[] = [];
  const parsed = parseEnv(existing) as Record<string, string | undefined>;

  for (const spec of specs) {
    const prefix = `${spec.name}=`;
    const linePattern = new RegExp(
      `^([ \\t]*(?:export[ \\t]+)?${spec.name}[ \\t]*=[ \\t]*).*$`,
      "m"
    );

    if (linePattern.test(content)) {
      if (!parsed[spec.name] && generated[spec.name]) {
        content = content.replace(linePattern, `$1${generated[spec.name]}`);
        filled.push(spec.name);
      }
      continue;
    }
    if (Object.hasOwn(parsed, spec.name)) continue;

    const separator =
      content.length === 0
        ? ""
        : spec.comment
          ? content.endsWith("\n\n")
            ? ""
            : content.endsWith("\n")
              ? "\n"
              : "\n\n"
          : content.endsWith("\n")
            ? ""
            : "\n";
    const comments = spec.comment?.map((line) => `# ${line}`) ?? [];
    content += `${separator}${[...comments, `${prefix}${generated[spec.name] ?? ""}`].join("\n")}\n`;
    added.push(spec.name);
  }

  return { content, added, filled };
}
