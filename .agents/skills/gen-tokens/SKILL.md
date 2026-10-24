---
name: gen-tokens
description: Regenerate .agents/rules/tokens.md by scanning Tailwind v4 @theme/@theme inline/@custom-media + :root fluid vars + @utility definitions from app/styles/*.css.
---

# Generate Tokens + Utilities Documentation

Regenerate `.agents/rules/tokens.md` from the current token/utility definitions in `app/styles/`.

## Scope

Tokens and utilities live exclusively in `app/styles/`:

| What                                                                                                                                                                      | File                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `@theme` config (colors, breakpoints, spacing, font families)                                                                                                              | `app/styles/theme.css`            |
| `@theme` glass variants                                                                                                                                                   | `app/styles/utilities/colors.css` |
| `@theme` design tokens (font weights, radius, shadow, z-index, size-\*, motion, leading, tracking)                                                                        | `app/styles/utilities/tokens.css` |
| `@theme inline` (fluid typography mapping → `text-*` utility)                                                                                                             | `app/styles/theme.css`            |
| `:root` fluid vars (`--fluid-text-*`, `--x-*`, `--spacing-*`) + `@media` overrides                                                                                        | `app/styles/theme.css`            |
| `@custom-media --bp-*` (breakpoints)                                                                                                                                      | `app/styles/theme.css`            |
| `@layer base` (body / h1-h5 / .h0-h5 / strong defaults)                                                                                                                   | `app/styles/base/typography.css`  |
| `@layer components` (`.ripple__wave`) + keyframes (top-level)                                                                                                             | `app/styles/utilities/animations.css` |
| `@utility` layout (cont, px-site, p-site, pt-top-site, section-full-width, w-mod-unit-\*, min-w-mod-unit-\*, max-w-mod-unit-\*, basis-mod-unit-\*, grid-cols-mod-unit-\*) | `app/styles/utilities/layout.css` |
| `@utility` links (uix-link-muted, uix-link-muted-primary-underline, uix-nav-link)                                                                                                     | `app/styles/utilities/links.css`  |
| `@utility` ui (state-layer, uix-ripple, ui-ripple-surface, ui-state-layer, uix-elevation-1-bordered)                                                                           | `app/styles/utilities/ui.css`    |
| `@utility` form (input-x-_, input-h-_, input-label, input-label-margin-_, input-label-gap-_)                                                                              | `app/styles/utilities/form.css`   |
| `@utility` theme (`html.light` light-palette overrides)                                                                                                                   | `app/styles/utilities/theme.css`  |
| `@layer reset` (box-sizing, margin reset, form typography, button/input reset, links/lists)                                                                               | `app/styles/base/reset.css`       |
| `@layer base` (MD3 scrollbar — Firefox + WebKit, `.no-scrollbar`)                                                                                                         | `app/styles/base/scrollbar.css`   |
| `@layer overrides` (react-toastify theme override)                                                                                                                        | `app/styles/base/toastify.css`    |

> **No UI component variants** — component props (CVA variants, size, BEM classes `ui-*`) are read directly from `app/components/ui/*.tsx` and `*.css`. Do not duplicate them in `tokens.md`.

## Steps

1. Read `app/styles/theme.css` + `app/styles/utilities/colors.css` + `app/styles/utilities/tokens.css` + `app/styles/utilities/animations.css` + `app/styles/base/typography.css` — extract every `--*` token from `@theme {}`, `@theme inline {}`, `:root {}`, `@custom-media --bp-*`, plus `@layer base` defaults, `@layer components` (`.ripple__wave`), keyframes (top-level). Then read `app/styles/utilities/*.css` and `app/styles/base/*.css` per the scope table.
2. Overwrite `.agents/rules/tokens.md` with **only raw token keys + utility names + values** — no descriptions, no explanations, no prose. Sections separated by blank lines. Use tables or plain lists. Keep the file header (source pointers, Themes note, cross-links) and the `## Contents` table up to date.

## Output format (sections in `tokens.md`)

1. **General Rules** — invariants (OKLCH only, no ad-hoc tokens, size tokens in rem, breakpoint names).
2. **Colors (OKLCH) — MD3 Roles** — table: `--color-*` | Tailwind utility | OKLCH value. Light-theme overrides from `theme.css` as a subsection.
3. **Typography (fluid `clamp()`)** — `:root` `--fluid-text-*` + `@theme inline` mapping + fonts (`@theme`) + `@layer base` heading defaults + `@media (--bp-huge)` freeze.
4. **Component Size Tokens (rem)** — `--size-*` → `size-*` / `h-*` / `w-*` utilities (with `--height-*` / `--width-*` mirrors) in a table per component (sm/md/lg/xl).
5. **Motion (MD3)** — `--ease-*` (easings) + `--duration-*` (durations).
6. **Line height / Letter spacing / Radius / Z-index / Shadows / Spacing** — from `@theme`, with the utility names they generate.
7. **w-mod-unit (layout grid)** — `:root` vars (`--x-*`, `--spacing-*`) with `@media` overrides + `@utility` utils from `layout.css` in a table with definitions.
8. **Unit scale** — `--container-unit-*` → `w-unit-*` / `min-w-unit-*` / `max-w-unit-*`.
9. **Breakpoints** — `@theme --breakpoint-*` ↔ `@custom-media --bp-*` ↔ Tailwind variants (`phone:` … `huge:`) in a table.
10. **Custom `@utility`** — per-file tables from `utilities/*.css`.
11. **`@layer components` + keyframes** — shared shells + keyframes.

## Don't

- ❌ Generate prose/descriptions — only raw tokens + utilities + values in tables/lists.
- ❌ Extract UI component variants / BEM `ui-*` classes / CVA props from `app/components/ui/*` — agents read them directly from the component files.
- ❌ Skip `@utility` from `utilities/*.css` — they are utility tokens (used in TSX and `@apply`).
- ❌ Skip `@theme inline` — fluid typography requires `inline` (static `@theme` doesn't accept `clamp()`).
- ❌ Skip `:root` `@media` overrides (`--spacing-x-site`, `--spacing-top-site`, `--fluid-text-*` freeze at `--bp-huge`).
- ❌ Write to any path other than `.agents/rules/tokens.md`.
