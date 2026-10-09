/**
 * Current app version.
 * Mirrored in `public/version.json` — keep both in sync.
 */
export const APP_VERSION = "0.1.0";

const getAppEnv = (): "local" | "dev" | "prod" => {
  if (typeof process !== "undefined" && process.env.APP_ENV) {
    return process.env.APP_ENV as "local" | "dev" | "prod";
  }
  try {
    return __APP_ENV__;
  } catch {
    return "prod";
  }
};

export const APP_ENV = getAppEnv();

type AppEnv = "local" | "dev" | "prod";
type CloudflareEnv = "dev" | "prod";

const getCloudflareEnv = (): CloudflareEnv => {
  if (typeof process !== "undefined" && process.env.CLOUDFLARE_ENV) {
    return process.env.CLOUDFLARE_ENV.toLowerCase() === "prod" ? "prod" : "dev";
  }
  try {
    return __CLOUDFLARE_ENV__;
  } catch {
    return "dev";
  }
};

export const CLOUDFLARE_ENV = getCloudflareEnv();

/**
 * Site URLs per environment — replace with your deployment domains.
 */
const siteUrlMap: Record<AppEnv, string> = {
  local: "http://localhost:5173",
  dev: "https://dev.example.com",
  prod: "https://example.com"
};

export const BRAND_URL = "https://example.com";
export const SITE_URL = siteUrlMap[APP_ENV];

// R2 CDN URL follows the active Cloudflare binding (CLOUDFLARE_ENV), not APP_ENV,
// so `dev:prod` (APP_ENV=local + CLOUDFLARE_ENV=prod) serves prod media while
// keeping localhost auth/cookies intact.
const r2UrlMap: Record<CloudflareEnv, string> = {
  dev: "https://r2-dev.example.com",
  prod: "https://r2.example.com"
};

export const R2_URL = r2UrlMap[CLOUDFLARE_ENV];

// Mail assets must be reachable by recipients' mail clients — never localhost.
// Local dev points at the dev deployment, which serves the same public/ assets.
const mailAssetsUrlMap: Record<AppEnv, string> = {
  local: "https://dev.example.com",
  dev: "https://dev.example.com",
  prod: "https://example.com"
};

export const MAIL_ASSETS_URL = mailAssetsUrlMap[APP_ENV];

export const CONTACT_EMAIL = "contact@example.com";

export const MAIL_FROM_EMAIL = "noreply@example.com";
export const MAIL_FROM_NAME = "App";

/**
 * Cookie consent version - increment when cookie policy changes.
 * Forces users to re-accept cookies when version doesn't match stored consent.
 */
export const COOKIE_CONSENT_VERSION = 1;
