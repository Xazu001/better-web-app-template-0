import { Link } from "react-router";

import { Icon } from "#/components/ui/icon";
import { createMeta } from "#/lib/seo";

import { loader } from "./index.server";

import type { Route } from "./+types/index";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Admin Dashboard",
    description: "Platform statistics overview.",
    noIndex: true
  });
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { users, admins } = loaderData;

  return (
    <div className="flex flex-col gap-3 w-full">
      <h1 className="m-0 font-header font-semibold text-3xl text-on-surface">Dashboard</h1>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 font-header font-semibold text-on-surface text-xl">Users</h2>
        <div className="desktop:grid-cols-4 grid grid-cols-2 tablet:grid-cols-3 gap-2">
          <StatCard label="Total" value={users.total} />
          <StatCard label="Verified" value={users.verified} />
          <StatCard label="Active" value={users.active} />
          <StatCard label="Banned" value={users.banned} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 font-header font-semibold text-on-surface text-xl">Access</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Admins" value={admins} />
          <Link
            to="/admin/users"
            className="flex flex-col gap-1 p-3 bg-elevation-1 border border-outline-variant/50 hover:border-outline rounded-lg transition-colors"
          >
            <span className="flex items-center gap-1 text-on-surface-variant text-sm">
              <Icon.Users size="sm" />
              Manage users
            </span>
            <span className="font-header font-semibold text-2xl text-on-surface">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Route Helpers (Components specific to route)
// ──────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-elevation-1 border border-outline-variant/50 rounded-lg">
      <span className="text-on-surface-variant text-sm">{label}</span>
      <span className="font-header font-semibold text-2xl text-on-surface">{value}</span>
    </div>
  );
}
