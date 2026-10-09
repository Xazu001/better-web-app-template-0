/**
 * SEO robots utilities — noindex detection for private route prefixes.
 */
const NO_INDEX_PREFIXES = ["/admin", "/status", "/login", "/register"];

/**
 * Check if a path should be excluded from indexing (admin, status, auth pages).
 */
export function isNoIndexPath(pathname: string): boolean {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return NO_INDEX_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}
