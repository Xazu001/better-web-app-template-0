import { cloudflareContext, servicesContext } from "$/load-context";
import { type BaseService, type ServiceContainer } from "$/services/base";

import type { Services } from "$/core";
import type { ActionFunctionArgs, LoaderFunctionArgs, RouterContextProvider } from "react-router";

export interface RouteServiceContext {
  services: Services;
  cloudflare?: {
    env: Env;
    ctx: ExecutionContext;
    ASSETS: Fetcher;
  };
}

type RouteContext = Readonly<RouterContextProvider>;

export type RouteLoaderArgs = Omit<LoaderFunctionArgs, "context"> & {
  context: RouteContext;
};
export type RouteActionArgs = Omit<ActionFunctionArgs, "context"> & {
  context: RouteContext;
};

export function createRouteService<T extends typeof BaseService>(
  ServiceClass: T,
  context: RouteContext,
  request: Request
): InstanceType<T> {
  const services = context.get(servicesContext);
  const cloudflare = context.get(cloudflareContext);
  const service = new ServiceClass(request, services.base.db) as InstanceType<T>;

  const container: ServiceContainer = {
    admin: services.admin,
    auth: services.auth,
    user: services.user,
    preferences: services.preferences
  };

  service.setServices(() => container);

  if (cloudflare?.env) {
    service.initializeManagers(cloudflare.env);
  }

  return service;
}
