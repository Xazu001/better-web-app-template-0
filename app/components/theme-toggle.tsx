import * as React from "react";
import { useRouteLoaderData } from "react-router";

import { Icon } from "#/components/ui/icon";

import type { loader } from "#/root.server";
import type { ThemeValue } from "$/lib/cookies";

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export function ThemeToggle() {
  const data = useRouteLoaderData<typeof loader>("root");
  const loaderTheme: ThemeValue = data?.theme ?? "system";
  const [theme, setTheme] = React.useState(loaderTheme);
  const [syncedLoaderTheme, setSyncedLoaderTheme] = React.useState(loaderTheme);
  const next: ThemeValue = theme === "system" ? "light" : theme === "light" ? "dark" : "system";

  // Re-sync when the loader theme changes (e.g. after navigation)
  if (loaderTheme !== syncedLoaderTheme) {
    setSyncedLoaderTheme(loaderTheme);
    setTheme(loaderTheme);
  }

  const toggle = () => {
    // "system" resolves via prefers-color-scheme; the init script's media
    // listener keeps it in sync afterwards
    const resolved =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next;
    document.documentElement.className = resolved;
    // Same format as themeCookie.serialize: encodeURIComponent(btoa(JSON.stringify(value)))
    document.cookie = `theme=${encodeURIComponent(btoa(JSON.stringify(next)))}; Max-Age=31536000; Path=/; SameSite=Lax`;
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center justify-center p-1.5 hover:bg-elevation-1 rounded-md hover:text-on-surface text-on-surface-variant transition-colors"
      aria-label={`Switch to ${next} theme`}
      title={`${next[0].toUpperCase()}${next.slice(1)} theme`}
    >
      {next === "light" ? <Icon.Sun /> : next === "dark" ? <Icon.Moon /> : <Icon.SunMoon />}
    </button>
  );
}
