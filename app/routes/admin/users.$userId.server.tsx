import { data, redirect } from "react-router";

import {
  createRouteService,
  dataMethod,
  actionMethod,
  type RouteActionArgs,
  type RouteLoaderArgs
} from "$/lib/decorators";
import { BaseService } from "$/services/base";
import { buildStatusUrl } from "@/utils";
import { parseTypedSubmit } from "@/utils/typed-submit";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async getUser(userId: string) {
    return this.ok(await this.admin.getUserDetail(userId));
  }

  @actionMethod({ general: "FAILED_TO_UPDATE_USER_RIGHTS" })
  async updateRights(userId: string, data: Record<string, unknown>) {
    const admin = data.admin === "true" || data.admin === "1";

    return this.admin.grantRights(userId, {
      admin: data.admin !== undefined ? admin : undefined
    });
  }

  @actionMethod({ general: "FAILED_TO_DELETE_USER" })
  async removeUser(userId: string) {
    return this.admin.deleteUser(userId);
  }

  @actionMethod({ general: "FAILED_TO_BAN_USER" })
  async banUser(userId: string, reason?: string) {
    return this.admin.banUser(userId, reason);
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request, params }: RouteLoaderArgs) {
  const userId = params.userId;
  if (!userId) throw redirect("/admin/users");

  const route = createRouteService(RouteService, context, request);
  try {
    return data(await route.getUser(userId));
  } catch {
    throw redirect(
      buildStatusUrl(
        {
          success: false,
          messageKey: "USER_NOT_FOUND",
          returnTo: `/admin/users${new URL(request.url).search}`,
          returnLabel: "Back to users"
        },
        "/admin/status"
      )
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Route Action
// ──────────────────────────────────────────────────────────────

export async function action({ context, request, params }: RouteActionArgs) {
  const userId = params.userId;
  if (!userId) return data({ success: false, errors: { general: "Missing user id" } });

  const route = createRouteService(RouteService, context, request);
  const result = await parseTypedSubmit(request);

  if (!result) {
    return data(route.formError({ general: "Invalid action" }));
  }

  const rl = await route.rateLimitForm({ time: 2.5, scope: result.type });
  if (rl.isError) return data(rl.getError());

  const usersListUrl = `/admin/users${new URL(request.url).search}`;

  switch (result.type) {
    case "grant-rights": {
      return data(await route.updateRights(userId, result.data));
    }
    case "delete-user": {
      const res = await route.removeUser(userId);
      if (!res.success) {
        return data(res);
      }
      return redirect(
        buildStatusUrl(
          {
            success: true,
            messageKey: "USER_DELETED_SUCCESSFULLY",
            returnTo: usersListUrl,
            returnLabel: "Back to users"
          },
          "/admin/status"
        )
      );
    }
    case "ban-user": {
      const reason = typeof result.data?.reason === "string" ? result.data.reason : undefined;
      const res = await route.banUser(userId, reason);
      if (!res.success) {
        return data(res);
      }
      return redirect(
        buildStatusUrl(
          {
            success: true,
            messageKey: "USER_BANNED_SUCCESSFULLY",
            returnTo: usersListUrl,
            returnLabel: "Back to users"
          },
          "/admin/status"
        )
      );
    }
    default:
      return data(route.formError({ general: "Unknown action" }));
  }
}
