import { data } from "react-router";

import { createRouteService, dataMethod, type RouteLoaderArgs } from "$/lib/decorators";
import { BaseService } from "$/services/base";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async getHomeData() {
    const user = await this.auth.getUserFromRequest();

    return this.ok({ user });
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.getHomeData());
}
