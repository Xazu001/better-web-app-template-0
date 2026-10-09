import * as React from "react";
import { Form, Link, useNavigate, useSearchParams } from "react-router";

import { Chip } from "#/components/ui/chip";
import { Icon } from "#/components/ui/icon";
import { TextField } from "#/components/ui/text-field";
import { createMeta } from "#/lib/seo";
import { USERS_PAGE_SIZE } from "@/constants";

import { loader } from "./users.server";

import type { Route } from "./+types/users";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Admin · Users",
    description: "Browse and manage user accounts.",
    noIndex: true
  });
};

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Banned", value: "banned" }
] as const;

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function statusChipVariant(status: string): React.ComponentProps<typeof Chip>["variant"] {
  switch (status) {
    case "active":
      return "success";
    case "banned":
      return "error";
    default:
      return "assist";
  }
}

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const { users, total, search } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";
  const currentSort = searchParams.get("sort");
  const currentPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const totalPages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `/admin/users?${params.toString()}`;
  };

  const nextSort = currentSort === "desc" ? "asc" : "desc";

  const buildSortUrl = (sort: "asc" | "desc") => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", sort);
    params.delete("page");
    return `/admin/users?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <h1 className="m-0 font-header font-semibold text-3xl text-on-surface">Users</h1>

      <Form method="get" className="flex flex-col gap-2">
        <input type="hidden" name="status" value={currentStatus} />
        {currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
        <TextField
          name="q"
          label="Search by name, namespace, or email"
          defaultValue={search ?? ""}
          placeholder="e.g. johndoe or john@example.com"
        />
      </Form>

      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map((filter) => {
          const params = new URLSearchParams(searchParams);
          if (filter.value) params.set("status", filter.value);
          else params.delete("status");
          params.delete("page");
          const isActive = currentStatus === filter.value;
          return (
            <Link key={filter.value} to={`/admin/users?${params.toString()}`}>
              <Chip variant={isActive ? "primary" : "outline"}>{filter.label}</Chip>
            </Link>
          );
        })}
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Icon.Search size="lg" />
          <p className="m-0 font-medium text-lg text-on-surface">No users found</p>
          <p className="m-0 text-on-surface-variant text-sm">
            {search ? `No users matched "${search}".` : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-outline-variant/50 rounded-lg">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-elevation-1 text-on-surface-variant">
                <tr>
                  <th className="p-2 font-medium text-left">Name</th>
                  <th className="p-2 font-medium text-left">Namespace</th>
                  <th className="p-2 font-medium text-left">Status</th>
                  <th className="p-2 font-medium text-left">Verified</th>
                  <th className="p-2 font-medium text-left">
                    <Link
                      to={buildSortUrl(nextSort)}
                      className="inline-flex items-center gap-1 hover:text-on-surface text-inherit cursor-pointer select-none transition-colors"
                    >
                      Created
                      {currentSort === "desc" && <Icon.ArrowDown size="sm" />}
                      {currentSort === "asc" && <Icon.ArrowUp size="sm" />}
                    </Link>
                  </th>
                  <th className="p-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const qs = searchParams.toString();
                  const detailUrl = `/admin/users/${user.user_id}${qs ? `?${qs}` : ""}`;
                  return (
                    <tr
                      key={user.user_id}
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(detailUrl)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(detailUrl);
                        }
                      }}
                      className="hover:bg-elevation-1 border-outline-variant/30 border-t cursor-pointer transition-colors"
                    >
                      <td className="p-2 font-medium text-on-surface">{user.user_name}</td>
                      <td className="p-2 text-on-surface-variant">{user.user_namespace}</td>
                      <td className="p-2">
                        <Chip size="sm" variant={statusChipVariant(user.user_status ?? "active")}>
                          {user.user_status ?? "active"}
                        </Chip>
                      </td>
                      <td className="p-2">
                        {user.user_verified ? (
                          <Icon.Check size="sm" />
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="p-2 text-on-surface-variant">
                        {formatDate(user.created_on ?? null)}
                      </td>
                      <td className="p-2 text-right text-on-surface-variant">
                        <Icon.ChevronRight size="sm" className="inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-on-surface-variant text-sm">
              {total} user{total === 1 ? "" : "s"} · page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              {currentPage > 1 ? (
                <Link
                  to={buildPageUrl(currentPage - 1)}
                  className="inline-flex items-center gap-1 text-primary text-sm"
                >
                  <Icon.ChevronLeft size="sm" />
                  Prev
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-on-surface-variant/40 text-sm">
                  <Icon.ChevronLeft size="sm" />
                  Prev
                </span>
              )}
              {currentPage < totalPages ? (
                <Link
                  to={buildPageUrl(currentPage + 1)}
                  className="inline-flex items-center gap-1 text-primary text-sm"
                >
                  Next
                  <Icon.ChevronRight size="sm" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-on-surface-variant/40 text-sm">
                  Next
                  <Icon.ChevronRight size="sm" />
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
