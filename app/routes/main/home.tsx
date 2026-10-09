import { useLoaderData } from "react-router";

import { Button } from "#/components/ui/button";
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

const CURRENT_YEAR = new Date().getFullYear();

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-dvh px-site">
      <section className="flex flex-col items-start gap-4 py-16 cont">
        <h1 className="m-0 font-header font-semibold text-3xl text-on-surface">
          {user ? `Welcome back, ${user.user_name}!` : "Welcome!"}
        </h1>
        <p className="max-w-mod-unit-6 m-0 text-lg text-on-surface-variant">
          This is the home page of the template — replace it with your app's landing content.
        </p>
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button to="/admin" variant="primary" size="lg">
              Admin panel
            </Button>
          ) : (
            <>
              <Button to="/login" variant="primary" size="lg">
                Login
              </Button>
              <Button to="/register" variant="outline" size="lg">
                Register
              </Button>
            </>
          )}
        </div>
      </section>
      <footer className="pb-0 px-site bg-surface border-outline-variant border-t">
        <div className="relative flex items-center justify-center gap-2 py-3 cont">
          <p className="m-0 text-on-surface-variant">
            &copy; {CURRENT_YEAR} App — built with better-web-app-template
          </p>
        </div>
      </footer>
    </main>
  );
}
