import { createResourceUrl } from "@/constants";

export function getAvatarUrl(avatarSource: string | null, _namespace?: string | null) {
  return avatarSource ? createResourceUrl("avatar", avatarSource) : "/assets/default-avatar.png";
}

/**
 * Enables Hot Module Replacement (HMR) for route-specific CSS styles during development.
 *
 * @param metaUrl The value of `import.meta.url` from the calling module.
 * @param relativePath The relative path (e.g. `"./index.css"`) or aliased path (e.g. `"#/.../style.css"`) to the stylesheet.
 */
export function enableRouteStylesHmr(metaUrl: string, relativePath: string) {
  if (import.meta.env.DEV && typeof document !== "undefined") {
    let url = relativePath;
    if (url.startsWith("#/")) {
      url = "/app/" + url.slice(2);
    } else if (url.startsWith("$/")) {
      url = "/server/" + url.slice(2);
    } else if (url.startsWith("@/")) {
      url = "/shared/" + url.slice(2);
    } else if (url.startsWith(".")) {
      url = new URL(url, metaUrl).pathname;
    }
    void import(/* @vite-ignore */ url);
  }
}

/**
 * Generates a LinksFunction that returns an empty array during development (since styles are injected via HMR)
 * and returns the standard stylesheet link in production.
 *
 * @param stylesUrl The imported URL of the compiled stylesheet (imported using `?url`).
 */
export function routeStyles(stylesUrl: string) {
  return () => {
    if (import.meta.env.DEV) {
      return [];
    }
    return [
      {
        rel: "stylesheet" as const,
        href: stylesUrl
      }
    ];
  };
}
