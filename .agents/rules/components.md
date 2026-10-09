# React components — implementation (pure React MD3)

> Component implementation patterns. MD3 concepts (color roles, state layer, ripple, shape, motion) → `md3-design.md`. CSS mechanics → `styling.md`. Tokens → `tokens.md`.
> **Forbidden:** `@material/web`, `@lit-labs/ssr`, lit. MD3 components written from scratch (TSX + `.css`). SSR native on Cloudflare Workers (no `customElements.define`).

## Categories and locations

- **UI** — `app/components/ui/` — pure MD3 (`md3-*` BEM, `useRipple`, state layer)
- **Custom** — `app/components/custom/` — business logic (Nav, Slider, FileDrop), minimal intervention. Not present in the template — add per project.
- **Pages** — `app/components/pages/` — groups per page (`pages/home/`, `pages/main/play/`)
- **Utils** — `app/components/utils/` — `cn.ts` (clsx wrapper), `variants.ts` (CVA `createVariants`), `modifiers.ts` (`getModifierClasses`)

Category choice = scope and convention decision. A UI component must be generic, without business domain — if it refers to Pad state, game logic, or an endpoint → custom or pages. A custom component may import UI; UI does NOT import custom/pages. Pages may import UI and custom.

## Styles — layers

Components ALWAYS use `@apply` in co-located `.css` (never long inline). UI → `@layer components`, custom → `@layer custom`, mix → both. Keyframes outside `@layer`. Full cascade rules → `styling.md` § "@layer cascade".

## File naming

- UI MD3: `button.tsx` + `button.css` (BEM `md3-*`, `@apply`)
- Custom: `pad.tsx` + `pad.css` (BEM, `@apply`)
- Route: `index.tsx` — inline Tailwind by default; `@apply` in route `.css` RARE. See `styling.md` § "3-tier hybrid".
- Split route section: `index.hero.tsx` / sub-section `index.about.tsx` — inline Tailwind by default; `.css` rarely (like route)
- Client-only: `beams.client.tsx` + `beams.css`
- Styles always `.css` (e.g. `index.about.css`) — never another extension

## BEM

- UI: prefix `md3-` (`md3-btn`, `md3-btn--primary`, `md3-btn__state-layer`)
- Custom: no prefix (`pad`, `pad__ripple`, `pad--active`, `nav`, `nav__link`)
- `block` = component name (kebab-case) · `block__element` = sub-element · `block--modifier` = variant/state
- Modifier = variant (`--primary`) OR state (`--disabled`, `--loading`, `--selected`); interactive state (hover/focus/pressed) NEVER as a modifier — implemented via `__state-layer`
- **Forbidden** `is-`/`has-`/`js-` prefixes (state in `data-state` + BEM modifier). Exception: `--has-toggle`/`--has-toggle` when describing a permanent structural feature (e.g. `md3-text-field--has-toggle`), NOT state.

## UI component anatomy — example (button)

Minimal, real skeleton cut from `app/components/ui/button.tsx` + `button.css`. Every UI component replicates this shape.

### TSX (`button.tsx`)

```tsx
import * as React from "react";

import { Link } from "react-router";

import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

// 1. CVA: first arg = BEM block; variant classes are `md3-btn--{value}`
const buttonVariants = createVariants("md3-btn", {
  variants: {
    variant: {
      primary: "md3-btn--primary",
      outline: "md3-btn--outline",
      error: "md3-btn--error"
    },
    size: { sm: "md3-btn--sm", md: "md3-btn--md", lg: "md3-btn--lg" },
    aspectSquare: { true: "md3-btn--square", false: "" }
  },
  defaultVariants: { variant: "primary", size: "md", aspectSquare: false }
});

// 2. Props = native attrs + VariantProps<typeof buttonVariants>
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  state?: "default" | "disabled" | "loading";
  selected?: boolean;
  to?: string;
  Icon?: React.ReactNode;
  IconPosition?: "BeforeText" | "AfterText";
}

// 3. forwardRef with union HTMLButtonElement | HTMLAnchorElement (because `to` → <Link>)
const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      state = "default",
      to,
      Icon,
      IconPosition = "BeforeText",
      children,
      ...props
    },
    ref
  ) => {
    // 4. useRipple<T>(disabled) — surfaceRef on <span __ripple>, handlers on root
    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(state === "disabled");
    // 5. md3State: "default" → "enabled"; selected → "selected"; loading → "loading"
    const md3State = state === "default" ? "enabled" : state;

    // 6. cn: variants, states, rippleState.pressed, className ALWAYS last
    const cls = cn(
      buttonVariants({ variant, size: size || "md", aspectSquare }),
      state === "loading" && "md3-btn--loading",
      rippleState.pressed && "md3-btn--pressed",
      className
    );

    // 7. content: __ripple (with <span class="ripple">) → __state-layer → __icon → __label
    const content = (
      <>
        <span ref={surfaceRef} className="md3-btn__ripple" aria-hidden="true">
          <span className="ripple" />
        </span>
        <span className="md3-btn__state-layer" aria-hidden="true" />
        {Icon && <span className="md3-btn__icon">{Icon}</span>}
        <span className="md3-btn__label">{children}</span>
      </>
    );

    // 8. to → <Link> (ref cast to HTMLAnchorElement), else <button> (ref cast to HTMLButtonElement)
    if (to) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={to}
          className={cls}
          data-state={md3State}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          {...handlers}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cls}
        data-state={md3State}
        disabled={state === "disabled"}
        {...handlers}
        {...props}
      >
        {content}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

### CSS (`button.css`)

Section order (CRITICAL): base → size variants RIGHT AFTER base → sub-elements → state layer hover/focus/active → color variants → square/icon → states → rest. Keyframes OUTSIDE `@layer`.

```css
@layer components {
  .md3-btn {
    @apply inline-flex relative items-center justify-center h-btn-md rounded-full
      font-medium text-md select-none transition-all isolate;
  }

  /* Size variants — RIGHT AFTER base */
  .md3-btn--sm {
    @apply h-btn-sm px-1 text-sm;
  }
  .md3-btn--md {
    @apply h-btn-md px-3 text-md;
  }
  .md3-btn--lg {
    @apply h-btn-lg px-4 text-lg;
  }

  /* Sub-elements */
  .md3-btn__ripple {
    @apply absolute inset-0 z-below overflow-hidden rounded-[inherit] pointer-events-none;
  }
  .md3-btn__state-layer {
    @apply absolute inset-0 bg-current rounded-[inherit] opacity-0 pointer-events-none transition-opacity;
  }

  /* State layer hover/focus/active */
  .md3-btn:focus-visible .md3-btn__state-layer {
    @apply opacity-[0.1];
  }
  .md3-btn:active .md3-btn__state-layer {
    @apply opacity-[0.1];
  }
  @media (hover: hover) {
    .md3-btn:hover .md3-btn__state-layer {
      @apply opacity-[0.1];
    }
  }

  /* Color variants — set --ripple-color and bg/text */
  .md3-btn--primary {
    --ripple-color: var(--color-on-primary);
    @apply bg-primary text-on-primary;
  }
  .md3-btn--outline {
    --ripple-color: var(--color-elevation-1);
    @apply bg-transparent border border-outline text-on-surface;
  }

  /* States */
  .md3-btn[data-state="disabled"] {
    @apply opacity-50 cursor-not-allowed;
  }
}

/* Keyframes OUTSIDE @layer */
@keyframes md3-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
```

## `__ripple` + `__state-layer` — `rounded-[inherit]` (CRITICAL)

Both `__ripple` and `__state-layer` MUST use `rounded-[inherit]` — NEVER a hardcoded `rounded-*` token. They are `absolute inset-0` overlays that must exactly match the parent's shape; hardcoding drifts when the parent's `rounded-*` changes.

### Overlay utilities (preferred — less boilerplate)

`app/styles/utilities/md3.css` defines two `@utility` primitives that encapsulate the full overlay pattern. Use them via `@apply` in component `__ripple` / `__state-layer` instead of repeating 6-7 declarations:

| Utility              | Replaces                                                                                         | Used on                 |
| -------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| `md3-ripple-surface` | `absolute inset-0 z-below overflow-hidden rounded-[inherit] pointer-events-none`                 | `__ripple` overlay      |
| `md3-state-layer`    | `absolute inset-0 bg-current rounded-[inherit] opacity-0 pointer-events-none transition-opacity` | `__state-layer` overlay |

```css
/* PREFERRED — one line, no boilerplate */
.md3-select__item-ripple {
  @apply md3-ripple-surface;
}
.md3-select__item-state-layer {
  @apply md3-state-layer;
}
```

```css
/* LEGACY — still works, but verbose. Migrate to utilities when touching a file. */
.md3-btn__ripple {
  @apply absolute inset-0 z-below overflow-hidden rounded-[inherit] pointer-events-none;
}
.md3-btn__state-layer {
  @apply absolute inset-0 bg-current rounded-[inherit] opacity-0 pointer-events-none transition-opacity;
}
```

```css
/* WRONG — hardcoded token drifts from parent shape */
.md3-btn__state-layer {
  @apply ... rounded-full ...;
}
.md3-checkbox__ripple {
  @apply ... rounded-xs ...;
}
```

Prerequisite: the parent block (`.md3-btn`, `.md3-checkbox`, `.md3-select__item`, etc.) MUST set its own `rounded-*` in the base class — `inherit` resolves to it. If the parent has no `rounded-*` on the base class (e.g. `.md3-switch` originally had none), ADD it there first (`rounded-full` for switch), then use `rounded-[inherit]` on the overlays.

Applies to ALL components in `app/components/` (ui, custom, pages) that render a `__ripple` and/or `__state-layer` overlay.

## `data-state` — full value list

`data-state` values used in code (TSX + CSS selectors). Interactive state (hover/focus/pressed) is NOT via `data-state` — via `__state-layer` overlay.

| Value             | When                                                          | Where                                        |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `enabled`         | default; `state="default"` maps to `enabled`                  | Button, Chip, Select, Switch, Checkbox, etc. |
| `disabled`        | `state="disabled"` or `disabled` prop                         | all interactive                              |
| `loading`         | `state="loading"`                                             | Button                                       |
| `selected`        | toggle (Button `selected`), SegmentedButton item, Chip filter | Button, SegmentedButton, Chip, Select item   |
| `checked`         | Checkbox, Switch, Radio — checked state                       | Checkbox, Switch                             |
| `indeterminate`   | Checkbox — indeterminate state (tri-state)                    | Checkbox                                     |
| `open` / `closed` | Dialog, Menu, NavDrawer, Select — open state                  | Menu, Select, (Dialog/NavDrawer)             |
| `error`           | validation error state                                        | TextField, TextArea, Select                  |
| `focused`         | manually managed focus (e.g. TextArea)                        | TextArea                                     |

Mapping in TSX: `const md3State = isError ? "error" : props.disabled ? "disabled" : "enabled"` (TextField) or `selected ? "selected" : state === "default" ? "enabled" : state` (Button/Chip). Never keep `hover`/`focus`/`pressed` in `data-state`.

## `iconButton` (instead of a separate IconButton)

- `Button` and `SegmentedButtonItem` have prop `iconButton?: boolean` → `aspect-square`, no padding, only `Icon`, `rounded-full`, size from `--size-icon-btn-*`
- `selected?: boolean` on Button → toggle icon button (`data-state="selected"`)
- `aria-label` **required** when `iconButton`

## Icons scale with `size` (default)

Every inline icon rendered inside a component (`__icon`, `__chevron`, `__check`, `__trailing`, etc.) MUST scale with the component's `size` — never a hardcoded fixed size that ignores `size`. Default mapping (no token needed, hardcoded in `.css`):

| `size` | icon `width`/`height` |
| ------ | --------------------- |
| `sm`   | `1.5rem`              |
| `md`   | `1.75rem`             |
| `lg`   | `2rem`                |

Implementation:

- The SVG keeps its `viewBox` (e.g. `viewBox="0 0 24 24"`) and a fallback `width`/`height` attribute (e.g. `1.5rem`) — the CSS rule overrides it per size.
- **`Icon` component (lucide/simple-icons) workaround:** the `Icon` wrapper sets inline `style={{ width, height }}` when `size` is a string (`"sm"`/`"md"`/…). Inline style beats CSS — so to let CSS control icon size per component `size`, pass a **numeric** `size` (e.g. `size={24}`) which bypasses the inline style path. CSS then overrides the SVG's `width`/`height` attributes. Used in `TextField` (`__toggle-icon`, `__error-icon`).
- **`--md3-icon-size` custom property (preferred):** set `--md3-icon-size` on the base class (default `md`) and override it in each `--sm`/`--lg` size modifier. Then use a single rule per icon wrapper — no 3× repetition:

```css
.md3-select {
  --md3-icon-size: 1.75rem; /* default = md */
}
.md3-select--sm {
  --md3-icon-size: 1.5rem;
}
.md3-select--lg {
  --md3-icon-size: 2rem;
}

/* Single rule — inherits --md3-icon-size from nearest size ancestor */
.md3-select__chevron svg {
  width: var(--md3-icon-size);
  height: var(--md3-icon-size);
}
```

- For portaled content (Select popover, Menu content, Dialog) the size class MUST be added to the portal root — the portal escapes the component subtree, so `.md3-select--lg` on the container does NOT reach the popover. Add `md3-select__popover--${size}` (or `--items-${itemsSize}` when item size is independent, like Play Select) to the portal root in TSX. Set `--md3-icon-size` on the portal root's size modifier too (the var does NOT inherit through portals).
- When a component has separate `size` (trigger) and `itemsSize` (list items) props (e.g. Play Select), the trigger icon (chevron) scales with `size`, the item icons (`__item-icon`, `__item-check`) scale with `itemsSize`.
- Place the icon-size rules in `.css` right after the size variants / chevron section, grouped under a `/* Icon sizes */` label — NOT scattered across the file.
- Applies to ALL components in `app/components/` (ui, custom, pages) that render inline SVG icons. External icon libraries (when used) follow the same rule via the wrapping `__icon` span.

## Size-driven spacing & shape (per-component, on demand)

By default a component's `--sm`/`--md`/`--lg` only swaps **height** (`h-btn-md`) + **text** (`text-md`) + **icon size** (see above). Padding, gap and corner radius stay constant across sizes (defined once on the base class).

**When explicitly requested** (user says "dobierz px/py/rounded/gap per size" / "size-driven spacing" / "zależnie od size"), the size modifier ALSO overrides `px`, `py`, `gap`, `rounded-*` — each size gets its own values. This applies to **specific components the user names**, NOT globally to every component.

### Which components currently use size-driven spacing & shape

| Component | `px`/`py`/`gap`/`rounded` per size   | Where (size modifier)                                                                                       |
| --------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `Button`  | `gap` only (`px`/`rounded` constant) | `app/styles/components/button.css` — `.md3-btn--{size}`, `.play-btn--{size}`                                |
| `Select`  | trigger + popover items              | `select.css` — `.md3-select--{size} .md3-select__trigger`, `.md3-select__popover--{size} .md3-select__item` |
| `Menu`    | content + items                      | `menu.css` — `.md3-menu__content--{size}`, `.md3-menu__content--{size} .md3-menu__item`                     |

### How it looks (+ example)

Base class keeps ONLY the constant properties (layout, font, color, cursor, transitions) — NO `px`/`py`/`gap`/`rounded`. Each size modifier adds them:

```css
/* Base — no px/py/gap/rounded (they vary per size) */
.md3-select__trigger {
  @apply relative flex items-center w-full bg-surface border border-outline-variant
    font-body text-left text-md text-on-surface cursor-pointer select-none
    duration-short-3 ease-md3 transition-colors isolate;
}

/* Size modifiers — px, py, rounded per size */
.md3-select--sm .md3-select__trigger {
  @apply px-2 py-1.5 rounded-xs;
}
.md3-select--md .md3-select__trigger {
  @apply px-3 py-2   rounded-sm;
}
.md3-select--lg .md3-select__trigger {
  @apply px-4 py-3   rounded-md;
}
```

For container-like elements (popover, menu content) `gap` also varies per size:

```css
.md3-menu__content--sm {
  @apply min-w-[8rem] p-1   gap-0.5 rounded-sm;
}
.md3-menu__content--md {
  @apply min-w-[10rem] p-1.5 gap-1   rounded-md;
}
.md3-menu__content--lg {
  @apply min-w-[12rem] p-2   gap-1.5 rounded-lg;
}
```

### Rules

- **Only when requested.** Do NOT preemptively strip `px`/`py`/`rounded` from the base class of every component — most components keep them constant (Button, Chip, Switch, Checkbox, …).
- **Remove from base, add to modifier.** When enabling size-driven spacing for a component, move `px`/`py`/`gap`/`rounded` OUT of the base class and INTO each `--sm`/`--md`/`--lg` modifier — never duplicate (base + modifier with different values = cascade conflict).
- **Height token optional.** With `py-*` controlling height, `h-text-field-*` / `h-list-item-*` can be dropped — `py` + content height defines the box. Keep the height token ONLY if the component must match a fixed-height sibling (e.g. TextField inside a form row).
- **Icon size still applies** (see section above) — independent of whether spacing is size-driven.
- **Scoped modifier for sub-elements.** When the sub-element lives in a portal or nested subtree (Select popover items, Menu items inside `__content`), scope the size override by the ancestor that carries the size: `.md3-select__popover--{size} .md3-select__item { … }`, `.md3-menu__content--{size} .md3-menu__item { … }`.
- **Place size-driven spacing rules RIGHT AFTER the base class** (same slot as regular size variants — see "CSS — section order"). Group trigger/item spacing under a `/* Size modifiers */` label.

## `variant` — when it is / when it is NOT

`variant` = color role (NOT appearance). Full canon: component lists with/without `variant`, variants per component, prohibitions → `md3-design.md` § "variant = color role". In short: only components where color = user choice (actions, statuses) have `variant`; the rest — color from function, hardcode in `.css`, do not add a prop.

## Hover/active border (CRITICAL)

Components without `variant` MUST have `border-primary` on hover/focus/active (instead of `border-outline`/`border-outline-variant`).

- TextField/TextArea/Select: default `border-outline-variant` → hover `border-outline` → focus/active `border-primary`
- Checkbox/Radio/Switch: default `border-outline` → hover `border-outline` → focus/active `border-primary`; checked/on → `border-primary`
- `error` state → border `border-error` (replaces primary)

## Variant vs size vs state — separate axes

Three independent axes of a component. Never mix them in one prop or one CVA variant.

- **variant** = color role (visual axis). Goes through CVA: `createVariants("md3-btn", { variants: { variant: { primary, outline, error } } })`. Each variant sets `--ripple-color` + `bg-*` + `text-*`. Does not carry size or state information.
- **size** = `"sm" | "md" | "lg"`. Separate CVA variant (`size: { sm, md, lg }`). Classes `--sm`/`--md`/`--lg` RIGHT AFTER base in `.css`, use component height tokens (`h-*`, e.g. `h-btn-md`, `h-chip-md`). Custom components: `h-{comp}-{size}` when a matching token exists, otherwise `h-*` in rem. Responsive sizing in route: breakpoint variants (`phone:`/`tablet:`/`desktop:`), NOT `responsiveSize` prop.
- **state** = `data-state` + BEM modifier class (`--disabled`, `--loading`, `--selected`, `--pressed`). State is runtime, NOT a design variant. `state` prop (`"default" | "disabled" | "loading"`) maps to `data-state` (`default`→`enabled`); `selected`/`checked` are separate booleans mapping to `data-state="selected"`/`"checked"`.

Rule: changing `variant` should not require changing `size`; changing `state` should not override color from `variant` (unless `disabled` → `opacity-50`). `aspectSquare`/`iconButton` is a fourth, rarer axis (shape) — also a separate CVA variant.

## ForwardRef + displayName — why ALWAYS

Every UI/custom component MUST be `React.forwardRef` with `displayName`. Three reasons:

1. **Ref cast for element unions.** Components with `to` prop render `<Link>` (`HTMLAnchorElement`) or `<button>` (`HTMLButtonElement`). Ref type is `HTMLButtonElement | HTMLAnchorElement`. Without cast TypeScript rejects `ref` on `<Link>`/`<button>`. Pattern: `ref as React.Ref<HTMLAnchorElement>` (`to` branch) and `ref as React.Ref<HTMLButtonElement>` (button branch). Props also cast: `{...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}`.
2. **Devtools name.** Without `displayName` React DevTools shows anonymous `ForwardRef`. `Button.displayName = "Button"` → readable tree, easier debugging, better error messages.
3. **forwardRef propagation.** Ref must reach the DOM element so parent can `.focus()`, measure `getBoundingClientRect()`, scroll, or pass further. Components without forwardRef force parent to `wrapperRef` + `querySelector` — anti-pattern.

Pattern (Button):

```tsx
const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    /* ... */
  }
);
Button.displayName = "Button";
```

Components without `to` (e.g. TextField, Switch) have simpler ref type (`HTMLInputElement`, `HTMLButtonElement`) — no cast — but `forwardRef` + `displayName` still applies.

## TSX — structure (summary)

- `createVariants("md3-btn", { variants: { variant, size, aspectSquare }, defaultVariants: { variant: "primary", size: "md", aspectSquare: false } })` — CVA; first arg = BEM block, variant classes are `md3-btn--{value}`; `VariantProps<typeof x>` for typing component props
- `useRipple<T>(state === "disabled")` → `{ surfaceRef, handlers, rippleState }`; `surfaceRef` ref on `<span __ripple>` (not root); `handlers` spread on root element; `rippleState.pressed` → `--pressed` class
- `cn(variants, states, rippleState.pressed && "md3-btn--pressed", className)` — `className` ALWAYS at the end (allows override from outside)
- Render: `<span ref={surfaceRef} __ripple>` + `<span __state-layer>` + `Icon` (in `<span __icon>`) + `<span __label>{children}</span>`; `IconPosition` = `BeforeText`/`AfterText`
- `to` → render `<Link>` (ref cast to `HTMLAnchorElement`, props as `AnchorHTMLAttributes`), else `<button>` (ref on `HTMLButtonElement`)
- `React.forwardRef<...>` + `Button.displayName = "Button"` — ALWAYS; ref cast because union `HTMLButtonElement | HTMLAnchorElement`
- `data-state` = `"enabled"` (default) / `"disabled"` / `"loading"` / `"selected"` / `"checked"` / `"indeterminate"` / `"open"` / `"closed"` / `"error"` / `"focused"` (full list above)
- Interactive state (hover/focus/pressed) NOT via `data-state` — via `__state-layer` overlay

## CSS — section order (CRITICAL)

base class → **size variants (`--sm`/`--md`/`--lg`) RIGHT AFTER base** → sub-elements → state layer hover/focus/active → color variants → square/icon → responsive → states → rest of sub-elements. Keyframes OUTSIDE `@layer`. Full rule (applies to ALL UI + custom components) → `styling.md` § "@layer cascade".

## Property order in `@apply`

positioning → display/layout → **size** → spacing → typography → color → shape → effects → animation → interaction → custom utility. Details → `styling.md` § "Property order".

## Props

- `size?: "sm" | "md" | "lg"` — every component (from ui, not custom/pages); classes EXPLICIT in `.css` (`--sm`/`--md`/`--lg`) using component height tokens (`h-*`, e.g. `h-btn-md`). Custom components: `h-{comp}-{size}` when a matching token exists, otherwise `h-*` in rem.
- `aspectSquare?: boolean` — `aspect-square p-0 gap-0`; always true for IconButton; for Button when icon-only
- Responsive sizing in route: breakpoint variants (`phone:`/`tablet:`/`desktop:`), NOT `responsiveSize` prop

## React imports — namespace convention

**Always** import React as a namespace and access every API through `React.*`:

```tsx
import * as React from "react";
```

- Hooks: `React.useEffect`, `React.useState`, `React.useRef`, `React.useCallback`, `React.useMemo`, `React.useContext`, `React.useReducer`
- Types: `React.ReactNode`, `React.CSSProperties`, `React.FC`, `React.ReactElement`, `React.RefObject`, `React.HTMLAttributes<T>`, `React.ButtonHTMLAttributes<T>`, `React.FormEvent<T>`, etc.
- Non-hook values: `React.createContext`, `React.useContext`, `React.forwardRef`, `React.memo`, `React.Fragment`, `React.StrictMode`, `React.startTransition`, `React.createElement`
- JSX elements that reference React built-ins: `<React.Fragment>`, `<React.StrictMode>`, `<React.Suspense>` (NOT bare `<Fragment>` / `<StrictMode>`)
- **Forbidden:** `import { useEffect, useState } from "react"`, `import type { ReactNode } from "react"`, `import React, { useState } from "react"` (default + named), `import React from "react"` (default-only). The only accepted form is `import * as React from "react"`.
- **No duplicate imports from `"react"`** — one `import * as React from "react"` per file, never a second `import { useState } from "react"` alongside it.
- **Re-exporting a React type** from a module: use `export type { X } from "react";` (re-export directly from the source module). Never `export type { React.X };` — that is invalid syntax.

## SSR (`useRipple`)

Hook (`app/lib/hooks/use-ripple.ts`) is SSR-safe: `typeof window === "undefined"` guard in `spawnRipple`, DOM ops only in handlers (after hydration), `window.matchMedia` called only in handler (not top-level). Returns `{ surfaceRef, handlers, rippleState }`. `surfaceRef` type `RefObject<T | null>` (React 19). Ripple honors `prefers-reduced-motion` (skip animation, state layer remains). `RIPPLE_DURATION = 600ms`.

Full SSR rules (guard, `useEffect` for listeners, `window.matchMedia` only in `useEffect`) → `md3-design.md` § 4.

## Utility helpers

- `cn` (`app/components/utils/cn.ts`) — clsx wrapper: `clsx(inputs)` (accepts `ClassValue[]`)
- `createVariants` (`app/components/utils/variants.ts`) — thin CVA wrapper: `cva<T>(...args)` with re-export of `VariantProps` and `cva`
- `getModifierClasses` (`app/components/utils/modifiers.ts`) — Proxy-based builder → `${componentName}--{kebab}` (camelCase → kebab). Used rarely (when modifiers are dynamic, not in main CVA flow)
- `useRipple` (`app/lib/hooks/use-ripple.ts`) — ripple + state layer
- **No barrel exports** — import per-file. Exception: `utils/index.ts` (re-exports `cn` from `cn.ts`)

## A11y

- `aria-*` on all interactive; `role` for non-semantic (e.g. `role="switch"` on Switch, `role="alert"` on `__error`)
- Enter/Space (button), Escape (dialog/menu), Tab (focus trap in dialog)
- Visible focus ring (`:focus-visible` + state layer 10%)
- `aria-label` required for IconButton; `aria-pressed`/`aria-checked` for toggle/switch
- `tabIndex={-1}` for internal toggles (e.g. password toggle in TextField) when it should not be in tab order

## MUI Slider (exception)

- The only thing remaining from `@mui/material`; styles in `.css` with `@apply` in `@layer overrides`; MUI requires `!important` with comment `/* MUI override */`

## When to add a new component — checklist

Before creating a new file, go through the list:

1. **Location.** UI (`app/components/ui/`) when pure MD3, generic, without domain. Custom (`app/components/custom/`) when business logic (Nav, Slider, FileDrop). Pages (`app/components/pages/<route>/`) when specific to one page. If a component is shared between pages → UI or custom.
2. **Naming.** kebab-case file = BEM block. UI → `md3-` prefix (`md3-btn`, `md3-text-field`). Custom → no prefix (`pad`, `nav`, `file-drop`). Pages → no `md3-`, page prefix if collision (`play-btn`).
3. **Co-located CSS.** `.css` file next to `.tsx` (`button.tsx` + `button.css`). Always `.css`, never another extension. UI → `@layer components`, custom → `@layer custom`, mix → both.
4. **Ripple if interactive.** `useRipple<T>(disabled)` on every clickable component (Button, Chip interactive, Switch, Checkbox, SegmentedButton item). `surfaceRef` on `<span __ripple>`, `handlers` on root, `rippleState.pressed` → `--pressed`. Non-interactive components (TextField input, display-only Chip) skip ripple.
5. **CVA if variants.** `createVariants(block, { variants: { variant, size, ... }, defaultVariants })` when component has `variant` (color role) or `size`. Classes `--{value}`. `VariantProps<typeof x>` in props interface. If no variants (e.g. TextField has no color role `variant`, has `size` and glass `variant`) — still CVA for `size`, glass as structural variant.
6. **`data-state` if states.** `data-state` on root for `enabled`/`disabled`/`loading`/`selected`/`checked`/`indeterminate`/`open`/`closed`/`error`/`focused`. Interactive state (hover/focus/pressed) via `__state-layer`, NOT via `data-state`. Mapping in TSX: `const md3State = isError ? "error" : disabled ? "disabled" : "enabled"`.
7. **forwardRef + displayName.** `React.forwardRef<HTMLElement, Props>` + `Component.displayName = "Name"`. Ref cast to union if `to` (`HTMLButtonElement | HTMLAnchorElement`).
8. **Props shape.** `extends React.{Button,Span,Input}HTMLAttributes<HTMLElement>, VariantProps<typeof variants>`. `className` ALWAYS last in `cn`. `size?: "sm" | "md" | "lg"`. `Icon`/`IconPosition` if icons. `to` if navigation.
9. **No barrel export.** Import per-file from `#/components/ui/button` (not `#/components/ui`). Exception: `#/components/utils` (barrel OK).

## Comments — formatting and structure

### TSX (`.tsx` files)

- **Section separators** — use for major logical divisions:
  ```tsx
  // ──────────────────────────────────────────────────────────────
  // Section Name
  // ──────────────────────────────────────────────────────────────
  ```
- **Section headers** — single line with section name:
  ```tsx
  // Helpers
  // Context
  // Component (Dialog)
  // Types
  ```
- **Inline comments** — use sparingly for complex logic only:
  ```tsx
  // Map selected values to display labels
  const labels = items.filter((it) => selectedValues.includes(it.props.value));
  ```
- **Comment consistency** — add section comments for: helpers, context, types, component definitions, utility functions

### CSS (`.css` files)

- **File header** — multiline description at top:
  ```css
  /* ────────────────────────────────────────────────────────────
   * Component Name — brief description
   * Detailed explanation of purpose, shared structure, variants
   * References to related files or tokens
   * ──────────────────────────────────────────────────────────── */
  ```
- **Section headers** — simple format:
  ```css
  /* Root */
  /* Sizes */
  /* States */
  ```
- **Inline comments** — single line descriptions:
  ```css
  /* Size variants — RIGHT AFTER base */
  /* Hover gating — only on devices that support hover */
  /* Icon size via --md3-icon-size */
  ```
- **Comment consistency** — every logical section should have a header; group related rules with comments

### Comment quality

- **Be concise** — explain WHY, not WHAT (code shows what)
- **No redundancy** — don't comment obvious code
- **Keep current** — update comments when code changes
- **Use consistent terminology** — match project language (MD3, BEM, state layer, ripple, etc.)

## Don't (component-specific)

- `@material/web`/`@lit-labs/ssr`/lit
- Passing `className` to a UI component when unnecessary — omit entirely
- Barrel exports of components
- Duplicating styles from `@apply` `.css` in `className`
- Repeating in a variant what is in base (variant = overrides only)
- Size variants (`--sm`/`--md`/`--lg`) anywhere other than right after base class
- Interactive state (hover/focus/pressed) as `data-state` OR BEM modifier — only `__state-layer`

General CSS anti-patterns (`h-10`/`h-12`, `is-`/`has-`/`js-`, `sm:`/`md:`/`lg:`, duplicates with `@layer base`/inheritance, `bg-[oklch(...)]`) → `styling.md` § "Don't" + "No-duplicate-styles".
