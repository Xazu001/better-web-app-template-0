import { data } from "react-router";

import { createRouteService, dataMethod, type RouteLoaderArgs } from "$/lib/decorators";
import { renderMarkdown } from "$/lib/markdown";
import { BaseService } from "$/services/base";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @dataMethod()
  async getDocsData() {
    const response = await this.env.ASSETS.fetch(new URL("/docs/example.md", this.request.url));

    if (!response.ok) {
      this.throw(this.responses.getNotFound("DOCUMENT_NOT_FOUND"));
    }

    const html = renderMarkdown(await response.text());

    return this.ok({ html });
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  return data(await route.getDocsData());
}
