import path from "path";

import { cloudflare, type WorkerConfig } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { resolveSecretsRequired } from "./scripts/lib/dev-vars.ts";
import { resolveCloudflareEnv } from "./vite-preflight.ts";

type AppEnv = "local" | "dev" | "prod";

// Type for Vite's WebSocket error data
interface WSErrorData {
  err?: Error;
  message?: string;
  [key: string]: any;
}

export default defineConfig(({ command }) => {
  const cloudflareEnv = resolveCloudflareEnv(command);
  const appEnv: AppEnv = command === "serve" ? "local" : cloudflareEnv;
  const isDevEnv = command === "serve";

  const localBindings = command === "serve" && cloudflareEnv === "local";

  process.env.CLOUDFLARE_ENV = cloudflareEnv === "local" ? "" : cloudflareEnv;

  return {
    define: {
      // Build/runtime constants injected by Vite
      __IS_DEV__: JSON.stringify(isDevEnv),
      __APP_ENV__: JSON.stringify(appEnv),
      __CLOUDFLARE_ENV__: JSON.stringify(cloudflareEnv),
      __DEV_SERVER__: JSON.stringify(command === "serve"),
      __LOCAL_BINDINGS__: JSON.stringify(localBindings)
    },
    plugins: [
      tailwindcss(),
      cloudflare({
        viteEnvironment: { name: "ssr" },
        remoteBindings: cloudflareEnv !== "local",
        config:
          command === "serve"
            ? (workerConfig: WorkerConfig) => {
                workerConfig.secrets = {
                  required: resolveSecretsRequired({ env: cloudflareEnv })
                };
              }
            : undefined
      }),
      reactRouter(),
      ...(command === "build" && appEnv === "prod"
        ? [
            babel({
              include: /\.[jt]sx$/,
              exclude: [/node_modules/, /\.server\.[jt]sx?$/],
              presets: ["@babel/preset-typescript", "@babel/preset-react"],
              plugins: ["babel-plugin-react-compiler"]
            })
          ]
        : [])
    ],
    // nodejs_compat in wrangler config zapewnia kompatybilność z modułami Node.js
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true
      },
      watch: {
        // Watch for CSS file changes more aggressively
        usePolling: false,
        ignored: [
          "**/.git/**",
          "**/node_modules/**",
          "**/.agents/**",
          "**/.react-router/**",
          "**/.build/**",
          "**/.vite/**",
          "**/scripts/**",
          "**/playwright-report/**",
          "**/test-results/**",
          "**/coverage/**"
        ]
      },
      // Add better headers for cache control
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    },
    resolve: {
      alias: {
        "#": path.resolve(import.meta.dirname, "./app"),
        $: path.resolve(import.meta.dirname, "./server"),
        "@": path.resolve(import.meta.dirname, "./shared")
      },
      tsconfigPaths: true
    },
    css: {
      devSourcemap: false,
      // Disable CSS modules for better HMR with regular CSS
      modules: false
    },
    optimizeDeps: {
      include: [
        "react-router",
        "react",
        "react-dom",
        "react-toastify",
        "class-variance-authority",
        "clsx",
        "lucide-react",
        "zod"
      ],
      // Exclude problematic dependencies from pre-bundling
      exclude: []
    },
    // Better handling for TypeScript files in scripts
    oxc: {
      target: "esnext"
    },
    build: {
      cssMinify: "lightningcss",
      cssCodeSplit: false,
      modulePreload: {
        polyfill: false
      },
      rollupOptions: {
        output: {
          // Split the monolithic vendor chunk into logical pieces.
          codeSplitting: {
            groups: [
              {
                name: "vendor-hono",
                test: /node_modules[\\/]\.pnpm[\\/]hono@|node_modules[\\/]\.pnpm[\\/]@hono\+/,
                priority: 5
              },
              {
                name: "vendor-react-dom",
                test: /node_modules[\\/]\.pnpm[\\/]react-dom@/,
                priority: 4
              },
              {
                name: "vendor-zod",
                test: /node_modules[\\/]\.pnpm[\\/]zod@/,
                priority: 4
              },
              {
                name: "vendor-icons",
                test: /node_modules[\\/]\.pnpm[\\/]lucide-react@/,
                priority: 3
              },
              {
                // Only reachable via dynamic import (toast facade) — must stay
                // its own async chunk so it never lands in the eager vendor
                // bundle or the SSR build.
                name: "vendor-toastify",
                test: /node_modules[\\/]\.pnpm[\\/]react-toastify@/,
                priority: 3
              },
              {
                name: "vendor",
                test: /node_modules/,
                priority: 1
              }
            ]
          }
        }
      }
    },
    // Experimental: Better error handling
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === "js") {
          return { js: `/${filename}` };
        } else {
          return { relative: true };
        }
      }
    }
  };
});
