---
name: refr-module
description: Refactor current file(s) to comply with project rules while preserving behavior. Reads relevant rule files automatically.
argument-hint: [file or description]
---

# Refactor Module

Refactor the current file or selected open files to comply with project rules. Behavior must not change.

## Steps

1. **Read `.agents/rules/README.md`** to find relevant rules for the file(s) being refactored.

2. **Match file to rules:**

| File pattern                 | Rules to read                                                |
| ---------------------------- | ------------------------------------------------------------ |
| `server/**/*.ts`             | `server.md`, `aliases.md`, `README.md` § "Key rules summary" |
| `app/routes/**/*.server.tsx` | `routes.md`, `server.md`, `aliases.md`                       |
| `app/routes/**/*.tsx`        | `routes.md`, `components.md`, `aliases.md`                   |
| `app/components/**/*.tsx`    | `components.md`, `tokens.md`, `aliases.md`                   |
| `app/lib/**/*.ts(x)`         | `aliases.md`, `naming.md`                                    |
| `shared/**/*.ts`             | `aliases.md`, `naming.md`                                    |
| `**/*.css`                   | `styling.md`, `tokens.md`                                    |

3. **Apply rules** — fix imports, structure, naming, comments, response systems, cascade layers, etc.

4. **Verify** — behavior unchanged, no server imports in client files, all tokens valid:

   ```bash
   pnpm typecheck && pnpm lint && pnpm test
   ```
