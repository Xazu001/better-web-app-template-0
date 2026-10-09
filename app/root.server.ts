import { data } from "react-router";

import { getTheme } from "$/lib/cookies";
import { createRouteService, dataMethod } from "$/lib/decorators";
import { BaseService } from "$/services/base";

import type { Route } from "./+types/root";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async getRootData() {
    const user = await this.auth.getUserFromRequest();
    const theme = await getTheme(this.request);
    const origin = new URL(this.request.url).origin;

    return this.ok({ user, theme, origin });
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request }: Route.LoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  const result = await route.getRootData();

  return data(result);
}

export { RouteService };
