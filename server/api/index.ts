import { Hono } from "hono";

import { APP_ENV } from "@/constants";

import devApi from "./dev";
import mailPreviews from "./mail-previews";
import privApi from "./priv";

import type { Services } from "$/core";
import type { Env } from "../setup";

declare const __DEV_SERVER__: boolean;
declare const __LOCAL_BINDINGS__: boolean;

const api = new Hono<{ Bindings: Env; Variables: { services: Services } }>();

api.route("/priv", privApi);

// Dev-server-only tooling — e.g. /api/_dev/cron can run every cron handler,
// including destructive cleanups. __DEV_SERVER__ (vite `command === "serve"`)
// is false in every `react-router build`, so these routes are tree-shaken out
if (__DEV_SERVER__) {
  api.route("/mail-previews", mailPreviews);
}
if (__DEV_SERVER__ && __LOCAL_BINDINGS__ && APP_ENV === "local") {
  api.route("/_dev", devApi);
}

export default api;
