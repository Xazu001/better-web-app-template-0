import * as React from "react";
import { Link, Outlet, useLocation } from "react-router";

import { Avatar } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import { Icon } from "#/components/ui/icon";
import { Menu, MenuTrigger } from "#/components/ui/menu";
import { cn } from "#/components/utils";
import { getAvatarUrl } from "#/lib";
import { createMeta } from "#/lib/seo";

import { loader } from "./layout.server";

import type { Route } from "./+types/layout";

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  path: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  exact?: boolean;
}

interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "manage",
    label: "Manage",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        path: "/admin",
        subtitle: "Overview & metrics",
        icon: <Icon.ChartBarBig />,
        exact: true
      },
      {
        id: "users",
        label: "Users",
        path: "/admin/users",
        subtitle: "User directory & access",
        icon: <Icon.Users />
      }
    ]
  }
];

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Admin",
    description: "Administration panel.",
    noIndex: true
  });
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { userName, userNamespace, userAvatarSource } = loaderData;
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const avatarUrl = getAvatarUrl(userAvatarSource, userNamespace);

  // Close mobile drawer on route navigation
  const [prevPath, setPrevPath] = React.useState(location.pathname);
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setIsMobileOpen(false);
  }

  const isUsers = location.pathname.startsWith("/admin/users");
  const isUserDetail =
    location.pathname.startsWith("/admin/users/") && location.pathname !== "/admin/users";

  const usersNavTo = isUserDetail ? `/admin/users${location.search}` : "/admin/users";
  const navItemTo = (item: NavItem) => (item.id === "users" ? usersNavTo : item.path);

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="flex flex-col min-h-dvh w-full bg-surface antialiased text-on-surface">
      {/* Top Header Bar — stretches full width across top with breadcrumbs on left */}
      <header className="sticky top-0 z-navigation flex shrink-0 items-center justify-between gap-3 h-14 w-full px-4 backdrop-blur bg-surface/90 border-b border-outline-variant/30">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="desktop:hidden p-1.5 hover:bg-elevation-1 rounded-md hover:text-on-surface text-on-surface-variant transition-colors"
            aria-label="Open navigation"
          >
            <Icon.Burger />
          </button>

          {/* Back to Home Link */}
          <Link
            to="/"
            className="flex items-center justify-center p-1.5 hover:bg-elevation-1 rounded-md hover:text-on-surface text-on-surface-variant transition-colors"
            title="Back to Home"
            aria-label="Back to Home"
          >
            <Icon.Home />
          </Link>

          {/* Breadcrumb Navigation — aligned all the way to left */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 truncate text-on-surface-variant text-sm"
          >
            <Link to="/admin" className="hover:text-on-surface transition-colors">
              Admin
            </Link>
            {isUsers && (
              <>
                <Icon.ChevronRight size="sm" className="shrink-0 text-on-surface-variant/50" />
                <Link
                  to={usersNavTo}
                  className={cn(
                    "truncate hover:text-on-surface transition-colors",
                    !isUserDetail && "font-semibold text-on-surface"
                  )}
                >
                  Users
                </Link>
              </>
            )}
            {isUserDetail && (
              <>
                <Icon.ChevronRight size="sm" className="shrink-0 text-on-surface-variant/50" />
                <span className="font-semibold truncate text-on-surface">User Details</span>
              </>
            )}
            {!isUsers && !isUserDetail && (
              <>
                <Icon.ChevronRight size="sm" className="shrink-0 text-on-surface-variant/50" />
                <span className="font-semibold truncate text-on-surface">Dashboard</span>
              </>
            )}
          </nav>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex shrink-0 items-center gap-2 tablet:gap-3">
          {/* User Avatar — opens user menu */}
          <Menu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen} align="end">
            <MenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 hover:bg-elevation-1/50 rounded-full transition-colors"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen((v) => !v)}
              >
                <div className="relative">
                  <Avatar
                    src={avatarUrl}
                    className="border border-outline-variant/40"
                    alt={userName || "Admin"}
                  />
                  <span className="absolute bottom-0 right-0 h-2 w-2 bg-success ring-2 ring-surface rounded-full" />
                </div>
                <div className="hidden flex-col tablet:flex leading-tight text-left">
                  <span className="font-medium text-on-surface text-sm line-clamp-1">
                    {userName || "Admin"}
                  </span>
                  <span className="text-on-surface-variant/80 text-sm">Administrator</span>
                </div>
              </button>
            </MenuTrigger>
            <div className="flex flex-col w-40 p-1">
              <Button
                to="/"
                variant="ghost"
                size="sm"
                className="justify-start"
                Icon={<Icon.Home size="sm" />}
              >
                Home
              </Button>
              <form action="/api/logout" method="post">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="justify-start w-full"
                  Icon={<Icon.LogOut size="sm" />}
                >
                  Logout
                </Button>
              </form>
            </div>
          </Menu>
        </div>
      </header>

      {/* Main Row: Aside panel underneath the header + Main content */}
      <div className="flex flex-1 min-w-0 w-full">
        {/* Desktop Left Sidebar — sits underneath the top header */}
        <aside
          className={cn(
            "hidden sticky top-14 z-sticky desktop:flex flex-col shrink-0 h-[calc(100dvh-calc(var(--spacing)*14))] bg-surface border-outline-variant/30 border-r select-none duration-medium-2 ease-md3 transition-all",
            isCollapsed ? "w-18" : "w-64"
          )}
        >
          {/* Navigation Groups — Manage */}
          <div className="overflow-y-auto flex-1 space-y-3 px-3 py-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className="space-y-1">
                {!isCollapsed && group.label && (
                  <div className="px-2 py-1 font-semibold tracking-wider uppercase text-on-surface-variant/80 text-sm">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={item.id}
                      item={item}
                      to={navItemTo(item)}
                      isCollapsed={isCollapsed}
                      active={isItemActive(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Collapse Sidebar Toggle */}
          <div className="p-2 mt-auto border-outline-variant/30 border-t">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "flex items-center gap-2 w-full p-2 hover:bg-elevation-1/50 rounded-md hover:text-on-surface text-on-surface-variant text-sm transition-colors",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon.ChevronLeft
                size="sm"
                className={cn(
                  "duration-medium-1 transition-transform",
                  isCollapsed && "rotate-180"
                )}
              />
              {!isCollapsed && <span>Collapse sidebar</span>}
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 max-w-[1600px] p-4 cont">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="desktop:hidden fixed inset-0 z-modal flex">
          <div
            className="fixed inset-0 backdrop-blur-sm bg-scrim/80 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-raised flex flex-col h-full max-w-[85vw] w-72 bg-surface border-outline-variant/40 border-r shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-outline-variant/30">
              <span className="font-semibold text-on-surface text-sm">Admin</span>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded-md hover:text-on-surface text-on-surface-variant"
                aria-label="Close navigation"
              >
                <Icon.X />
              </button>
            </div>

            {/* Navigation inside drawer */}
            <div className="overflow-y-auto flex-1 space-y-3 px-3 py-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.id} className="space-y-1">
                  {group.label && (
                    <div className="px-2 py-1 font-semibold tracking-wider uppercase text-on-surface-variant/80 text-sm">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <SidebarNavItem
                        key={item.id}
                        item={item}
                        to={navItemTo(item)}
                        isCollapsed={false}
                        active={isItemActive(item)}
                        onClick={() => setIsMobileOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Route Helpers (Components specific to route)
// ──────────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  to,
  isCollapsed,
  active,
  onClick
}: {
  item: NavItem;
  to: string;
  isCollapsed: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors group",
        active
          ? "bg-elevation-1 text-primary font-semibold"
          : "text-on-surface-variant hover:text-on-surface hover:bg-elevation-1/50",
        isCollapsed && "justify-center px-2"
      )}
    >
      <span
        className={cn(
          "shrink-0",
          active ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
        )}
      >
        {item.icon}
      </span>
      {!isCollapsed && (
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className="px-1.5 py-0.5 bg-primary/15 rounded font-semibold tracking-wider uppercase text-primary text-sm">
                {item.badge}
              </span>
            )}
            <Icon.ChevronRight
              size="sm"
              className={cn(
                "shrink-0 text-on-surface-variant/40 transition-transform group-hover:text-on-surface-variant",
                active && "text-primary/70"
              )}
            />
          </div>
          {item.subtitle && (
            <span className="font-normal truncate text-on-surface-variant/70 text-sm">
              {item.subtitle}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
