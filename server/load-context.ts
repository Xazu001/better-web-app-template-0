import { createContext } from "react-router";

import type { Services } from "$/core";

export interface CloudflareContextValue {
  env: Env;
  ctx: ExecutionContext;
  ASSETS: Fetcher;
}

export const cloudflareContext = createContext<CloudflareContextValue>();
export const servicesContext = createContext<Services>();

declare global {
  interface Env {
    APP_URL?: string;
    JWT_PRIVATE_KEY: string;
    JWT_PUBLIC_KEY: string;
  }

  namespace Cloudflare {
    interface Env {
      APP_URL?: string;
      JWT_PRIVATE_KEY: string;
      JWT_PUBLIC_KEY: string;
    }
  }
}
