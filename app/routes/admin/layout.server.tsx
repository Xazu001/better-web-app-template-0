import { data, redirect } from "react-router";

import { createRouteService, dataMethod, type RouteLoaderArgs } from "$/lib/decorators";
import { BaseService } from "$/services/base";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async requireAdmin() {
    const user = await this.auth.getUserFromRequest();

    if (!user) {
      const url = new URL(this.request.url);
      throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`, {
        headers: {
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }

    if (user.user_admin !== 1) {
      this.throw(this.responses.getNoAccess("ADMIN_ACCESS_REQUIRED"));
    }

    return this.ok({
      userName: user.user_name,
      userId: user.user_id,
      userNamespace: user.user_namespace,
      userAvatarSource: user.user_avatar_source
    });
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.requireAdmin());
}
