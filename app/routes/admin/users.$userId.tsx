import * as React from "react";
import { Link, useLocation, useNavigate, useRevalidator } from "react-router";

import { Button } from "#/components/ui/button";
import { Chip } from "#/components/ui/chip";
import { Dialog } from "#/components/ui/dialog";
import { Icon } from "#/components/ui/icon";
import { Switch } from "#/components/ui/switch";
import { TextField } from "#/components/ui/text-field";
import { useSubmitAction } from "#/lib";
import { createMeta } from "#/lib/seo";
import { toast } from "#/lib/toast";
import { buildStatusUrl, getMessageByKey, getRawErrors } from "@/utils";
import { createTypedSubmit } from "@/utils/typed-submit";

import { action, loader } from "./users.$userId.server";

import type { Route } from "./+types/users.$userId";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { loader, action };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Admin · User",
    description: "User administration details.",
    noIndex: true
  });
};

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  });
}

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function AdminUserDetail({ loaderData }: Route.ComponentProps) {
  const user = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const revalidator = useRevalidator();

  const usersListUrl = `/admin/users${location.search}`;
  const actionUrl = `/admin/users/${user.user_id}${location.search}`;

  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showBanDialog, setShowBanDialog] = React.useState(false);
  const [showRightsDialog, setShowRightsDialog] = React.useState(false);
  const [banReason, setBanReason] = React.useState("");
  const [pendingRight, setPendingRight] = React.useState<{
    key: "admin";
    value: boolean;
  } | null>(null);

  const rightsForm = useSubmitAction<{ userName: string; general?: string }>({
    action: actionUrl,
    onSuccess: (result) => {
      toast.success(`Rights updated for ${result.userName}`);
      revalidator.revalidate();
    },
    onError: (errors) => {
      if (errors?.general) toast.error(getMessageByKey(errors.general));
    }
  });

  const deleteForm = useSubmitAction<{ userId: string; general?: string }>({
    action: actionUrl,
    onSuccess: () => {
      navigate(
        buildStatusUrl(
          {
            success: true,
            messageKey: "USER_DELETED_SUCCESSFULLY",
            returnTo: usersListUrl,
            returnLabel: "Back to users"
          },
          "/admin/status"
        ),
        {
          state: {
            success: true,
            key: "USER_DELETED_SUCCESSFULLY",
            returnTo: usersListUrl,
            returnLabel: "Back to users"
          }
        }
      );
    },
    onError: () => {
      const rawErrors = getRawErrors(deleteForm.fetcher.data);
      const errKey = rawErrors?.general || "FAILED_TO_DELETE_USER";
      navigate(
        buildStatusUrl(
          {
            success: false,
            messageKey: errKey,
            returnTo: actionUrl,
            returnLabel: "Back to user"
          },
          "/admin/status"
        ),
        {
          state: {
            success: false,
            key: errKey,
            returnTo: actionUrl,
            returnLabel: "Back to user"
          }
        }
      );
    }
  });

  const banForm = useSubmitAction<{
    userId: string;
    emailsBanned: string[];
    general?: string;
  }>({
    action: actionUrl,
    onSuccess: () => {
      navigate(
        buildStatusUrl(
          {
            success: true,
            messageKey: "USER_BANNED_SUCCESSFULLY",
            returnTo: usersListUrl,
            returnLabel: "Back to users"
          },
          "/admin/status"
        ),
        {
          state: {
            success: true,
            key: "USER_BANNED_SUCCESSFULLY",
            returnTo: usersListUrl,
            returnLabel: "Back to users"
          }
        }
      );
    },
    onError: () => {
      const rawErrors = getRawErrors(banForm.fetcher.data);
      const errKey = rawErrors?.general || "FAILED_TO_BAN_USER";
      navigate(
        buildStatusUrl(
          {
            success: false,
            messageKey: errKey,
            returnTo: actionUrl,
            returnLabel: "Back to user"
          },
          "/admin/status"
        ),
        {
          state: {
            success: false,
            key: errKey,
            returnTo: actionUrl,
            returnLabel: "Back to user"
          }
        }
      );
    }
  });

  const handleAdminToggle = (checked: boolean) => {
    setPendingRight({ key: "admin", value: checked });
    setShowRightsDialog(true);
  };

  const handleRightsConfirm = () => {
    if (!pendingRight) return;
    rightsForm.submit(
      createTypedSubmit("grant-rights", {
        [pendingRight.key]: String(pendingRight.value)
      })
    );
    setShowRightsDialog(false);
    setPendingRight(null);
  };

  const handleRightsCancel = () => {
    setShowRightsDialog(false);
    setPendingRight(null);
  };

  const handleDeleteConfirm = () => {
    deleteForm.submit(createTypedSubmit("delete-user"));
    setShowDeleteDialog(false);
  };

  const handleBanConfirm = () => {
    banForm.submit(createTypedSubmit("ban-user", { reason: banReason.trim() }));
    setShowBanDialog(false);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <Link
        to={usersListUrl}
        className="inline-flex items-center self-start gap-1 text-on-surface-variant text-sm"
      >
        <Icon.ArrowLeft size="sm" />
        Back to users
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="m-0 font-header font-semibold text-3xl text-on-surface">{user.user_name}</h1>
        <span className="text-on-surface-variant text-sm">@{user.user_namespace}</span>
      </header>

      <section className="flex flex-col gap-2 p-3 bg-elevation-1 border border-outline-variant/50 rounded-lg">
        <h2 className="m-0 font-header font-semibold text-on-surface text-xl">Profile</h2>
        <dl className="desktop:grid-cols-2 grid grid-cols-1 gap-2 text-sm">
          <DetailRow label="User ID" value={user.user_id} mono />
          <DetailRow label="Email" value={user.login_email ?? "—"} />
          <DetailRow label="Status" value={<StatusChip status={user.user_status} />} />
          <DetailRow
            label="Verified"
            value={user.user_verified ? <Icon.Check size="sm" /> : "No"}
          />
          <DetailRow label="Created" value={formatDate(user.user_created_on)} />
        </dl>
      </section>

      <section className="flex flex-col gap-2 p-3 bg-elevation-1 border border-outline-variant/50 rounded-lg">
        <h2 className="m-0 font-header font-semibold text-on-surface text-xl">Rights</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-on-surface">Administrator</span>
              <span className="text-on-surface-variant text-sm">Full admin panel access</span>
            </div>
            <Switch
              checked={user.rights.user_admin}
              onCheckedChange={handleAdminToggle}
              disabled={rightsForm.isSubmitting}
            />
          </div>
        </div>
      </section>

      <Dialog open={showRightsDialog} onOpenChange={setShowRightsDialog}>
        <ConfirmDialog
          title={
            pendingRight
              ? `${pendingRight.value ? "Grant" : "Revoke"} administrator rights?`
              : "Update rights?"
          }
          message={`This will ${pendingRight?.value ? "grant" : "revoke"} the administrator permission for ${user.user_name}.`}
          onConfirm={handleRightsConfirm}
          isLoading={rightsForm.isSubmitting}
          onCancel={handleRightsCancel}
          confirmText="Confirm"
        />
      </Dialog>

      <section className="flex flex-col gap-3 p-3 bg-error-container/10 border border-error/30 rounded-lg">
        <h2 className="m-0 font-header font-semibold text-error text-xl">Danger zone</h2>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-on-surface">Delete user</span>
            <span className="text-on-surface-variant text-sm">
              Permanently removes the account and all its data.
            </span>
          </div>
          <Button
            variant="error"
            onClick={() => setShowDeleteDialog(true)}
            state="default"
            Icon={<Icon.Trash />}
          >
            Delete
          </Button>
        </div>
        <div className="h-px bg-error/20" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-on-surface">Ban user</span>
            <span className="text-on-surface-variant text-sm">
              Blocks the account and bans the associated email from future registration.
            </span>
          </div>
          <Button
            variant="error"
            onClick={() => setShowBanDialog(true)}
            state="default"
            Icon={<Icon.Ban />}
          >
            Ban user
          </Button>
        </div>
      </section>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmDialog
          title={`Delete ${user.user_name}?`}
          message="This permanently deletes the user and all associated data. This action cannot be undone."
          onConfirm={handleDeleteConfirm}
          isLoading={deleteForm.isSubmitting}
          onCancel={() => setShowDeleteDialog(false)}
          confirmText="Delete permanently"
        />
      </Dialog>

      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <ConfirmDialog
          title={`Ban ${user.user_name}?`}
          message="This blocks the account and bans the associated email address from future registration."
          onConfirm={handleBanConfirm}
          isLoading={banForm.isSubmitting}
          onCancel={() => setShowBanDialog(false)}
          confirmText="Ban account"
        >
          <div className="p-2.5 bg-elevation-1 border border-outline-variant/50 rounded-md text-sm">
            <span className="font-medium text-on-surface">Email(s) to be banned:</span>
            <ul className="mt-1 font-mono text-on-surface-variant list-disc list-inside">
              {user.login_email && <li>{user.login_email}</li>}
              {!user.login_email && <li>No email attached</li>}
            </ul>
          </div>

          <TextField
            label="Reason (optional)"
            placeholder="e.g. Terms of service violation, spam"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
        </ConfirmDialog>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Route Helpers (Components specific to route)
// ──────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
  confirmText = "Confirm",
  children
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  confirmText?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-72 p-2">
      <header className="flex flex-col gap-1">
        <h3 className="m-0 font-header font-semibold text-on-surface text-xl">{title}</h3>
        <p className="m-0 text-on-surface-variant text-sm">{message}</p>
      </header>
      {children}
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="error"
          onClick={onConfirm}
          state={isLoading ? "loading" : "default"}
          disabled={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-on-surface-variant text-sm">{label}</dt>
      <dd className={`m-0 text-on-surface ${mono ? "font-mono text-sm break-all" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const variant: React.ComponentProps<typeof Chip>["variant"] =
    status === "active" ? "success" : status === "banned" ? "error" : "assist";
  return (
    <Chip size="sm" variant={variant}>
      {status}
    </Chip>
  );
}
