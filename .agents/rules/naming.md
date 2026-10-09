# Naming — rule

> Symbol naming (BEM, CSS custom props, tokens, `@utility`) → README § Naming. This file is the single source of truth for **file and directory names**.

## Files and directories

**Everything is `kebab-case`** — every file and directory in `app/`, `server/`, `shared/`. No `camelCase`, `PascalCase`, or `snake_case` file names — even when the exported symbol is `PascalCase` (component, context) or `camelCase` (hook, store). The file name describes the module, not the symbol inside it.

| What | Pattern | Example |
| --- | --- | --- |
| Hook | `use-{name}.ts` | `use-ripple.ts`, `use-breakpoint.ts` |
| Context | `{name}-context.tsx` | `pad-context.tsx`, `panel-context.tsx` |
| Store | `{name}.ts` | `item-edit.ts`, `search.ts` |
| Component | `{name}.tsx` | `nav-aside.tsx`, `two-factor-setup-modal.tsx` |
| Util / lib module | `{name}.ts` | `time-utils.ts`, `validator.ts` |
| Barrel | `index.ts` | `hooks/index.ts`, `utils/index.ts` |
| Co-located styles | `{name}.css` matching companion file | `use-floating-label.css` ↔ `use-floating-label.ts` |
| Route files | `{segment}.{type}.tsx` (dots) | `users.$userId.tsx`, `admin/users.tsx`, `home.tsx` |

## Rules

- `useRipple` lives in `use-ripple.ts`; `ToastContainer` in `toast.tsx`. Renaming a file never changes the exported identifiers — they stay `camelCase`/`PascalCase`.
- Dots in file names are reserved for semantic suffixes: environment types (`*.client.tsx` in `app/components/pages/**`, `*.server.tsx` in routes), route params (`$id`), co-located `.css`, generated `+types`.
- Directories are also `kebab-case`: `router/`, `seo/`, `admin/`.
- When renaming a file, update every path reference (imports, exports, `.css` side-effect imports) **and** doc mentions — symbol references in prose stay as-is.

## Exceptions

- `shared/locales/en_server_errors.json` — `snake_case` by design: flat key→message contract resolved by `getMessageByKey`. Do NOT rename. → `localization.md`
- Generated/toolchain files keep their required names (`+types/*`, `worker-configuration.d.ts`, configs like `stylelint.config.js`).

## Enforcement

```bash
# Non-kebab file names in the main trio (excluding allowed dots/suffixes):
find app server shared -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) \
  | grep -E "[A-Z_]"
```

Should print nothing.
