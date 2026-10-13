import { randomBytes } from "node:crypto";

export type JwtPairState = "ok" | "absent" | `missing-${"private" | "public"}`;

export function jwtPairState(vars: Record<string, string | undefined>): JwtPairState {
  const hasPriv = Boolean(vars.JWT_PRIVATE_KEY);
  const hasPub = Boolean(vars.JWT_PUBLIC_KEY);
  if (hasPriv && hasPub) return "ok";
  if (!hasPriv && !hasPub) return "absent";
  return hasPriv ? "missing-public" : "missing-private";
}

export function withLocalPrivApiKey(
  content: string,
  vars: Record<string, string | undefined>,
  random: () => string = () => randomBytes(32).toString("hex")
): string | null {
  if (vars.PRIV_API_KEY) return null;
  const line = `PRIV_API_KEY=${random()}`;
  return /^PRIV_API_KEY=.*$/m.test(content)
    ? content.replace(/^PRIV_API_KEY=.*$/m, line)
    : `${content.replace(/\n*$/, "")}\n${line}\n`;
}
