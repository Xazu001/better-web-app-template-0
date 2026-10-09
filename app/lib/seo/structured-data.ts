import { BRAND_URL, SITE_URL } from "@/constants";

interface StructuredData {
  [key: string]: StructuredDataValue;
}

type StructuredDataValue =
  | string
  | number
  | boolean
  | null
  | StructuredData
  | StructuredDataValue[];

type SchemaType =
  | "WebPage"
  | "AboutPage"
  | "CollectionPage"
  | "ContactPage"
  | "WebSite"
  | "Organization"
  | "BreadcrumbList"
  | "ItemList"
  | "Person"
  | "ListItem";

interface PageSchemaOptions {
  name: string;
  description?: string;
  path?: string;
  image?: string;
  type?: Extract<SchemaType, "WebPage" | "AboutPage" | "CollectionPage" | "ContactPage">;
}

interface ItemListEntry {
  name: string;
  url: string;
}

/**
 * JSON-LD structured data utilities
 */

/**
 * Base organization structured data
 */
export const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "App",
  url: BRAND_URL,
  logo: `${BRAND_URL}/logo-square.svg`,
  sameAs: [SITE_URL]
};

/**
 * Base website structured data
 */
export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "App",
  url: SITE_URL
};

/**
 * Generic web page structured data
 */
export function pageSchema(options: PageSchemaOptions) {
  return {
    "@context": "https://schema.org",
    "@type": options.type ?? "WebPage",
    name: options.name,
    description: options.description ?? "",
    url: `${SITE_URL}${options.path ?? "/"}`,
    ...(options.image ? { image: options.image } : {})
  };
}

/**
 * ItemList structured data (e.g. collections)
 */
export function itemListSchema(items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${SITE_URL}${item.url}`
    }))
  };
}

export type { StructuredData };

/**
 * Serialize structured data for `dangerouslySetInnerHTML` JSON-LD injection.
 */
export function renderStructuredData(data: StructuredData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
