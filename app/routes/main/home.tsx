import { Link } from "react-router";

import { Chip } from "#/components/ui/chip";
import { createMeta } from "#/lib/seo";

import { loader } from "./home.server";

import type { Route } from "./+types/home";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Home",
    description: "Welcome to the app."
  });
};

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

const STACK = ["React Router v8", "React 19", "Drizzle", "Cloudflare Workers", "Tailwind v4"];

const CURRENT_YEAR = new Date().getFullYear();

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function Index() {
  return (
    <main className="flex flex-col min-h-dvh px-site">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-16 cont">
        <h1 className="m-0 text-3xl">better-web-app-template</h1>
        <p className="m-0 text-center text-lg text-on-surface-variant">
          A template built for React Router v8 on the Cloudflare Workers runtime.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {STACK.map((item) => (
            <Chip key={item} variant="outline">
              {item}
            </Chip>
          ))}
        </div>
      </section>
      <footer className="pb-0 px-site bg-surface border-outline-variant border-t">
        <div className="relative flex flex-wrap items-center justify-center gap-2 py-3 cont">
          <p className="m-0 text-on-surface-variant">
            &copy; {CURRENT_YEAR} App — built with better-web-app-template
          </p>
          <span className="text-on-surface-variant" aria-hidden="true">
            ·
          </span>
          <Link to="/docs" className="link-muted">
            Example .md → transformer
          </Link>
        </div>
      </footer>
    </main>
  );
}
