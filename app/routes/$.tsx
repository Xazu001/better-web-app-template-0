import { Button } from "#/components/ui/button";
import { createErrorMeta } from "#/lib/seo";

import type { Route } from "./+types/$";

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = () => createErrorMeta("404");

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function Index() {
  return (
    <main className="pt-top-site px-site">
      <section className="flex flex-col items-start justify-center min-h-[50vh] cont">
        <div className="flex flex-col items-start gap-2">
          <h2 className="font-header font-regular text-4xl text-on-surface">
            Page Not Found <br /> The URL doesn't <br /> Exist
          </h2>
          <p>404 Not Found</p>
          <Button size="lg" variant="ghost" to="/">
            Back to Home
          </Button>
        </div>
      </section>
    </main>
  );
}
