import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#": path.resolve(import.meta.dirname, "./app"),
      $: path.resolve(import.meta.dirname, "./server"),
      "@": path.resolve(import.meta.dirname, "./shared")
    }
  },
  define: {
    __IS_DEV__: "true",
    __APP_ENV__: '"local"',
    __CLOUDFLARE_ENV__: '"dev"',
    __DEV_SERVER__: "false"
  },
  test: {
    environment: "jsdom",
    // Unit tests only. The Playwright suite (test/routes/*.e2e.test.ts) boots the dev server and
    // is run separately via `pnpm test:e2e`.
    include: ["test/unit/**/*.test.ts"],
    restoreMocks: true
  }
});
