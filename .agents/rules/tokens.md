# Design Tokens — rules for using tokens from `app/styles/`

> Source: `app/styles/tailwind.css` (`@theme`, `@theme inline`, `:root`, `@custom-media`, `@layer base/components/overrides`, keyframes) + `app/styles/base/*.css` (`@layer reset/base/custom/overrides`) + `app/styles/utilities/*.css` (`@utility`). The layer ordering declaration `@layer reset, base, components, custom, routes, overrides;` is in `app/styles/main.css` (line 1) and repeated in `app/root.tsx` as an inline `<style>`.
> **Themes:** dark palette is the `@theme` default; `html.light` re-declares `--color-*` with light values in `app/styles/utilities/theme.css`. Theme cookie: `light`/`dark`/`system` (`server/lib/cookies/cookies.ts`). MD3 concepts (color roles, elevation, state layer) → `md3-design.md`. CSS mechanics (`@layer`, `color-mix`, hover gating) → `styling.md`. Component implementation (CVA, BEM, size variants) → `components.md`.

## Contents

| Section                                                             | Covers                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| General Rules                                                       | token sources, OKLCH-only, size tokens in rem, breakpoint names     |
| Colors (OKLCH) — MD3 Roles                                          | surfaces, `on-*` pairs, primary/secondary/tertiary, states, glass   |
| Typography (fluid `clamp()`)                                        | fonts, fluid text scale, `@theme inline` mapping, heading defaults  |
| Component Size Tokens (rem)                                         | `--size-*` → `size-*` / `h-*` / `w-*` per component (sm/md/lg/xl)   |
| Motion (MD3)                                                        | `--ease-*`, `--duration-*`                                          |
| Line height / Letter spacing / Radius / Z-index / Shadows / Spacing | remaining `@theme` namespaces + generated utilities                 |
| w-mod-unit (layout grid)                                            | `--x-*`, `--spacing-*`, `@utility` layout utils                     |
| Unit scale                                                          | `--container-unit-*` → `w-unit-*` / `min-w-unit-*` / `max-w-unit-*` |
| Breakpoints                                                         | `phone:` … `huge:` ↔ `@custom-media --bp-*`                         |
| Custom `@utility`                                                   | per-file tables from `utilities/*.css`                              |
| `@layer components` + keyframes                                     | shared shells, `.ripple__wave`, keyframes                           |

## General Rules

- The single source of truth for tokens is `app/styles/tailwind.css`. Do not create new tokens ad-hoc in components; if a role is missing, add it in `@theme` in `tailwind.css`.
- Do not define static `*-hover`, `*-active`, `*-pressed`, `*-disabled` tokens — implement state layers via `color-mix()` in component CSS (see `styling.md` and the `@utility` section below). Exception: `--color-kit-play-primary-hover` is a runtime variable set from kit data.
- Colors must use only OKLCH (or `color-mix()` in OKLCH). No HEX/RGB/HSL in tokens.
- All percentage values in `color-mix()` are multiples of 5 (e.g. `30%`, `70%`, `20%`).
- Size tokens are in `rem`, not on the `--spacing` scale. For width+height use `size-*`; for height-only use `h-*`; for width-only use `w-*`.
- Project breakpoints are `phone`/`tablet`/`desktop`/`large-desktop`/`xlarge-desktop`/`2xlarge-desktop`/`huge` — NOT `sm`/`md`/`lg`/`xl`.

## Colors (OKLCH) — MD3 Roles

### Surfaces and `on-*` pairs

| Token                        | Tailwind utility          | Value                                                           | Usage                                   |
| ---------------------------- | ------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| `--color-surface`            | `bg-surface`              | `oklch(14% 0.019 274.6deg)`                                     | Application background, base surface.   |
| `--color-on-surface`         | `text-on-surface`         | `oklch(95% 0.005 250deg)`                                       | Text on `surface`.                      |
| `--color-on-surface-variant` | `text-on-surface-variant` | `color-mix(in oklch, var(--color-on-surface) 70%, transparent)` | Secondary text on `surface`.            |
| `--color-elevation-1`        | `bg-elevation-1`          | `oklch(23% 0.024 273.4deg)`                                     | Lighter elevation (cards, sections).    |
| `--color-on-elevation-1`     | `text-on-elevation-1`     | `oklch(93% 0.008 250deg)`                                       | Text on `elevation-1`.                  |
| `--color-elevation-2`        | `bg-elevation-2`          | `oklch(30% 0.024 273.4deg)`                                     | Stronger elevation.                     |
| `--color-on-elevation-2`     | `text-on-elevation-2`     | `oklch(92% 0.008 250deg)`                                       | Text on `elevation-2`.                  |
| `--color-popover`            | `bg-popover`              | `oklch(24.5% 0.024 273.4deg)`                                   | Surface for dialogs/toasts.             |
| `--color-on-popover`         | `text-on-popover`         | `oklch(92% 0.008 250deg)`                                       | Text on `popover`.                      |
| `--color-float`              | `bg-float`                | `oklch(26.5% 0.025 273.4deg)`                                   | Floating chrome (nav, select dropdown). |
| `--color-on-float`           | `text-on-float`           | `oklch(93% 0.008 250deg)`                                       | Text on `float`.                        |

### Primary / Secondary / Tertiary + containers

| Token                            | Tailwind utility              | Value                                                                   | Usage                          |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| `--color-primary`                | `bg-primary`                  | `oklch(81.1% 0.213 130.6deg)`                                           | Main CTA color (green).        |
| `--color-on-primary`             | `text-on-primary`             | `oklch(18% 0.01 260deg)`                                                | Text on `primary`.             |
| `--color-primary-container`      | `bg-primary-container`        | `color-mix(in oklch, var(--color-primary) 30%, var(--color-surface))`   | Subtle primary container.      |
| `--color-on-primary-container`   | `text-on-primary-container`   | `oklch(18% 0.01 260deg)`                                                | Text on `primary-container`.   |
| `--color-secondary`              | `bg-secondary`                | `oklch(80% 0.12 250deg)`                                                | Tonal secondary role.          |
| `--color-on-secondary`           | `text-on-secondary`           | `oklch(18% 0.01 250deg)`                                                | Text on `secondary`.           |
| `--color-secondary-container`    | `bg-secondary-container`      | `color-mix(in oklch, var(--color-secondary) 30%, var(--color-surface))` | Secondary container.           |
| `--color-on-secondary-container` | `text-on-secondary-container` | `oklch(18% 0.01 250deg)`                                                | Text on `secondary-container`. |
| `--color-tertiary`               | `bg-tertiary`                 | `oklch(78% 0.14 300deg)`                                                | Tonal tertiary role.           |
| `--color-on-tertiary`            | `text-on-tertiary`            | `oklch(18% 0.01 300deg)`                                                | Text on `tertiary`.            |
| `--color-tertiary-container`     | `bg-tertiary-container`       | `color-mix(in oklch, var(--color-tertiary) 30%, var(--color-surface))`  | Tertiary container.            |
| `--color-on-tertiary-container`  | `text-on-tertiary-container`  | `oklch(18% 0.01 300deg)`                                                | Text on `tertiary-container`.  |

### Error / Success / Warning / Info + containers

| Token                          | Tailwind utility            | Value                                                                 | Usage                        |
| ------------------------------ | --------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| `--color-error`                | `bg-error`                  | `oklch(60% 0.2 20deg)`                                                | Error / destructive state.   |
| `--color-on-error`             | `text-on-error`             | `oklch(95% 0.005 250deg)`                                             | Text on `error`.             |
| `--color-error-container`      | `bg-error-container`        | `color-mix(in oklch, var(--color-error) 30%, var(--color-surface))`   | Error container.             |
| `--color-on-error-container`   | `text-on-error-container`   | `oklch(95% 0.005 250deg)`                                             | Text on `error-container`.   |
| `--color-success`              | `bg-success`                | `oklch(70% 0.15 160deg)`                                              | Success state.               |
| `--color-on-success`           | `text-on-success`           | `oklch(5% 0.01 250deg)`                                               | Text on `success`.           |
| `--color-success-container`    | `bg-success-container`      | `color-mix(in oklch, var(--color-success) 30%, var(--color-surface))` | Success container.           |
| `--color-on-success-container` | `text-on-success-container` | `oklch(85% 0.13 160deg)`                                              | Text on `success-container`. |
| `--color-info`                 | `bg-info`                   | `oklch(65% 0.12 230deg)`                                              | Information state.           |
| `--color-on-info`              | `text-on-info`              | `oklch(95% 0.005 250deg)`                                             | Text on `info`.              |
| `--color-info-container`       | `bg-info-container`         | `color-mix(in oklch, var(--color-info) 30%, var(--color-surface))`    | Info container.              |
| `--color-on-info-container`    | `text-on-info-container`    | `oklch(95% 0.005 250deg)`                                             | Text on `info-container`.    |
| `--color-warning`              | `bg-warning`                | `oklch(75% 0.15 70deg)`                                               | Warning state.               |
| `--color-on-warning`           | `text-on-warning`           | `oklch(15% 0.02 70deg)`                                               | Text on `warning`.           |
| `--color-warning-container`    | `bg-warning-container`      | `color-mix(in oklch, var(--color-warning) 30%, var(--color-surface))` | Warning container.           |
| `--color-on-warning-container` | `text-on-warning-container` | `oklch(90% 0.02 70deg)`                                               | Text on `warning-container`. |

### Outline, inverse, ghost, scrim

| Token                        | Tailwind utility          | Value                         | Usage                                   |
| ---------------------------- | ------------------------- | ----------------------------- | --------------------------------------- |
| `--color-outline`            | `border-outline`          | `oklch(50% 0.021 274.3deg)`   | Main outline.                           |
| `--color-outline-variant`    | `border-outline-variant`  | `oklch(38.5% 0.021 274.3deg)` | Subtler outline.                        |
| `--color-inverse-surface`    | `bg-inverse-surface`      | `oklch(95% 0.005 250deg)`     | Inverse (light surface on dark).        |
| `--color-on-inverse-surface` | `text-on-inverse-surface` | `oklch(18% 0.019 274.6deg)`   | Text on `inverse-surface`.              |
| `--color-ghost`              | `bg-ghost`                | `oklch(100% 0 0deg)`          | White background for high-contrast CTA. |
| `--color-on-ghost`           | `text-on-ghost`           | `var(--color-on-primary)`     | Text on `ghost`.                        |
| `--color-scrim`              | `bg-scrim`                | `oklch(0% 0 0deg / 60%)`      | Dimming behind dialog/menu.             |

### Glass (auth/landing)

| Token                           | Tailwind utility               | Value                                                               | Usage                        |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------- | ---------------------------- |
| `--color-glass`                 | `bg-glass`                     | `oklch(10% 0.018 274.6deg)`                                         | Base glass surface.          |
| `--color-on-glass`              | `text-on-glass`                | `oklch(95% 0.005 250deg)`                                           | Text on `glass`.             |
| `--color-on-glass-variant`      | `text-on-glass-variant`        | `color-mix(in oklch, var(--color-on-glass) 70%, transparent)`       | Secondary text on glass.     |
| `--color-glass-elevation-1`     | `bg-glass-elevation-1`         | `oklch(13% 0.02 273.4deg)`                                          | Lighter glass elevation.     |
| `--color-on-glass-elevation-1`  | `text-on-glass-elevation-1`    | `oklch(92% 0.008 250deg)`                                           | Text on `glass-elevation-1`. |
| `--color-glass-elevation-2`     | `bg-glass-elevation-2`         | `oklch(16% 0.022 273.4deg)`                                         | Stronger glass elevation.    |
| `--color-on-glass-elevation-2`  | `text-on-glass-elevation-2`    | `oklch(90% 0.008 250deg)`                                           | Text on `glass-elevation-2`. |
| `--color-glass-outline`         | `border-glass-outline`         | `oklch(40% 0.021 274.3deg)`                                         | Glass outline.               |
| `--color-glass-outline-variant` | `border-glass-outline-variant` | `oklch(28% 0.021 274.3deg)`                                         | Subtle glass outline.        |
| `--color-glass-error`           | `bg-glass-error`               | `color-mix(in oklch, var(--color-error) 20%, var(--color-glass))`   | Error on glass.              |
| `--color-on-glass-error`        | `text-on-glass-error`          | `oklch(85% 0.18 20deg)`                                             | Text on `glass-error`.       |
| `--color-glass-success`         | `bg-glass-success`             | `color-mix(in oklch, var(--color-success) 20%, var(--color-glass))` | Success on glass.            |
| `--color-on-glass-success`      | `text-on-glass-success`        | `oklch(85% 0.13 160deg)`                                            | Text on `glass-success`.     |
| `--color-glass-info`            | `bg-glass-info`                | `color-mix(in oklch, var(--color-info) 20%, var(--color-glass))`    | Info on glass.               |
| `--color-on-glass-info`         | `text-on-glass-info`           | `oklch(85% 0.13 230deg)`                                            | Text on `glass-info`.        |

### Kit-play (runtime vars, not `@theme`)

Set dynamically on `document.body` by `getKitColorVars()` in `app/lib/hooks/use-kit-player.ts` based on `kit.colors`. These are not static tokens, but you should know them when working on kit-play UI.

| Token                                 | Source                  | Usage                                                                |
| ------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `--color-kit-play-primary`            | `colors.main`           | Main action color in kit-play view.                                  |
| `--color-kit-play-primary-hover`      | `colors.mainHover`      | Primary action hover in kit-play (the only allowed `*-hover` token). |
| `--color-kit-play-on-primary`         | `colors.mainForeground` | Text on primary in kit-play.                                         |
| `--color-kit-play-border`             | `colors.border`         | Borders in kit-play.                                                 |
| `--color-kit-play-elevation-1`        | `colors.card`           | Card/panel background in kit-play.                                   |
| `--color-kit-play-on-elevation-1`     | `colors.foreground`     | Text on cards in kit-play.                                           |
| `--color-kit-play-elevation-1-border` | `colors.cardBorder`     | Card border in kit-play.                                             |
| `--color-kit-play-surface`            | `colors.background`     | Kit-play view background.                                            |

## Typography (fluid `clamp()`)

### `:root` fluid vars

| Var                | Value                                                        | Notes                                                                                                |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `--f-font-size`    | `clamp(calc(18rem / 10.5), 15.5vw / 7.68, calc(32rem / 16))` | Base `font-size` for `rem`. In `:root` `font-size` is computed as `calc(var(--f-font-size) * 0.25)`. |
| `--fluid-text-sm`  | `clamp(1.75rem, 1.75vw, 1.75rem)`                            | Min = max, so effectively a fixed 1.75rem.                                                           |
| `--fluid-text-md`  | `clamp(1.75rem, 2vw, 2rem)`                                  | Default body size.                                                                                   |
| `--fluid-text-lg`  | `clamp(2rem, 2.5vw, 2.5rem)`                                 | —                                                                                                    |
| `--fluid-text-xl`  | `clamp(2.5rem, 3vw, 3rem)`                                   | —                                                                                                    |
| `--fluid-text-2xl` | `clamp(3rem, 4vw, 4rem)`                                     | —                                                                                                    |
| `--fluid-text-3xl` | `clamp(3.5rem, 5.5vw, 5.5rem)`                               | —                                                                                                    |
| `--fluid-text-4xl` | `clamp(4rem, 7vw, 7rem)`                                     | —                                                                                                    |
| `--fluid-text-5xl` | `clamp(1rem, 9vw, 9rem)`                                     | **FIXME:** min 1rem is suspicious — requires verification.                                           |
| `--fluid-text-0`   | `clamp(5rem, 16vw, 16.5rem)`                                 | Hero display (`.h0`).                                                                                |

### `@theme inline` mapping → `text-*` utility

| Token        | Maps to                 |
| ------------ | ----------------------- |
| `--text-sm`  | `var(--fluid-text-sm)`  |
| `--text-md`  | `var(--fluid-text-md)`  |
| `--text-lg`  | `var(--fluid-text-lg)`  |
| `--text-xl`  | `var(--fluid-text-xl)`  |
| `--text-2xl` | `var(--fluid-text-2xl)` |
| `--text-3xl` | `var(--fluid-text-3xl)` |
| `--text-4xl` | `var(--fluid-text-4xl)` |
| `--text-5xl` | `var(--fluid-text-5xl)` |
| `--text-0`   | `var(--fluid-text-0)`   |

### Fonts (`@theme`)

| Var                      | Value                      | Utility         |
| ------------------------ | -------------------------- | --------------- |
| `--font-body`            | `"Montserrat", sans-serif` | `font-body`     |
| `--font-header`          | `"Syne", sans-serif`       | `font-header`   |
| `--font-weight-light`    | `300`                      | `font-light`    |
| `--font-weight-regular`  | `400`                      | `font-regular`  |
| `--font-weight-medium`   | `500`                      | `font-medium`   |
| `--font-weight-semibold` | `600`                      | `font-semibold` |

### `@layer base` defaults

| Selector     | `@apply`                                                                    |
| ------------ | --------------------------------------------------------------------------- |
| `body`       | `bg-surface font-body font-regular leading-regular text-md text-on-surface` |
| `h1` / `.h1` | `font-header font-semibold text-5xl`                                        |
| `h2` / `.h2` | `font-header font-semibold text-4xl`                                        |
| `h3` / `.h3` | `font-header font-semibold text-3xl`                                        |
| `h4` / `.h4` | `font-header font-semibold text-2xl`                                        |
| `h5` / `.h5` | `font-header font-semibold text-xl`                                         |
| `.h0`        | `font-header font-semibold text-0`                                          |
| `strong`     | `font-regular`                                                              |

### `@media (--bp-huge)` freeze

Above `1920px` fluid typography freezes to fixed values, and the root `font-size` drops to `8px`:

| Var                       | Value on `huge` |
| ------------------------- | --------------- |
| `--fluid-text-sm`         | `1.75rem`       |
| `--fluid-text-md`         | `2rem`          |
| `--fluid-text-lg`         | `2.5rem`        |
| `--fluid-text-xl`         | `3rem`          |
| `--fluid-text-2xl`        | `4rem`          |
| `--fluid-text-3xl`        | `5.5rem`        |
| `--fluid-text-4xl`        | `7rem`          |
| `--fluid-text-5xl`        | `9rem`          |
| `--fluid-text-0`          | `16.5rem`       |
| `--x-container-max-width` | `95vw`          |
| `font-size`               | `8px`           |

## Component Size Tokens (rem)

`--size-*` generates `size-*` (w+h). `--height-*` mirrors for `h-*`, `--width-*` mirrors for `w-*`. Values in `rem`.

| Component     | sm     | md     | lg     | xl  | Notes                                                           |
| ------------- | ------ | ------ | ------ | --- | --------------------------------------------------------------- |
| `btn`         | `4`    | `5.5`  | `7.5`  | —   | `size-*`, `height-*`, `width-*`                                 |
| `icon-btn`    | `2.5`  | `3`    | `3.5`  | —   | square; `size-*`, `height-*`, `width-*`                         |
| `fab`         | `2.5`  | `3.5`  | `6`    | —   | `size-*`, `height-*`, `width-*`                                 |
| `chip`        | `2`    | `2.25` | `2.5`  | —   | `size-*`, `height-*`, `width-*`                                 |
| `text-field`  | `4`    | `5.5`  | `7.5`  | —   | `size-*`, `height-*`, `width-*`                                 |
| `seg-btn`     | `4`    | `5.5`  | `7.5`  | —   | height per item; `size-*`, `height-*`, `width-*`                |
| `checkbox`    | `2.75` | `3.25` | `3.75` | —   | square; `size-*`, `height-*`, `width-*`                         |
| `switch`      | `3.5`  | `4.5`  | `5.5`  | —   | width; `h-*` = `size-switch-*`; `size-*`, `height-*`, `width-*` |
| `avatar`      | `2.5`  | `3`    | `4`    | `5` | square; `size-*`, `height-*`, `width-*`                         |
| `badge`       | `1.25` | `1.5`  | `1.75` | —   | `width-*` only (no `size-*` / `height-*`)                       |
| `list-item`   | `4`    | `5`    | `6`    | —   | `height-*` only (no `size-*` / `width-*`)                       |
| `nav-bar`     | —      | `5`    | —      | —   | `height-*` only (single)                                        |
| `top-app-bar` | `4`    | `7`    | `9.5`  | —   | `height-*` only                                                 |
| `panel-btn`   | —      | `6`    | —      | —   | kit-play main/secondary action height; `height-*` only          |

## Motion (MD3)

### Easings (`@theme` → `ease-*`)

| Var                      | Value                        | Usage               |
| ------------------------ | ---------------------------- | ------------------- |
| `--ease-ui`             | `cubic-bezier(0.2, 0, 0, 1)` | Default UI easing.  |
| `--ease-ui-decelerated` | `cubic-bezier(0, 0, 0, 1)`   | Entrances / expand. |
| `--ease-ui-accelerated` | `cubic-bezier(0.3, 0, 1, 1)` | Exits / collapse.   |

### Durations (`@theme` → `duration-*`)

| Var                              | Value   | Tailwind class      |
| -------------------------------- | ------- | ------------------- |
| `--transition-duration-short-1`  | `75ms`  | `duration-short-1`  |
| `--transition-duration-short-2`  | `100ms` | `duration-short-2`  |
| `--transition-duration-short-3`  | `150ms` | `duration-short-3`  |
| `--transition-duration-medium-1` | `200ms` | `duration-medium-1` |
| `--transition-duration-medium-2` | `250ms` | `duration-medium-2` |
| `--transition-duration-medium-3` | `300ms` | `duration-medium-3` |
| `--transition-duration-long-1`   | `350ms` | `duration-long-1`   |
| `--transition-duration-long-2`   | `400ms` | `duration-long-2`   |

## Line height / Letter spacing / Radius / Z-index / Shadows / Spacing

### Line height (`@theme` → `leading-*`)

| Var / Utility                                     | Value   |
| ------------------------------------------------- | ------- |
| `--leading-none` / `leading-none`                 | `1`     |
| `--leading-snug` / `leading-snug`                 | `1.375` |
| `--leading-regular` / `leading-regular`           | `1.5`   |
| `--leading-normal` / `leading-normal`             | `1.5`   |
| `--leading-relaxed` / `leading-relaxed`           | `1.625` |
| `--leading-relaxed-more` / `leading-relaxed-more` | `1.75`  |
| `--leading-loose` / `leading-loose`               | `2`     |

### Letter spacing (`@theme` → `tracking-*`)

| Var / Utility                           | Value     |
| --------------------------------------- | --------- |
| `--tracking-none` / `tracking-none`     | `0`       |
| `--tracking-tight` / `tracking-tight`   | `-0.05em` |
| `--tracking-normal` / `tracking-normal` | `100%`    |
| `--tracking-loose` / `tracking-loose`   | `0.025em` |
| `--tracking-wide` / `tracking-wide`     | `0.05em`  |

### Radius (`@theme` → `rounded-*`)

| Var / Utility                    | Value                                       |
| -------------------------------- | ------------------------------------------- |
| `--radius-unit`                  | `1rem`                                      |
| `--radius-xs` / `rounded-xs`     | `calc(var(--radius-unit) * 1)` = `1rem`     |
| `--radius-sm` / `rounded-sm`     | `calc(var(--radius-unit) * 2)` = `2rem`     |
| `--radius-md` / `rounded-md`     | `calc(var(--radius-unit) * 2.5)` = `2.5rem` |
| `--radius-lg` / `rounded-lg`     | `calc(var(--radius-unit) * 3)` = `3rem`     |
| `--radius-xl` / `rounded-xl`     | `calc(var(--radius-unit) * 4)` = `4rem`     |
| `--radius-2xl` / `rounded-2xl`   | `calc(var(--radius-unit) * 6)` = `6rem`     |
| `--radius-full` / `rounded-full` | `9999px`                                    |

### Z-index (`@theme` → `z-*`)

| Var / Utility                                       | Value | Usage                 |
| --------------------------------------------------- | ----- | --------------------- |
| `--z-index-below` / `z-below`                       | `-1`  | Below base layer.     |
| `--z-index-base` / `z-base`                         | `0`   | Base.                 |
| `--z-index-raised` / `z-raised`                     | `1`   | Slight elevation.     |
| `--z-index-content` / `z-content`                   | `2`   | Content.              |
| `--z-index-indicator` / `z-indicator`               | `10`  | Indicators.           |
| `--z-index-floating-control` / `z-floating-control` | `20`  | Floating controls.    |
| `--z-index-sticky` / `z-sticky`                     | `100` | Sticky header.        |
| `--z-index-navigation` / `z-navigation`             | `340` | Navigation.           |
| `--z-index-modal` / `z-modal`                       | `410` | Modals.               |
| `--z-index-toast` / `z-toast`                       | `500` | Toasts / loading bar. |
| `--z-index-page-reveal` / `z-page-reveal`           | `600` | Page reveal effect.   |
| `--z-index-cookie-banner` / `z-cookie-banner`       | `700` | Cookie banner.        |
| `--z-index-system-overlay` / `z-system-overlay`     | `999` | System overlay.       |

Gaps between values are intentional, to allow local insertion of intermediate z-indexes without changing tokens.

### Shadows (`@theme` → `shadow-*`)

| Var / Utility               | Value                                                                | Notes          |
| --------------------------- | -------------------------------------------------------------------- | -------------- |
| `--shadow-sm` / `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 5%)`                                        | Subtle shadow. |
| `--shadow-md` / `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)`   | Medium shadow. |
| `--shadow-lg` / `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)` | Large shadow.  |

Most custom elevation shadow tokens have been removed — elevation is implemented through background color, not shadow.

### Spacing (`@theme`)

| Var         | Value     | Note                                                                                                                                                                                               |
| ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--spacing` | `0.75rem` | Base unit for `gap-*`, `p-*`, `m-*`, `w-*`, `h-*`, `inset-*`. Tailwind v4 multiplies `var(--spacing) * N`. Raised to `0.75rem` (3× default), because the root `font-size` is smaller (fluid text). |

## w-mod-unit (layout grid)

### `:root` vars

| Var                       | Value                                     | `@media` override                                                           |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `--x-container-max-width` | `1920px`                                  | `--bp-huge`: `95vw`                                                         |
| `--x-w-mod-unit`          | `calc(var(--x-container-max-width) / 24)` | —                                                                           |
| `--spacing-x-site`        | `2.5rem`                                  | `--bp-phone`: `4rem` · `--bp-desktop`: `6rem` · `--bp-large-desktop`: `4vw` |
| `--spacing-top-site`      | `16rem`                                   | `--bp-desktop`: `24rem`                                                     |

The grid is based on 24 columns, so `w-mod-unit-*` effectively takes values 1–24 (though the utility accepts any integer).

### `@utility` (`app/styles/utilities/layout.css`)

| Utility                | Definition                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `cont`                 | `width: 100%; max-width: var(--x-container-max-width); margin-inline: auto`                          |
| `px-site`              | `padding-inline: var(--spacing-x-site)`                                                              |
| `p-site`               | `padding: var(--spacing-x-site)`                                                                     |
| `pt-top-site`          | `padding-top: var(--spacing-top-site)`                                                               |
| `section-full-width`   | `padding-inline: 0`                                                                                  |
| `w-mod-unit-*`         | `width: calc(var(--x-w-mod-unit) * --value(integer))`                                                |
| `min-w-mod-unit-*`     | `min-width: calc(var(--x-w-mod-unit) * --value(integer))`                                            |
| `max-w-mod-unit-*`     | `max-width: calc(var(--x-w-mod-unit) * --value(integer))`                                            |
| `basis-mod-unit-*`     | `flex-basis: calc(var(--x-w-mod-unit) * --value(integer))`                                           |
| `grid-cols-mod-unit-*` | `grid-template-columns: repeat(auto-fill, minmax(calc(var(--x-w-mod-unit) * --value(number)), 1fr))` |

**`cont` — when to use:** → `styling.md` § "`cont` — site container".

## Unit scale (`w-`/`min-w-`/`max-w-unit-*`)

Own named width scale — `--container-unit-*` tokens in `@theme` (`app/styles/tailwind.css`). Tailwind v4 maps the `--container-*` namespace to utilities, so each token generates `w-unit-*`, `min-w-unit-*` and `max-w-unit-*` (no `@utility` needed). Values in **rem** — they scale with the fluid root (`--f-font-size`, 1rem ≈ 6.86–8px, frozen at 8px above 1920px).

| Size | Token                  | Value   | ≈ px at 8px root |
| ---- | ---------------------- | ------- | ---------------- |
| xl   | `--container-unit-xl`  | `40rem` | 320              |
| 2xl  | `--container-unit-2xl` | `48rem` | 384              |
| 3xl  | `--container-unit-3xl` | `56rem` | 448              |
| 4xl  | `--container-unit-4xl` | `64rem` | 512              |
| 5xl  | `--container-unit-5xl` | `72rem` | 576              |
| 6xl  | `--container-unit-6xl` | `80rem` | 640              |

**When to use:** full decision matrix (rem vs px, `unit-*` vs `[nrem]` vs `[npx]` vs `mod-unit-*` vs `ch`/`vw`) → `styling.md` § "Width & `max-w` — choosing the mechanism".

## Breakpoints

| `@theme --breakpoint-*`        | `@custom-media`            | min-width           | Tailwind variant     |
| ------------------------------ | -------------------------- | ------------------- | -------------------- |
| `--breakpoint-phone`           | `--bp-phone`               | `480px`             | `phone:`             |
| `--breakpoint-tablet`          | `--bp-tablet`              | `700px`             | `tablet:`            |
| `--breakpoint-desktop`         | `--bp-desktop`             | `1020px`            | `desktop:`           |
| `--breakpoint-large-desktop`   | `--bp-large-desktop`       | `1236px`            | `large-desktop:`     |
| `--breakpoint-xlarge-desktop`  | `--bp-xlarge-desktop`      | `1440px`            | `xlarge-desktop:`    |
| `--breakpoint-2xlarge-desktop` | `--bp-2xlarge-desktop`     | `1680px`            | `2xlarge-desktop:`   |
| `--breakpoint-huge`            | `--bp-huge`                | `1920px`            | `huge:`              |
| —                              | `--bp-below-large-desktop` | `max-width: 1235px` | — (media query only) |

## Custom `@utility` (`utilities/*.css`)

| Utility                          | File        | Definition                                                                                                         |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `uix-link-muted`                   | `links.css` | `text-on-surface-variant` + hover → `text-on-surface`                                                              |
| `uix-link-muted-primary-underline` | `links.css` | `underline text-primary`                                                                                           |
| `uix-link-primary`                 | `links.css` | `text-primary`                                                                                                     |
| `uix-nav-link`                     | `links.css` | `px-2 py-1 rounded-sm text-on-surface-variant` + hover → `color-mix(surface 75%, transparent)` + `text-on-surface` |
| `state-layer`                      | `ui.css`    | `position: relative; isolation: isolate`                                                                           |
| `uix-ripple`                       | `ui.css`    | `position: absolute; inset: 0; overflow: hidden; pointer-events: none`                                             |
| `ui-ripple-surface`                | `ui.css`    | `__ripple` overlay primitive (absolute inset-0 z-below overflow-hidden rounded-[inherit] pointer-events-none)      |
| `ui-state-layer`                   | `ui.css`    | `__state-layer` overlay primitive (absolute inset-0 bg-current rounded-[inherit] opacity-0 transition-opacity)     |
| `uix-elevation-1-bordered`         | `ui.css`    | `bg-elevation-1 border border-outline-variant rounded-xl`                                                          |

## `@layer components` + keyframes

### `.ripple__wave` (`@layer components`)

```css
position: absolute;
background: color-mix(in oklch, var(--ripple-color, currentcolor) 60%, white);
border-radius: 50%;
opacity: 0.3;
transform: scale(0);
animation: ripple-anim 600ms var(--ease-ui) forwards;
```

### Keyframes (top-level, outside `@layer`)

| Name                   | Animation                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `ripple-anim`          | `to { opacity: 0; transform: scale(4) }`                                                            |
| `legal-footer-marquee` | `0% { transform: translateX(0) } 100% { transform: translateX(-100%) }`                             |
| `nav-loading`          | `0% { filter: brightness(100%) } 50% { filter: brightness(60%) } 100% { filter: brightness(100%) }` |
| `loading-bar-expand`   | `from { transform: scaleX(0) } to { transform: scaleX(1) }`                                         |

### `.loading-bar` (`@layer custom`, `base/loading-bar.css`)

```css
background: var(--color-kit-play-primary, var(--color-primary));
@apply fixed left-0 top-0 z-toast h-1 w-full pointer-events-none origin-left
  animate-[loading-bar-expand_var(--transition-duration-long-2)_var(--ease-ui)_forwards];
```

Respects `prefers-reduced-motion: reduce` via `animation: none`.
