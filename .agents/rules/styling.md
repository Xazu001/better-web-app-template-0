# Styling — CSS mechanics (Tailwind v4)

> Tailwind/CSS mechanics for routes and components. MD3 concepts (color roles, state layer, uix-ripple, shape, motion, typography) → `md3-design.md`. Tokens → `tokens.md`. Component implementation → `components.md`.

## 3-tier hybrid (CRITICAL)

| Tier | Where | Convention | When |
| --- | --- | --- | --- |
| UI/custom components | `app/components/ui/**`, `custom/**` | BEM `block__element--modifier` + `@apply` in co-located `.css` | **ALWAYS** |
| Pages components — default | `app/components/pages/**` | inline Tailwind in TSX | **ALWAYS** (no class threshold) |
| Pages components — `@apply` | `app/components/pages/**` | BEM block `{page}-{component}` + `@apply` in `.css` (`@layer custom`/`routes`) | **RARE — only complicated** (→ `components.md`) |
| Routes — default | `app/routes/**` | inline Tailwind in TSX | **ALWAYS** (no class threshold) |
| Routes — `@apply` | `app/routes/**` | BEM with route prefix = block + `@apply` in `.css` (`@layer routes`) | **RARE — only when explicitly requested** |

- **Route `@apply` is NOT triggered by class count.** Long inline in routes is OK and expected. `@apply` in route `.css` = only when: (a) `@keyframes`/signature animations with `prefers-reduced-motion`, (b) shared layout sibling-routes (e.g. `main/plans.css` — `::before` glow effects used in `main/plans`), (c) very complex `@media` combos unexpressible with variants (`@media (…) and (…)`), (d) explicit user instruction. When used → BEM with route prefix = block (`auth__field`, `plans__glow`, `users__toolbar`), `__` IS used (this IS BEM).
- Page-specific components in `app/components/pages/**` — inline Tailwind by default (like routes). Co-located `.css` ONLY when complicated (`@keyframes`, selectors unexpressible with variants, complex `@media`) → BEM block `{page}-{component}` + `@apply`, `@layer custom` (or `routes` when purely route layout). Criteria → `components.md` § "Pages components (route-specific)".
- **Decision test for a route element:**
  1. Default → inline Tailwind (any number of classes) — routes and pages components.
  2. Pattern repeated 3+ times cross-route → `@utility` in `tailwind.css` or `app/styles/utilities/*.css` + rest inline.
  3. Animation → `@keyframes` in `tailwind.css` (cross-route) or route `.css` (route-specific).
  4. `@apply` in route `.css` → ONLY ordered.
- **`@utility` extraction criteria:** pattern 3+ times in the same file OR 2+ times in different files, ≥3 classes, cross-route (generic, not specific to one route). Do not extract: route-specific layout, single classes, patterns 1-2x in one file.
- **`uix-*` prefix:** repeating `@utility` style bundles in `app/styles/utilities/` — grouped styles applied directly in markup that don't fit as a component (links, headers bundling size+color+font, surface cards) — get the `uix-` prefix: `uix-link-primary`, `uix-link-muted`, `uix-nav-link`, `uix-elevation-1-bordered`, `uix-ripple`. Atomic primitives (`cont`, `px-site`, `input-*`, `state-layer`) stay unprefixed; UI-internal overlay primitives use `ui-` (`ui-ripple-surface`, `ui-state-layer`).
- **Mixing rules (CRITICAL):**
  - `@utility` (`uix-link-muted`, `uix-nav-link`, `cont`, `px-site`, `flex`, `gap-4`, …) + inline Tailwind on the same element → **OK** (both are generic Tailwind utilities, same cascade).
  - Route BEM class (`plans__glow`, `users__toolbar`) + inline Tailwind → **NO** (one element = one convention for route classes; children can have inline).
  - UI/custom BEM (`ui-btn`, `pad`, `nav`) + inline → **NO** (they ALWAYS `@apply` in `.css`; exception: `@utility` like `cont`/`px-site`). Pages components are inline Tailwind — BEM only when a `.css` exists.
- **Semantic signal in `className`:** `__` in the name → component OR route BEM (`@apply` in `.css`, reusable). Utility chain → route element (inline — default).

## Core rules

- **Tailwind v4** — `@theme` + `@theme inline` + `@utility` in CSS, **not** `tailwind.config.js`. Entry CSS is `app/styles/main.css` (line 1), which imports `tailwindcss`, then `app/styles/tailwind.css` with `@theme`/`@utility` definitions and `@layer base`/`components`/`overrides`.
- **Units:** `rem` (heights `--size-*`, spacing), `cqw` (animations). Size token values are in rem — they scale with `--f-font-size` (fluid root), do not override with hardcoded px.
- **Component size tokens:**
  - **UI components** (`app/components/ui/*`) — ALWAYS component height tokens (`h-btn-md`, `h-text-field-md`, `h-chip-md`, `h-checkbox-md`, `h-switch-md`), never `h-10`/`h-12`. Square components (IconButton, Checkbox, Switch, Avatar) use `w-{comp}-{size}` / `h-{comp}-{size}` or `size-{comp}-{size}`.
  - **Custom components** (`app/components/custom/*`) — `h-{comp}-{size}` when a matching token exists and the component has a size scale; otherwise `h-*` in rem is OK.
  - **Routes/pages** — `h-*` (rem/`dvh`/`mod-unit`), `h-{comp}-{size}` does not apply (those are component tokens, not layout).
- **Breakpoints (custom, NOT `sm:`/`md:`/`lg:`/`xl:`):** `phone` 480, `tablet` 700, `desktop` 1020, `large-desktop` 1236, `xlarge-desktop` 1440, `2xlarge-desktop` 1680, `huge` 1920. In TSX: `phone:`/`tablet:`/…; in `.css`: `@media (--bp_tablet)`. All `min-width` (mobile-first). Full table → `tokens.md` § "Breakpoints".
- **Z-index:** use `z-*` tokens, never raw numbers in components. Gaps in the scale (20→100, 100→340) are intentional — do not fill with arbitrary values. Full scale → `tokens.md` § "Z-index".
- **w-mod-unit:** use `w-mod-unit-*` (1-24) instead of hardcoded % — keeps column proportions independent of breakpoint. Full vars → `tokens.md` § "w-mod-unit".
- **w-unit-***: named width scale `xl`–`6xl` (40–80rem) for content `max-w-*`/`w-*`/`min-w-*` tied to fluid typography — prefer over arbitrary `max-w-[56rem]`. Full table → `tokens.md` § "Unit scale".
- **Width units:** choosing between `unit-*`, `[nrem]`, `[npx]`, `mod-unit-*`, `ch`, `vw` → § "Width & `max-w` — choosing the mechanism" below.
- **Colors:** OKLCH in `@theme`. Prefer utility (`bg-*`/`text-*`/`border-*`/…); `var(--color-*)` ONLY when no utility / custom prop / fallback / `color-mix` / `!important` override. Never `rgba()` with OKLCH.
- **`!important`** — banned; exception: `@layer overrides` (MUI/react-toastify, comment `/* MUI override */`).
- **Utility v4:** `grow`/`shrink-0` (not `flex-grow-*`/`flex-shrink-*`).
- **Layout:** no global styles in `@layer base` (sections/main). Manual utility: `cont`, `px-site`, `section-full-width`, `min-h-dvh` on the specific element. `cont` usage → § "`cont` — site container".

### Spacing hierarchy

> `gap` > `padding` > `margin`. `margin` = last resort, not default.

- **`gap`** — between children (flex/grid parent). Always first. Parent controls group spacing, children stay "clean" (no per-item `m-*`). No margin-collapse, no "extra" spacing at the end. Change in one place (`gap-4` → `gap-6`), not on N children.
- **`padding`** — inside the element (`px-2` in `ui-btn`, `p-desktop-menu` in play panel, `px-site` section, `p-5` in `ui-dialog__content`). Space between border/bg and content. Padding belongs to the element's "box", not neighbors. Works with size tokens (`h-btn-md` + `px-2` defines the button).
- **`margin`** — last resort: `mt-auto` (push to bottom in flex-col), `mx-auto` (centering, `.cont`), offset between independent sections without a flex/grid parent (`<header>` and `<main>` at `<body>` level — `gap` does not exist because parent is not flex/grid), `margin-inline: auto` (centering).
- **Mixing legal:** `flex gap-4` + child `mt-auto` OK (align utility, not spacing). `flex gap-4` + child `mx-auto` OK (centering). `p-5` dialog + `gap-1` flex-inside-dialog OK (padding=outside group, gap=inside group). `mt-8` between sections without flex parent OK.
- **Do not do this:**
  - `mb-*` on every `<li>` instead of `gap` on `<ul>` or `<ol>`.
  - `gap` + `m-*` in the same direction (`flex gap-4` + child `mb-2` — duplicates gap).
  - margin instead of padding for internal space (margin "leaks" outside box).
  - `my-*` on an isolated element when `py-*` or `gap` on parent can be used.
  - breakpoint-dependent `p-*`/`m-*` (`desktop:p-8 p-6`, `tablet:py-8`, `phone:ml-2`) — padding/margin NEVER vary by breakpoint. One fixed value, no `phone:`/`tablet:`/`desktop:`/`large-desktop:`/`xlarge-desktop:`/`2xlarge-desktop:`/`huge:` variants. Responsive spacing only on explicit user request.

## Width & `max-w` — choosing the mechanism (decision matrix)

> **Decision test (one sentence):** "Does this width grow with the text?" — yes → typography scale (`unit-*`, `[nrem]`, `ch`); no → device/grid scale (`[npx]`, `vw`, `mod-unit-*`).

The root is fluid (`--f-font-size`): `1rem ≈ 6.86–8px`, frozen at `8px` above `1920px` (`huge`). Therefore:

- **rem** = typography scale — width grows with the fluid type (constant measure, consistent proportions), auto-freezes above `huge`.
- **px** = device/tool scale — ignores fluid typography, always predictable.

### Matrix

| Width is… | Use (in order) | Examples in code |
| --- | --- | --- |
| Content `max-w`/`w`/`min-w` tied to typography (measure, sections) | `max-w-unit-*` (xl–6xl = 40–80rem) — FIRST | `max-w-unit-3xl` (56rem), `w-unit-2xl` (48rem) |
| Rem width genuinely outside the scale (one-off, justified) | `[nrem]` arbitrary | `max-w-[124rem]` page shell |
| Tool-UI / admin / fixed asset / hard cap that must NOT scale with type | `[npx]` arbitrary | `max-w-[720px]` (`status.tsx`), `max-w-[1600px]` (admin) |
| Viewport-proportional column or dialog (24-col grid) | `mod-unit-*` (1–24) + `basis-`/`grid-cols-` | `max-w-mod-unit-10` (dialog md) |
| Pure reading measure (characters per line) | `ch` | `max-w-[65ch]` (FAQ) |
| Clamped to the viewport itself | `vw` | `max-w-[85vw]` (drawer) |
| Page container / site padding | `cont` + `px-site` | `<main className="cont px-site">` |

### Rules

1. **`unit-*` first.** If the value fits the scale (40/48/56/64/72/80rem), use the token — never `max-w-[56rem]` when `max-w-unit-3xl` exists.
2. **`[nrem]`** — one-off rem widths outside the scale (e.g. `124rem` page shell). If the same value repeats 2+× or is within rounding distance of the scale → use `unit-*` or extend the scale instead.
3. **`[npx]`** — admin/tool UI, width matching a fixed asset (image, canvas, preview), or a hard cap independent of typography. NEVER for fluid-design content (public routes, MD3 components) — those belong to the rem scale.
4. **`mod-unit-*`** — proportions of the 24-col grid: dialog widths, `basis-*`, `grid-cols-*`. NOT content measure.
5. **rem mental math:** `n rem × ~7–8px`. Never write rem assuming a 16px base — `max-w-[124rem]` ≈ 860–990px.
6. Breakpoints are px and orthogonal to this choice: `@media` conditions stay in px, rem values inside still move with the fluid root.

### `cont` — site container

```css
@utility cont {
  width: 100%;
  max-width: var(--x-container-max-width); /* 1920px → 95vw above huge */
  margin-inline: auto;
}
```

`cont` = `w-full` + `mx-auto` + site `max-w` in one — the horizontal boundary of the page. Below `huge` it behaves as `w-full` (cap > viewport); above `huge` it holds bands at `95vw`, keeping edge gutters on ultra-wide.

**Use `cont`:**

- On the root of a band that must cap at site width and center — `<main>`/`<section>`/layout wrapper in routes.
- One `cont` per capped band — a page can have several (`home`: `<section>` inside `<main>` + `<div>` inside `<footer>`).
- `cont` has **no padding** — pair with `px-site`: same element (`px-site cont` — `auth/layout`, `main/layout`) or split — outer full-bleed band owns `bg`/`border`/`backdrop` + `px-site`, inner gets `cont` (`home` `<main>`/`<footer>`).
- Reading column narrower than the site cap → stack `max-w-mod-unit-*`/`max-w-unit-*` on the SAME element — it emits after `.cont` in the utilities layer, so it wins (`max-w-mod-unit-16 cont`).
- In component `.css` → `@apply cont` on inner containers is legal — `cont` is a `@utility` (allowed BEM exception).

**Do NOT:**

- `w-full`/`mx-auto`/`max-w-[1920px]` alongside or instead of `cont` — already inside (no-duplicate-styles).
- `cont` on a nested element inside an already capped band — cap once, at the band root.
- `cont` in dialogs/popovers/drawers — they own `max-w-*` (e.g. `max-w-mod-unit-10` dialog md).
- `cont` on chrome that must bleed edge-to-edge — `nav` is `w-full px-site` on purpose.

## `color-mix` rules

> Applies to **every** `color-mix(...)` in the codebase — `@theme` token defs, component `.css`, route `.css`, inline TSX arbitrary values (`bg-[color-mix(...)]`), inline `style`.

- **Percentages — only multiples of 5** (`0,5,10,…,100`). `8%→10%`, `12%→10%`, `18%→20%`, `78%→80%`, `97.5%→100%`. Applies to **both** mix percentages (`color 30%, surface`) and gradient/alpha stops. Overrides MD3 spec (state layers = 10/10/10) — visual difference is negligible, consistency wins.
- **`in srgb`** — default, **always omit** (`color-mix(in srgb, A 50%, B)` ≡ `color-mix(A 50%, B)`). **`in oklch`** — keep (non-default; perceptually-uniform OKLCH interpolation for mixing OKLCH tokens, tonal container variants, alpha/lightness mixing `--color-*`). All `--color-*` are OKLCH → most `color-mix` uses `in oklch`. Never `in lab`/`lch`/`hsl`/`hwb`/`xyz`.
- **`@apply` vs `var(--color-*)`:** if a utility exists for property+color → ALWAYS `@apply {prefix}-{color}` (`bg-primary`, `text-on-surface`, `border-on-primary`, `outline-2 outline-primary outline-offset-2`, `decoration-on-surface-variant`, `fill-primary`, `stroke-on-surface`). `var(--color-*)` ONLY: custom prop assignment (`--ripple-color: var(--color-primary)`), fallback chain, `color-mix(in oklch, …)`, `!important` 3rd-party override.
- **Real examples from `@theme` in `app/styles/tailwind.css`:**
  - `--color-on-surface-variant: color-mix(in oklch, var(--color-on-surface) 70%, transparent);` (line 227)
  - `--color-primary-container: color-mix(in oklch, var(--color-primary) 30%, var(--color-surface));` (line 245)
  - `--color-glass-error: color-mix(in oklch, var(--color-error) 20%, var(--color-glass));` (line 303)

## @layer cascade (CRITICAL)

```css
/* app/styles/main.css — line 1, before @import */
@layer reset, base, components, custom, routes, overrides;
@import "tailwindcss";
@import "./tailwind.css";
```

The declaration is also repeated in `app/root.tsx` (lines 92-96) as an inline `<style>` rendered before `<Links>`, so the layer order is established before the browser loads any co-located CSS:

```css
@layer reset, base, components, custom, routes, overrides;
```

- `reset` (box-sizing, margin reset) → `base` (typography, NO layout) → `components` (`ui-*`, `ripple__wave`) → `custom` (`nav`, `beams-background`, page-specific blocks) → `routes` (RARE, e.g. `plans-page`) → `overrides` (MUI/`!important`/`cursor:none`). Priority increases downward: `custom` overrides `components`, `routes` overrides components — RARE, `overrides` = last resort.
- Every co-located `*.css` MUST be in the correct `@layer` (`@layer components { … }` / `@layer custom { … }` / `@layer routes { … }`). `@keyframes` outside `@layer` (top-level, global, no specificity). Components with MD3 base + custom parts → **both** `@layer components` and `@layer custom` (MD3 base in `components`, custom variants in `custom`).

### Co-located `.css` — wrapping examples

UI component (MD3 base) — `app/components/ui/button.css`:

```css
@layer components {
  .ui-btn {
    @apply inline-flex relative items-center justify-center gap-1 h-btn-md px-2 rounded-full font-body font-medium text-md select-none duration-medium-2 ease-ui transition-all isolate;
  }

  /* Sizes — RIGHT after base */
  .ui-btn--sm {
    @apply h-btn-sm px-1 text-sm;
  }
  .ui-btn--md {
    @apply h-btn-md px-3 text-md;
  }
  .ui-btn--lg {
    @apply h-btn-lg px-4 text-lg;
  }

  .ui-btn__ripple {
    /* … */
  }
  .ui-btn__state-layer {
    /* … */
  }

  /* Variants */
  .ui-btn--primary {
    @apply bg-primary text-on-primary;
  }

  @media (hover: hover) {
    .ui-btn:hover .ui-btn__state-layer {
      @apply opacity-[0.1];
    }
  }
}
```

Custom component — `app/components/custom/nav.css` (per project):

```css
@layer custom {
  .nav {
    @apply fixed inset-x-0 top-0 z-navigation flex h-12 w-full pointer-events-none;
  }

  .nav__container {
    /* … */
  }
  .nav__logo {
    /* … */
  }
}
```

Hybrid (MD3 + custom parts) — co-located `.css` with BEM + `@apply`:

```css
@layer components {
  .pad-ripple {
    /* … */
  }
  @keyframes pad-ripple-effect {
    /* … */
  }
}

@layer custom {
  .pad-ripple--animate {
    animation: pad-ripple-effect 0.6s ease-out forwards;
  }
}
```

Route-specific — `app/routes/main/plans.css`:

```css
@layer routes {
  .plans-page {
    &::before {
      background: radial-gradient(
        circle,
        color-mix(in oklch, var(--color-primary) 50%, transparent) 0%,
        transparent 80%
      );
      /* … */
    }
  }
}

@keyframes pulse-glow {
  /* … */
}
```

### Section in component `.css` (CRITICAL)

Base class → **size variants `--sm`/`--md`/`--lg` (RIGHT after base, before everything)** → sub-elements (`__ripple`/`__state-layer`/…) → state layer hover/focus/active → color variants → square/icon → responsive (`--{bp}-sm/md/lg`) → states (`data-state`/`--loading`/…) → remaining sub-elements. Size variants BEFORE everything else — applies to ALL components (UI `ui-*` + custom + page-specific).

- **Default size variant** = height token (`h-btn-md`) + text (`text-md`) + icon size only. `px`/`py`/`gap`/`rounded` stay on the base class (constant across sizes).
- **Size-driven spacing & shape (per-component, on demand)** — when explicitly requested for a specific component, the size modifier ALSO overrides `px`/`py`/`gap`/`rounded` (each size gets its own values). Move these out of the base class into each `--sm`/`--md`/`--lg` modifier — never duplicate. Currently: `Select` (trigger + popover items), `Menu` (content + items). Full rules + examples → `components.md` § "Size-driven spacing & shape".

- `@layer base` contains **ONLY** typography — layout padding explicitly (`px-site`, `pt-*`, `min-h-dvh`). In `app/styles/tailwind.css` (lines 395-432): `body` (`bg-surface font-body font-regular text-md leading-regular text-on-surface`), `h1-h5`/`.h0-h5` (`font-header font-semibold` + size), `strong` (`font-regular`).

## No-duplicate-styles (CRITICAL — every element, not just headings)

Before adding **any** utility to `className` (route) OR `@apply` in `.css` (component/variant), check whether the property **already comes** from one of the 7 sources:

1. **`@layer base`** — `body` (`text-on-surface font-body font-regular text-md leading-regular`), `h1-h5`/`.h0-h5` (`font-header font-semibold` + size), `strong` (`font-regular`). Do NOT repeat in `className`.
   - `<h1 className="text-4xl">` OK (only size override).
   - `<h1 className="font-header font-semibold text-5xl">` NO (heading defaults already have it).
   - `<p className="text-on-surface-variant">` OK (only color override).
   - `<main className="text-on-surface font-body">` NO (inherited from body).
   - `<div className="font-header font-semibold text-2xl">` OK (non-heading — needed, `div` does not inherit heading defaults).
2. **`@apply` in co-located `.css` of the component** — do not add again in `className`.
   - `<Button className="bg-primary text-on-primary rounded-full">` NO — `.ui-btn` and `.ui-btn--primary` already set it.
   - `<Button className="shadow-md">` OK — only override.
   - `<Button variant="primary" />` OK — variant decides.
   - `<Dialog className="bg-elevation-2 rounded-2xl shadow-lg">` NO — `.ui-dialog__content` already has it.
   - `<Dialog className="max-w-mod-unit-8">` OK — override.
3. **Variant** — contains ONLY override; do not repeat base.
   - `.ui-btn--primary` = only `bg-primary text-on-primary` (does not repeat `rounded-full`/`transition-all`/`isolate`).
   - `.ui-btn--sm` = only `h-btn-sm px-1 text-sm` (does not repeat `inline-flex`/`relative`/`font-body`).
   - `.ui-btn--square` = only `gap-0 aspect-square p-0` (does not repeat size).
4. **Token `@theme`** — use utility instead of arbitrary values.
   - `bg-surface` instead of `bg-[oklch(14%_0.019_274.6deg)]`.
   - `h-btn-md` instead of `h-[5.5rem]`.
   - `ease-ui` instead of `ease-[cubic-bezier(0.2,0,0,1)]`.
   - `rounded-xl` instead of `rounded-[1.5rem]`.
5. **State layer/uix-ripple** — do NOT add `hover:bg-*` if the component has `__state-layer`.
   - `<Button className="hover:bg-elevation-2">` NO — state layer overlay does that.
   - `.ui-btn:hover { @apply bg-elevation-2; }` NO — this is state layer, not bg change.
   - `.ui-btn:hover .ui-btn__state-layer { @apply opacity-[0.1]; }` OK (in `@media (hover: hover)`).
6. **CSS inheritance** — `color`/`font-family`/`font-size`/`font-weight`/`line-height`/`letter-spacing`/`text-align`/`cursor`/`list-style`/`visibility` are inherited; do not repeat.
   - `<section className="text-on-surface"><div className="text-on-surface">` NO — child inherits.
   - `<main className="font-body"><p className="font-body">` NO — both inherit from body.
   - `<nav className="text-on-surface"><span className="text-on-surface-variant">` OK — span overrides color, does not duplicate.
7. **Tailwind built-in** — `font-bold` = `font-semibold` for us (600, NOT 700); do not use both. `font-bold` does not exist in the scale; use `font-semibold`.

## Property order in `@apply` (CRITICAL — single source of truth)

> Fixed order improves readability + review + prevents duplicates. Single source of truth: `scripts/tw-order.ts` `ORDER_GROUPS` (mirrors `order/properties-order` from `stylelint.config.js`).

Order of groups in `ORDER_GROUPS` (first matching group wins; variants like `hover:`, `tablet:` are stripped before lookup):

1. **Display & visibility** — `block`, `inline-block`, `inline`, `inline-flex`, `inline-grid`, `inline-table`, `table-*`, `flow-root`, `contents`, `list-item`, `hidden`, `visible`, `invisible`, `collapse`
2. **Position** — `static`, `fixed`, `absolute`, `relative`, `sticky`
3. **Inset / z-index / float / clear** — `inset`, `inset-x`, `inset-y`, `top`, `right`, `bottom`, `left`, `start`, `end`, `z`, `float`, `clear`
4. **Overflow / overscroll / clip** — `overflow`, `overflow-x`, `overflow-y`, `overscroll`, `overscroll-x`, `overscroll-y`, `clip`
5. **Flexbox** — `flex`, `order`, `grow`, `shrink`
6. **Grid** — `grid`, `col`, `row`, `auto-cols`, `auto-rows`
7. **Alignment** — `place-content`, `place-items`, `place-self`, `justify`, `justify-content`, `justify-items`, `justify-self`, `align-content`, `align-items`, `align-self`, `content-*`, `items-*`, `self-*`
8. **Gap / space** — `gap`, `gap-x`, `gap-y`, `row-gap`, `column-gap`, `space-x`, `space-y`, `space-x-reverse`, `space-y-reverse`
9. **Box-sizing / container** — `box-border`, `box-content`, `box-decoration`, `container`, `@container`
10. **Sizing** — `w`, `min-w`, `max-w`, `h`, `min-h`, `max-h`, `aspect`, `size`, `size-min`, `size-max`
11. **Padding** — `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `ps`, `pe`
12. **Margin** — `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`, `ms`, `me`
13. **Background** — `bg`, `backdrop`, `from`, `via`, `to`
14. **Border + divide + rounded + ring + outline + shadow** — `border`, `border-x`, `border-y`, `border-t`, `border-r`, `border-b`, `border-l`, `border-s`, `border-e`, `divide`, `divide-x`, `divide-y`, `rounded`, `rounded-t`, `rounded-r`, `rounded-b`, `rounded-l`, `rounded-s`, `rounded-e`, `rounded-tl`, `rounded-tr`, `rounded-br`, `rounded-bl`, `ring`, `inset-ring`, `ring-offset`, `outline`, `shadow`, `inset-shadow`
15. **Opacity / filter / blend** — `opacity`, `filter`, `blur`, `brightness`, `contrast`, `grayscale`, `hue-rotate`, `invert`, `saturate`, `sepia`, `drop-shadow`, `mix-blend`
16. **Font** — `font`, `leading`, `tracking`, `word-spacing`
17. **Text — specific** — `text-center`, `text-left`, `text-right`, `text-justify`, `text-start`, `text-end`, `text-wrap`, `text-nowrap`, `text-pretty`, `text-balance`, `text-ellipsis`, `text-clip`, `text-shadow`, `uppercase`, `lowercase`, `capitalize`, `normal-case`, `underline`, `overline`, `line-through`, `no-underline`, `decoration`, `underline-offset`, `antialiased`, `subpixel-antialiased`, `truncate`
18. **Text catch-all** — `text`
19. **Whitespace / break / hyphens** — `whitespace`, `break`, `hyphens`, `word-break`
20. **Content / cursor / interaction** — `content-none`, `cursor`, `pointer-events`, `select`, `touch`, `resize`, `caret`, `accent`
21. **Transform** — `transform`, `rotate`, `scale`, `translate`, `skew`, `origin`, `perspective`, `backface`
22. **Transition / animation / motion** — `transition`, `duration`, `ease`, `delay`, `animate`, `motion`
23. **Will-change / contain / isolation** — `will-change`, `contain`, `isolate`, `isolation`
24. **Scroll / snap** — `scroll`, `snap`
25. **Columns / page-break** — `columns`, `column`, `break-before`, `break-after`, `break-inside`
26. **List** — `list`, `marker`
27. **Fill / stroke** — `fill`, `stroke`
28. **Object** — `object`
29. **Placeholder / indent / vertical-align** — `placeholder`, `indent`, `align-middle`, `align-baseline`, `align-top`, `align-bottom`, `align-text-top`, `align-text-bottom`, `align-sub`, `align-super`
30. **Misc** — `appearance`, `scheme`, `forced-color`, `mask`, `tab`, `ordinal`, `slashed-zero`, `lining`, `oldstyle`, `proportional`, `stacked`, `diagonal`, `ring-offset`

Classes outside groups are sorted alphabetically at the end. Autofix:

- TSX `className` — `pnpm fmt:style` → `tsx scripts/tw-order.ts`.
- CSS `@apply` — `pnpm fmt:style` → `stylelint --fix` (custom plugin `scripts/stylelint-apply-order.ts`, rule `apply-apply/order`).
- CSS properties — `stylelint.config.js` `order/properties-order`.

### Worked `@apply` example

Unsorted (demonstration example, do not commit in this order):

```css
@apply isolate transition-all duration-medium-2 ease-ui select-none font-medium text-md font-body rounded-full px-2 h-btn-md gap-1 justify-center items-center relative inline-flex;
```

After `stylelint --fix` / `pnpm fmt:style` (order from `ORDER_GROUPS`):

```css
@apply inline-flex
  relative
  items-center
  justify-center
  gap-1
  h-btn-md
  px-2
  rounded-full
  font-body
  font-medium
  text-md
  select-none
  duration-medium-2
  ease-ui
  transition-all
  isolate;
```

(This exact order is used in `app/components/ui/button.css` lines 3-18.)

- `/* 1. … */` comments — optional, recommended in long `@apply` (5+ utilities), omitted in short ones.
- State pseudo-classes — only change: `.ui-btn:hover .ui-btn__state-layer { @apply opacity-[0.1]; }`.
- Variant classes — only override (size+spacing+typography for `--sm`/`--md`/`--lg`; color+effects for `--primary`).

## Inline (routes) — what and how

- **All route elements default → inline Tailwind**, any number of classes (no threshold).
- `@media` → `phone:`/`tablet:`/`desktop:`/… variants. `group` + `group-hover:` for sub-element states.
- 3rd-party override → arbitrary variants `[&_.ui-*]:`. **BEM `__` → spaces!** Use `String.raw` + `\_`: `String.raw\`[&_.ui-text-field\_\_container]:border-on-primary\``.
- `color-mix`/`radial-gradient` → inline `style` or arbitrary values: `text-[color-mix(in_oklch,var(--color-primary)_40%,transparent)]`.
- Logical state → conditional `className` (`cn("base", isOpen && "max-h-[500px] px-8 pb-8")`), NOT BEM `--open`.
- After migrating `.css`→inline: remove empty classes; empty `.css` → delete file + `@import` from `main.css`.

## Animations (CRITICAL)

- **Cross-route `@keyframes`:** top-level in `app/styles/tailwind.css` (outside `@layer`) — e.g. `ripple-anim`. Complex cross-route animations may also be React components.
- **Route-specific:** co-located route `.css` in `@layer routes`, BEM (route prefix = block) + `@keyframes`, e.g. `pulse-glow` in `app/routes/main/plans.css`.
- **`@keyframes` ALWAYS requires `@media (prefers-reduced-motion: reduce) { animation: none }`.** Without exceptions.
- Use tokens (`--ease-ui`, `--duration-*`), never hardcode `cubic-bezier(0.2,0,0,1)`/`300ms`.

## Hover gating (CRITICAL — CSS mechanics)

On touch devices `:hover` becomes "sticky" after tap — the browser emulates hover and leaves it active. Fix: gate `:hover` on `@media (hover: hover)` (only real pointing device). On touch, feedback comes from `:active` (pressed state layer) + uix-ripple.

- **Two kinds of hover — different rules:**
  - Tailwind `hover:`/`group-hover:` in TSX → **already gated** (v4 default, do not override with `@custom-variant hover (&:hover);` — that un-gates).
  - Raw `:hover` in `.css` (`@apply` components, route `.css`, `@utility`) → **NOT gated**, **MUST** be in `@media (hover: hover) { … }` — without exceptions.
- `:focus-visible`/`:active` **NOT gated** — work everywhere (tap=`:active`, keyboard=`:focus-visible`). Keep outside `@media (hover: hover)`.
- Comma-separated selectors mixing `:hover`+`:focus-visible`/`:active`/error states/base → **SPLIT**: only `:hover` into `@media (hover: hover)`, the rest in a separate rule. `&:hover` in nested CSS → wrap `@media (hover: hover) { &:hover { … } }`. `:hover` inside another `@media` (e.g. `@media (--bp-tablet)`) → nest `@media (hover: hover)` inside.

### Wrong / right

Wrong — raw `:hover` in `.css` without gating:

```css
@layer components {
  .ui-btn:hover .ui-btn__state-layer {
    @apply opacity-[0.1];
  }
}
```

Right — always wrap in `@media (hover: hover)`:

```css
@layer components {
  @media (hover: hover) {
    .ui-btn:hover .ui-btn__state-layer {
      @apply opacity-[0.1];
    }
  }
}
```

(This pattern is used in `app/components/ui/button.css` lines 197-201.)

## `data-state` + naming

- `data-state="…"` (kebab-case) on components with dynamic state. In `.css`: `[data-state="…"]` or `.ui-{comp}--{state}` (preferred). **No `is-`/`has-`/`js-` prefixes.**
- Interactive states (hover/focus/pressed) = state layer, NOT `data-state` → `md3-design.md` § 3.
- BEM naming (UI `ui-*`, custom without prefix, route `{route}__`) → `components.md` § "BEM".
- `@theme inline` for fluid `clamp()` — `:root` var + `@theme inline { --text-md: var(--fluid-text-md) }`.

## Don't (CSS mechanics)

- `@material/web`/lit — pure React MD3.
- Non-`.css` style files / `*.style.*` — only `*.css`.
- `sm:`/`md:`/`lg:`/`xl:` Tailwind variants (disabled) — use custom breakpoints (`tokens.md`).
- `h-10`/`h-12` in UI components — `h-btn-md`/`h-text-field-md` etc. In custom/routes `h-*` (rem) OK.
- `rgba()` with OKLCH — `color-mix(in oklch, …)` or `var(--color-*)/alpha`.
- `color-mix` % not divisible by 5; `in srgb` (always omit).
- Unlayered CSS in co-located `*.css`; `!important` outside `@layer overrides`.
- Long inline in UI/custom component `className` — they ALWAYS BEM `.css`. Pages components: inline is the default.
- `className` on a component without need — omit; only route overrides.
- `@apply` in routes auto by class count — RARE, only ordered/CSS-only needs.
- Inline + route BEM on the same element (`<section className="plans bg-black">`).
- Arbitrary `max-w-[calc(var(--x-w-mod-unit)*N)]` — use `*-mod-unit-N` (1-24).
- Global layout in `@layer base`; duplicates from base/`.css`/inheritance in `className`.
- Variant repeating base; size variants out of position right after base.
- Raw `:hover` in `.css` without `@media (hover: hover)`; `:focus-visible`/`:active` inside `@media (hover: hover)`.
- `@custom-variant hover (&:hover);` — un-gates sticky hover on mobile.
- Empty `.css`/`@layer routes {}` after migration — delete file + `@import`.
