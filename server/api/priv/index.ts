import { Hono } from "hono";

import { privMiddleware } from "../../middleware/priv";

import type { Services } from "$/core";
import type { Env } from "../../setup";

const priv = new Hono<{
  Bindings: Env & { PRIV_API_KEY: string };
  Variables: { services: Services };
}>();

priv.use("*", privMiddleware);

export default priv;
