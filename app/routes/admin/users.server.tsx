import { data } from "react-router";

import { createRouteService, dataMethod, type RouteLoaderArgs } from "$/lib/decorators";
import { BaseService } from "$/services/base";
import { USERS_PAGE_SIZE } from "@/constants";

import type { UserStatusType } from "@/enums";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async listUsers() {
    const url = new URL(this.request.url);
    const search = url.searchParams.get("q")?.trim() || null;
    const status = (url.searchParams.get("status") as UserStatusType | null) || null;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const sortParam = url.searchParams.get("sort");
    const sort = sortParam === "asc" || sortParam === "desc" ? sortParam : null;

    const limit = USERS_PAGE_SIZE;
    const offset = (page - 1) * limit;

    return this.ok(
      await this.admin.getUsers({
        search: search ?? undefined,
        status: status ?? undefined,
        sort: sort ?? undefined,
        limit,
        offset
      })
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.listUsers());
}
