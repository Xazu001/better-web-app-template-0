import { useLoaderData } from "react-router";

import { createMeta } from "#/lib/seo";

import { loader } from "./docs.server";

import type { Route } from "./+types/docs";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Docs",
    description: "Markdown rendered on the server through the ASSETS binding."
  });
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function Docs() {
  const { html } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-dvh px-site">
      <article className="max-w-unit-3xl py-16 cont">
        <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  );
}
