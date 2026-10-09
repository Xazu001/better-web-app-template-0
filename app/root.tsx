import * as React from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";

import { InfoBoundary } from "#/components/ui/info-boundary";
import { ToastContainer } from "#/components/ui/toast";
import { useResolvedTheme } from "#/lib/hooks/use-resolved-theme";
import { createMeta } from "#/lib/seo";

import { loader } from "./root.server";

// Side-effect import — with cssCodeSplit:false Vite emits a single `style.css`
// which React Router <Links /> injects from the manifest. `?url` broke the
// build (the manifest key was a full path instead of `style.css`).
import "#/styles/main.css";

import type { Route } from "./+types/root";

// ──────────────────────────────────────────────────────────────
// Theme Init Script
// ──────────────────────────────────────────────────────────────

// Runs before first paint: applies the stored theme cookie, or falls back to
// prefers-color-scheme when the preference is "system"/absent. The change
// listener keeps following the OS theme until an explicit cookie is set.
const themeInitScript = `(function(){var mq=matchMedia("(prefers-color-scheme: dark)");function apply(){var c=document.cookie.match(/(?:^|;\\s*)theme=([^;]*)/);var v=null;try{v=c?JSON.parse(atob(decodeURIComponent(c[1]))):null}catch(e){}document.documentElement.className=v==="light"||v==="dark"?v:mq.matches?"dark":"light"}apply();mq.addEventListener("change",apply)})()`;

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };

// ──────────────────────────────────────────────────────────────
// Route Links
// ──────────────────────────────────────────────────────────────

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/logo.svg", sizes: "32x32" },
  { rel: "manifest", href: "/manifest.json" },

  // Font preloading
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "preload",
    href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Syne:wght@400..800&display=block",
    as: "style"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Syne:wght@400..800&display=block"
  },

  // DNS prefetch for performance
  { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
  { rel: "dns-prefetch", href: "https://fonts.gstatic.com" }
];

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches);
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme === "light" ? "light" : "dark";

  return (
    <html lang="en" className={theme} suppressHydrationWarning={true}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript
          }}
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style
          dangerouslySetInnerHTML={{
            __html: "@layer reset, base, components, custom, routes, overrides;"
          }}
        />
        <Links />
        <Meta />
      </head>
      <Body>{children}</Body>
    </html>
  );
}

export function Body({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = useResolvedTheme(data?.theme);

  return (
    <body suppressHydrationWarning={true}>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme}
      />
      <ScrollRestoration />
      <Scripts />
    </body>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary(props: Route.ErrorBoundaryProps) {
  return <InfoBoundary {...props} />;
}
