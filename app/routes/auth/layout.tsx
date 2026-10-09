import { Outlet, type useFetcher } from "react-router";

import { Button } from "#/components/ui/button";
import { Icon } from "#/components/ui/icon";
import { createMeta } from "#/lib/seo";

import type { Route } from "./+types/layout";

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

export const authSize = "lg" as const;

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  fetcher: ReturnType<typeof useFetcher>;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
};

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, { noIndex: true });
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function LayoutIndex() {
  return (
    <main className="relative overflow-hidden flex h-dvh w-full bg-black">
      <section className="relative z-content overflow-auto flex flex-col desktop:w-1/2 h-[calc(100dvh+3px)] w-full pb-8 desktop:mx-0 mx-auto bg-black desktop:border-b desktop:border-l desktop:border-outline-variant desktop:border-t desktop:rounded-br-none desktop:rounded-tr-none rounded-2xl -translate-y-[2px]">
        <Outlet />
      </section>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────
// Route Helpers (Components specific to route)
// ──────────────────────────────────────────────────────────────

export function AuthLayout({ title, subtitle, fetcher, children, onSubmit }: AuthLayoutProps) {
  return (
    <div className="relative flex flex-col justify-center min-h-dvh w-full px-site">
      <Button
        to="/"
        variant="ghost"
        size={authSize}
        Icon={<Icon.ArrowLeft />}
        iconButton
        aria-label="Back to home"
        className="absolute left-[var(--spacing-x-site)] top-6"
      />
      <fetcher.Form
        method="post"
        action="."
        className="flex flex-col large-desktop:max-w-mod-unit-7 max-w-mod-unit-5 pt-24 mx-auto cont"
        onSubmit={onSubmit}
      >
        <header className="flex flex-col items-start gap-1">
          <h2 className="font-header font-semibold text-3xl text-on-glass">{title}</h2>
          <p className="font-body text-md text-on-glass-variant">{subtitle}</p>
        </header>
        {children}
      </fetcher.Form>
    </div>
  );
}
