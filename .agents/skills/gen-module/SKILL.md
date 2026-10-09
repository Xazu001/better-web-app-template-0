---
name: gen-module
description: Generate any module (route, component, service, hook, store, API endpoint) following all project rules. Read .agents/rules/README.md first.
argument-hint: <description of what to create>
---

# Generate Module

Generate any module based on the description provided. Infer what needs to be created from context.

## Steps

1. **Identify what to create** from the description:

| What you're building        | Location                                | Rules to read                |
| --------------------------- | --------------------------------------- | ---------------------------- |
| Route (page)                | `app/routes/*/`                         | `routes.md`, `server.md`     |
| UI component (primitive)    | `app/components/ui/`                    | `components.md`, `tokens.md` |
| Custom component (business) | `app/components/custom/`                | `components.md`, `tokens.md` |
| Server service              | `server/services/`                      | `server.md`                  |
| API endpoint                | `server/api/`                           | `server.md`                  |
| Hook                        | `app/lib/hooks/`                        | `naming.md`                  |
| Shared util / validator     | `shared/utils/` or `shared/validators/` | `naming.md`                  |
| Queue / cron handler        | `server/cloudflare/`                    | `server.md`                  |

2. **Read the relevant rules** from `.agents/rules/` — always include `aliases.md` for imports. Comment rules: `README.md` § "Key rules summary".

3. **Generate all needed files:**
   - Route with data → `route.tsx` + `route.server.tsx` + `route.css`
   - Route without data (static) → single `route.tsx` + `route.css`
   - Component → `component.tsx` + `component.css`
   - Service → `service.ts`

   > **Style files** — ALWAYS `.css` (Tailwind v4 `@apply` works natively in `.css` via `@tailwindcss/vite`), e.g. `index.about.css`. → `styling.md`

4. **Register if needed:**
   - New route → add to `app/routes.ts`
   - New service → add to `server/services/index.ts` and `server/core/types.ts`

5. **Follow all rules** from the read rule files — structure, naming, imports, layers, comments.
