/// <reference types="vite/client" />

// Build-time constants injected by Vite `define` (vite.config.ts)
declare const __IS_DEV__: boolean;
declare const __APP_ENV__: "local" | "dev" | "prod";
declare const __CLOUDFLARE_ENV__: "local" | "dev" | "prod";
declare const __LOCAL_BINDINGS__: boolean;

declare module "*.css?url" {
  const content: string;
  export default content;
}
