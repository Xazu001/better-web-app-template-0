import * as React from "react";

import type { ThemeValue } from "$/lib/cookies";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const subscribe = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(DARK_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
};

/**
 * Resolves a theme preference to the effective theme. `"system"` follows
 * `prefers-color-scheme` and updates live when the OS theme changes.
 */
export function useResolvedTheme(theme: ThemeValue | undefined): "light" | "dark" {
  const systemTheme = React.useSyncExternalStore<"light" | "dark">(
    subscribe,
    () => (window.matchMedia(DARK_QUERY).matches ? "dark" : "light"),
    () => "dark"
  );

  return theme === "light" || theme === "dark" ? theme : systemTheme;
}
