/**
 * Current app version.
 * Mirrored in `public/version.json` — keep both in sync.
 */
export const APP_VERSION = "0.1.0";

type AppEnv = "local" | "dev" | "prod";
type CloudflareEnv = "local" | "dev" | "prod";

const getAppEnv = (): AppEnv => {
  try {
    return __APP_ENV__;
  } catch {
    return "prod";
  }
};

export const APP_ENV = getAppEnv();

const getCloudflareEnv = (): CloudflareEnv => {
  try {
    return __CLOUDFLARE_ENV__;
  } catch {
    return "dev";
  }
};

export const CLOUDFLARE_ENV = getCloudflareEnv();

const getIsDev = (): boolean => {
  try {
    return __IS_DEV__;
  } catch {
    return true;
  }
};

export const IS_DEV = getIsDev();

const getLocalBindings = (): boolean => {
  try {
    return __LOCAL_BINDINGS__;
  } catch {
    return false;
  }
};

export const LOCAL_BINDINGS = getLocalBindings();

/**
 * Site URLs per environment — replace with your deployment domains.
 */
const siteUrlMap: Record<AppEnv, string> = {
  local: "http://localhost:5173",
  dev: "https://dev.example.com",
  prod: "https://example.com"
};

export const BRAND_URL = "https://example.com";

const r2UrlMap: Record<CloudflareEnv, string> = {
  local: "http://localhost:5173/api/_dev/r2",
  dev: "https://r2-dev.example.com",
  prod: "https://r2.example.com"
};

// Mail assets must be reachable by recipients' mail clients — never localhost.
// Local dev points at the dev deployment, which serves the same public/ assets.
const mailAssetsUrlMap: Record<AppEnv, string> = {
  local: "https://dev.example.com",
  dev: "https://dev.example.com",
  prod: "https://example.com"
};

export function resolveSiteUrls(
  appEnv: AppEnv,
  cloudflareEnv: CloudflareEnv
): {
  siteUrl: string;
  r2Url: string;
  mailAssetsUrl: string;
} {
  return {
    siteUrl: siteUrlMap[appEnv],
    r2Url: r2UrlMap[cloudflareEnv],
    mailAssetsUrl: mailAssetsUrlMap[appEnv]
  };
}

const urls = resolveSiteUrls(APP_ENV, CLOUDFLARE_ENV);
export const SITE_URL = urls.siteUrl;
export const R2_URL = urls.r2Url;
export const MAIL_ASSETS_URL = urls.mailAssetsUrl;

export const CONTACT_EMAIL = "contact@example.com";

export const MAIL_FROM_EMAIL = "noreply@example.com";
export const MAIL_FROM_NAME = "App";

/**
 * Cookie consent version - increment when cookie policy changes.
 * Forces users to re-accept cookies when version doesn't match stored consent.
 */
export const COOKIE_CONSENT_VERSION = 1;
