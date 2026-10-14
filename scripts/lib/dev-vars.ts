export type JwtPairState = "ok" | "absent" | `missing-${"private" | "public"}`;

export function jwtPairState(vars: Record<string, string | undefined>): JwtPairState {
  const hasPriv = Boolean(vars.JWT_PRIVATE_KEY);
  const hasPub = Boolean(vars.JWT_PUBLIC_KEY);
  if (hasPriv && hasPub) return "ok";
  if (!hasPriv && !hasPub) return "absent";
  return hasPriv ? "missing-public" : "missing-private";
}
