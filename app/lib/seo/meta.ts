/**
 * Meta utilities for managing page metadata
 * Provides a simple, consistent API for creating meta tags
 */
import { SITE_URL } from "@/constants";

import { isNoIndexPath } from "./robots";

import type { StructuredData } from "./structured-data";

// ============================================================================
// CONFIGURATION
// ============================================================================

const TITLE_SEPARATOR = " | ";
const SITE_CONFIG = {
  name: "App",
  title: "App",
  description: "App — a better web app template",
  url: SITE_URL,
  twitter: "",
  locale: "en_US",
  themeColor: "#000000",
  keywords: [] as readonly string[],
  image: {
    url: `${SITE_URL}/logo-square.svg`,
    alt: "App",
    width: 512,
    height: 512,
    type: "image/svg+xml"
  }
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface MetaTag {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
  charset?: string;
  httpEquiv?: string;
  tagName?: "meta" | "link";
  rel?: string;
  href?: string;
  "script:ld+json"?: StructuredData;
  [key: string]: unknown; // Add index signature for React Router compatibility
}

interface MetaOptions {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  type?: string;
  keywords?: readonly string[];
  noIndex?: boolean;
  structuredData?: StructuredData | StructuredData[];
  additional?: MetaTag[];
}

interface MetaMatch {
  id: string;
  pathname: string;
  params: Record<string, string | undefined>;
  data?: unknown;
  loaderData?: unknown;
  handle?: { meta?: MetaTag[] };
  route?: { meta?: (args: unknown) => MetaTag[] };
  meta?: MetaTag[];
  [key: string]: unknown; // Allow additional properties for flexibility
}

// ============================================================================
// MAIN META FUNCTION
// ============================================================================

/**
 * Creates meta tags for a page
 * Auto-detects noIndex for private route prefixes based on pathname in matches.
 * @param matches - Route matches array (optional)
 * @param options - Meta configuration options (optional)
 * @returns Array of meta tags
 */
export function createMeta(
  matches?: readonly unknown[] | undefined,
  options?: MetaOptions | undefined
): MetaTag[] {
  const metaMatches = matches as readonly MetaMatch[] | undefined;
  const pathname = metaMatches?.length ? metaMatches[metaMatches.length - 1]?.pathname : undefined;

  // Auto-detect noIndex from private prefixes (explicit override takes precedence)
  const autoNoIndex = pathname ? isNoIndexPath(pathname) : false;
  const noIndex = options?.noIndex ?? autoNoIndex;
  const url = options?.url ?? (pathname ? `${SITE_CONFIG.url}${pathname}` : SITE_CONFIG.url);

  // Start with parent meta from matches if provided
  const parentMeta = metaMatches ? extractMetaFromMatches(metaMatches) : [];
  const newMeta = generateMetaTags({ ...options, url, noIndex });

  // Merge meta - new tags override parent ones
  return mergeMetaArrays(parentMeta, newMeta);
}

/**
 * Extracts meta tags from route matches
 */
function extractMetaFromMatches(matches: readonly MetaMatch[]): MetaTag[] {
  const meta: MetaTag[] = [];

  for (const match of matches) {
    // Check if match has meta directly (from React Router)
    if (match.meta && Array.isArray(match.meta)) {
      meta.push(...match.meta);
    }

    // Check if handle has meta
    if (match.handle?.meta) {
      meta.push(...match.handle.meta);
    }
  }

  return meta;
}

/**
 * Generates meta tags from options
 */
function generateMetaTags(options: MetaOptions): MetaTag[] {
  const {
    title,
    description,
    url = SITE_CONFIG.url,
    image = SITE_CONFIG.image.url,
    imageAlt = SITE_CONFIG.image.alt,
    type = "website",
    keywords = SITE_CONFIG.keywords,
    noIndex = false,
    structuredData,
    additional = []
  } = options;

  const meta: MetaTag[] = [];
  const fullTitle = createTitle(title);
  const fullDescription = description || SITE_CONFIG.description;
  const fullUrl = resolveAbsoluteUrl(url);
  const fullImage = resolveAbsoluteUrl(image);
  const keywordList = normalizeKeywords(keywords);

  // Basic meta tags
  meta.push({ title: fullTitle });
  if (fullDescription) {
    meta.push({ name: "description", content: fullDescription });
  }
  meta.push({ name: "theme-color", content: SITE_CONFIG.themeColor });
  if (keywordList.length > 0) {
    meta.push({ name: "keywords", content: keywordList.join(", ") });
  }

  // Open Graph tags
  meta.push({ property: "og:type", content: type });
  meta.push({ property: "og:site_name", content: SITE_CONFIG.name });
  meta.push({ property: "og:locale", content: SITE_CONFIG.locale });
  meta.push({ property: "og:title", content: fullTitle });
  if (fullDescription) {
    meta.push({ property: "og:description", content: fullDescription });
  }
  meta.push({ property: "og:url", content: fullUrl });
  meta.push({ property: "og:image", content: fullImage });
  meta.push({ property: "og:image:alt", content: imageAlt });
  meta.push({
    property: "og:image:width",
    content: SITE_CONFIG.image.width.toString()
  });
  meta.push({
    property: "og:image:height",
    content: SITE_CONFIG.image.height.toString()
  });
  meta.push({ property: "og:image:type", content: SITE_CONFIG.image.type });

  // Twitter Card tags
  meta.push({ name: "twitter:card", content: "summary_large_image" });
  if (SITE_CONFIG.twitter) {
    meta.push({ name: "twitter:site", content: SITE_CONFIG.twitter });
    meta.push({ name: "twitter:creator", content: SITE_CONFIG.twitter });
  }
  meta.push({ name: "twitter:title", content: fullTitle });
  if (fullDescription) {
    meta.push({ name: "twitter:description", content: fullDescription });
  }
  meta.push({ name: "twitter:image", content: fullImage });
  meta.push({ name: "twitter:image:alt", content: imageAlt });

  meta.push(
    ...normalizeStructuredData(structuredData).map((item) => ({
      "script:ld+json": item
    }))
  );

  // Additional meta tags
  meta.push(...additional);

  // SEO tags
  if (noIndex) {
    meta.push({ name: "robots", content: "noindex,nofollow" });
  } else {
    meta.push({ name: "robots", content: "index,follow" });
  }

  return meta;
}

/**
 * Merges meta arrays - new tags override parent ones
 */
function mergeMetaArrays(parent: MetaTag[], child: MetaTag[]): MetaTag[] {
  const metaMap = new Map<string, MetaTag>();

  // Add parent meta first
  for (const tag of parent) {
    const key = getMetaKey(tag) ?? `raw:${JSON.stringify(tag)}`;
    metaMap.set(key, tag);
  }

  // Override with child meta
  for (const tag of child) {
    const key = getMetaKey(tag) ?? `raw:${JSON.stringify(tag)}`;
    metaMap.set(key, tag);
  }

  return Array.from(metaMap.values());
}

/**
 * Gets a unique key for a meta tag
 */
function getMetaKey(tag: MetaTag): string | null {
  if (tag.title) return "title";
  if (tag.property) return `property:${tag.property}`;
  if (tag.name) return `name:${tag.name}`;
  if (tag.tagName === "link" && tag.rel) return `link:${tag.rel}`;
  if (tag.charset) return `charset:${tag.charset}`;
  if (tag.httpEquiv) return `http-equiv:${tag.httpEquiv}`;
  return null;
}

function resolveAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${SITE_CONFIG.url}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizeKeywords(keywords: readonly string[]): string[] {
  return [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))];
}

function normalizeStructuredData(
  structuredData?: StructuredData | StructuredData[]
): StructuredData[] {
  if (!structuredData) {
    return [];
  }

  return Array.isArray(structuredData) ? structuredData : [structuredData];
}

export function createKeywords(...keywords: string[]): string[] {
  return normalizeKeywords(keywords);
}

export function createTitle(title?: string): string {
  if (!title) {
    return SITE_CONFIG.title;
  }

  const normalizedTitle = title.trim();

  if (
    !normalizedTitle ||
    normalizedTitle === SITE_CONFIG.title ||
    normalizedTitle === `${SITE_CONFIG.title}.app`
  ) {
    return SITE_CONFIG.title;
  }

  if (normalizedTitle.startsWith(`${SITE_CONFIG.title}${TITLE_SEPARATOR}`)) {
    return normalizedTitle;
  }

  const titledTailIndex = normalizedTitle.indexOf(`${TITLE_SEPARATOR}${SITE_CONFIG.title}`);
  if (titledTailIndex > 0) {
    return `${SITE_CONFIG.title}${TITLE_SEPARATOR}${normalizedTitle.slice(0, titledTailIndex).trim()}`;
  }

  if (normalizedTitle.endsWith(` - ${SITE_CONFIG.title}`)) {
    return `${SITE_CONFIG.title}${TITLE_SEPARATOR}${normalizedTitle.slice(0, -` - ${SITE_CONFIG.title}`.length).trim()}`;
  }

  return `${SITE_CONFIG.title}${TITLE_SEPARATOR}${normalizedTitle}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates meta tags for error pages (404, 500, etc.)
 * @param errorType - Type of error (e.g. "404", "500")
 * @returns Array of meta tags
 */
export function createErrorMeta(errorType: string): MetaTag[] {
  return createMeta(undefined, {
    title: `Error ${errorType}`,
    description: `Something went wrong. Error ${errorType}`,
    noIndex: true
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Checks if a meta tag exists in an array
 * @param meta - Array of meta tags
 * @param name - Meta name to check
 * @returns True if meta tag exists
 */
export function hasMetaName(meta: MetaTag[], name: string): boolean {
  return meta.some((tag) => tag.name === name);
}

/**
 * Checks if an Open Graph meta tag exists in an array
 * @param meta - Array of meta tags
 * @param property - OG property to check
 * @returns True if OG meta tag exists
 */
export function hasMetaProperty(meta: MetaTag[], property: string): boolean {
  return meta.some((tag) => tag.property === property);
}

/**
 * Gets the content of a meta tag
 * @param meta - Array of meta tags
 * @param name - Meta name to get
 * @returns Meta content or undefined
 */
export function getMetaContent(meta: MetaTag[], name: string): string | undefined {
  const tag = meta.find((tag) => tag.name === name);
  return tag?.content;
}

/**
 * Gets the content of an Open Graph meta tag
 * @param meta - Array of meta tags
 * @param property - OG property to get
 * @returns Meta content or undefined
 */
export function getOGContent(meta: MetaTag[], property: string): string | undefined {
  const tag = meta.find((tag) => tag.property === property);
  return tag?.content;
}
