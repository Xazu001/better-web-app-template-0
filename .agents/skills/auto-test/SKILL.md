---
name: auto-test
description: Run the app, check terminal for build/runtime/server errors, and fix them.
---

# Auto Test (Terminal)

Run the app and check terminal output for errors — no browser involved. Focuses on build, runtime, and server-side issues.

## Steps

1. **Start the dev server** — run `pnpm dev:local` in the background
2. **Watch terminal output** — wait for the server to start and check for:
   - Build/compilation errors (TypeScript, Vite, bundler)
   - Runtime errors (module not found, import failures, SSR crashes)
   - Server-side errors (API routes, database queries, middleware)
   - Deprecation warnings or missing polyfills
3. **If errors found** — read the relevant source files, fix the root cause, restart and re-check
4. **Repeat** until terminal output is clean (no errors, no warnings worth fixing)
