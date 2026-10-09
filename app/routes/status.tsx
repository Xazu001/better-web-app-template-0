import * as React from "react";
import { useLocation, useSearchParams } from "react-router";

import { Button } from "#/components/ui/button";
import { Icon } from "#/components/ui/icon";
import { cn } from "#/components/utils";
import { createMeta } from "#/lib/seo";
import { getMessageByKey, type MessageKey } from "@/utils";

import { loader } from "./status.server";

import type { Route } from "./+types/status";

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

export interface StatusProps {
  success?: boolean;
  messageKey?: string | MessageKey;
  title?: string;
  description?: string;
  returnTo?: string;
  returnLabel?: string;
}

function getStatusDetails(
  success: boolean,
  messageKey?: string,
  customTitle?: string,
  customDescription?: string
) {
  const resolved = messageKey ? getMessageByKey(messageKey) : undefined;

  let headline = customTitle;
  let subtitle = customDescription;

  if (!headline) {
    if (resolved && resolved !== messageKey) {
      headline = resolved;
    } else if (messageKey) {
      headline = resolved ?? messageKey;
    } else {
      headline = success ? "Action Completed Successfully" : "Operation Failed";
    }
  }

  if (!subtitle) {
    if (customTitle && resolved) {
      subtitle = resolved;
    } else if (messageKey === "USER_DELETED_SUCCESSFULLY") {
      subtitle =
        "The user account and all associated resources have been permanently removed from the platform.";
    } else if (messageKey === "USER_BANNED_SUCCESSFULLY") {
      subtitle =
        "The user account has been deleted and associated email addresses have been blocked from future registration.";
    } else if (messageKey === "USER_NOT_FOUND") {
      subtitle = "The requested user account does not exist or has already been removed.";
    } else if (messageKey === "FAILED_TO_DELETE_USER") {
      subtitle =
        "An error occurred while attempting to delete this user. Please verify user permissions and try again.";
    } else if (messageKey === "FAILED_TO_BAN_USER") {
      subtitle =
        "An error occurred while attempting to ban this user. Please check your privileges and try again.";
    } else if (messageKey === "CANNOT_DELETE_OWN_ACCOUNT_ADMIN") {
      subtitle = "You cannot delete your own administrator account via the administration panel.";
    } else {
      subtitle = success
        ? "The requested operation has been processed and applied successfully."
        : "The requested operation could not be completed. Please review and try again.";
    }
  }

  return { headline, subtitle };
}

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Status",
    description: "Operation outcome and status details.",
    noIndex: true
  });
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function StatusRoute({ loaderData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navState = (location.state as (Partial<StatusProps> & { key?: string }) | null) ?? null;

  const successParam = searchParams.get("success");
  const success =
    navState?.success ??
    (successParam !== null
      ? successParam === "true" || successParam === "1"
      : (loaderData?.success ?? true));

  const messageKey =
    navState?.messageKey ??
    navState?.key ??
    searchParams.get("key") ??
    loaderData?.key ??
    undefined;

  const returnTo =
    navState?.returnTo ??
    searchParams.get("returnTo") ??
    loaderData?.returnTo ??
    (location.pathname.startsWith("/admin") ? "/admin/users" : "/");

  const returnLabel =
    navState?.returnLabel ??
    searchParams.get("returnLabel") ??
    loaderData?.returnLabel ??
    (location.pathname.startsWith("/admin") ? "Back to users" : "Return");

  const title = navState?.title ?? searchParams.get("title") ?? loaderData?.title ?? undefined;

  const description =
    navState?.description ??
    searchParams.get("description") ??
    loaderData?.description ??
    undefined;

  const isInAdmin = location.pathname.startsWith("/admin");

  const content = (
    <StatusCard
      success={success}
      messageKey={messageKey}
      title={title}
      description={description}
      returnTo={returnTo}
      returnLabel={returnLabel}
    />
  );

  if (isInAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] w-full px-4 py-12">
        {content}
      </div>
    );
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-dvh w-full p-4 bg-surface">
      {content}
    </main>
  );
}

// ──────────────────────────────────────────────────────────────
// Route Helpers (Components specific to route)
// ──────────────────────────────────────────────────────────────

export function StatusCard({
  success = true,
  messageKey,
  title,
  description,
  returnTo = "/admin/users",
  returnLabel = "Back to users"
}: StatusProps) {
  const { headline, subtitle } = getStatusDetails(success, messageKey, title, description);
  const location = useLocation();
  const isInAdmin = location.pathname.startsWith("/admin") || returnTo.startsWith("/admin");

  return (
    <div className="flex flex-col items-center max-w-[720px] w-full px-6 py-14 text-center">
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center size-20 rounded-full",
          success ? "bg-primary/10" : "bg-error/10"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center size-11 rounded-full",
            success ? "bg-primary text-on-primary" : "bg-error text-on-error"
          )}
        >
          {success ? <Icon.Check size="md" /> : <Icon.AlertCircle size="md" />}
        </div>
      </div>

      {/* Text Container */}
      <h1 className="mb-0 mt-8 font-header font-medium leading-snug tracking-tight tablet:text-3xl text-2xl text-on-surface">
        {headline}
      </h1>
      <p className="max-w-[460px] mb-0 mt-2 font-body leading-relaxed text-lg text-on-surface-variant">
        {subtitle}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col tablet:flex-row items-center justify-center gap-3 w-full mt-10">
        <Button
          to={returnTo}
          variant={success ? "primary" : "error"}
          size="lg"
          className="min-w-[200px] tablet:w-auto w-full rounded-full"
        >
          {returnLabel}
        </Button>
        {isInAdmin && returnTo !== "/admin" && (
          <Button
            to="/admin"
            variant="outline"
            size="lg"
            className="min-w-[160px] tablet:w-auto w-full rounded-full"
          >
            Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
