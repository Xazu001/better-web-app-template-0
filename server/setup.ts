import { Hono } from "hono";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

import { AdminService, AuthService, PreferencesService, UserService } from "$/services";
import { type KeyPair, getKeyPair } from "$/services/auth";

import api from "./api";

import type { Database, Services } from "$/core";
import type { Tables } from "$/database/tables";
import type { ServiceContainer } from "$/services/base";

function wireServices(container: ServiceContainer, env: Env): void {
  const factory = () => container;
  Object.values(container).forEach((service) => {
    service.setServices(factory);
    service.initializeManagers(env);
  });
}

// Workers reuse V8 isolates — cache DB and KeyPair
let _cachedDb: Database | null = null;
let _cachedKeyPair: KeyPair | null = null;

/**
 * Returns fresh service container per request (with module-level cache for database and keypair).
 *
 * Cron/queue contexts have no HTTP request — the default synthetic request
 * is a sentinel that is never read on those code paths.
 */
export async function createServices(
  env: Env,
  request: Request = new Request("http://localhost")
): Promise<Services> {
  if (!_cachedDb) {
    _cachedDb = {
      op: new Kysely<Tables>({
        dialect: new D1Dialect({ database: env.db })
      }),
      cf: env.db
    };
  }
  const db = _cachedDb;

  if (!_cachedKeyPair) {
    _cachedKeyPair = await getKeyPair(
      "RS256",
      env.JWT_PRIVATE_KEY,
      env.JWT_PUBLIC_KEY,
      "2025-01-04-v1"
    );
  }
  const keyPair = _cachedKeyPair;

  const authService = new AuthService(request, db, keyPair);
  const userService = new UserService(request, db);
  const adminService = new AdminService(request, db);
  const preferencesService = new PreferencesService(request, db);

  const container: ServiceContainer = {
    admin: adminService,
    auth: authService,
    user: userService,
    preferences: preferencesService
  };

  wireServices(container, env);

  const services: Services = {
    admin: adminService,
    auth: authService,
    base: authService,
    user: userService,
    preferences: preferencesService
  };

  return services;
}

export type Env = Cloudflare.Env;

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: { services: Services } }>();

  app.use(async (c, next) => {
    const services = await createServices(c.env, c.req.raw);
    c.set("services", services);

    await next();
  });

  app.route("/api", api);

  app.onError(async (err, c) => {
    const isResponse =
      err instanceof Response ||
      (err &&
        typeof err === "object" &&
        "status" in err &&
        "headers" in err &&
        typeof (err as any).clone === "function");

    if (isResponse) {
      return err as Response;
    }

    console.error("[Server Error]:", err);
    return c.text("Internal Server Error", 500);
  });

  return app;
}
