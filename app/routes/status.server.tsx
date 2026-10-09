import { data } from "react-router";

import { createRouteService, dataMethod, type RouteLoaderArgs } from "$/lib/decorators";
import { BaseService } from "$/services/base";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async getStatus() {
    const url = new URL(this.request.url);
    const successParam = url.searchParams.get("success");
    const success = successParam !== null ? successParam === "true" || successParam === "1" : null;
    const key = url.searchParams.get("key") || null;
    const returnTo = url.searchParams.get("returnTo") || null;
    const returnLabel = url.searchParams.get("returnLabel") || null;
    const title = url.searchParams.get("title") || null;
    const description = url.searchParams.get("description") || null;

    return this.ok({
      success,
      key,
      returnTo,
      returnLabel,
      title,
      description
    });
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.getStatus());
}
