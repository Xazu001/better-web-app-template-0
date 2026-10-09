import { data } from "react-router";

import { createRouteService, dataMethod, type RouteLoaderArgs } from "$/lib/decorators";
import { BaseService } from "$/services/base";

import type { AdminStats } from "$/services/admin";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async getDashboard() {
    return this.ok(await this.admin.getStats());
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.getDashboard());
}

export type DashboardData = AdminStats;
