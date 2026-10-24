# MD3 Design — source of truth for design

> MD3 / Material You concepts. React implementation → `components.md`. CSS mechanics → `styling.md`. Tokens → `tokens.md`.

## Goal and stack

- The app must look and behave like an **authentic Google product** (MD3 / Material You, dark), not "MD3-inspired".
- Stack: pure React MD3 (without `@material/web`), React Router v8, React 19, Cloudflare Workers, Tailwind v4.
- Implementation source of truth: `app/components/ui/*.tsx` + `*.css`.
- Color tokens in `@theme` (OKLCH): palette in `app/styles/theme.css`, glass variants in `app/styles/utilities/colors.css`, light-mode overrides in `app/styles/utilities/theme.css`. Components in `app/components/ui/`.
- `useRipple` hook: `app/lib/hooks/use-ripple.ts`.

## 1. Color roles (not "colors")

MD3 uses a **role-based color system** (`surface`, `on-surface`, `primary`, `on-primary`, `outline`, `error`, …). These are not primary/secondary/tertiary palettes in the classic sense — every role has semantics: "what something lies on" and "what lies on it".

### Real tokens from `@theme` (palette in `app/styles/theme.css`, glass variants in `app/styles/utilities/colors.css`)

Tokens generate `bg-*`, `text-*`, `border-*` utilities. Groups below.

#### Surfaces (surface hierarchy)

| Role | CSS var | Tailwind | Description |
| --- | --- | --- | --- |
| `surface` | `--color-surface` | `bg-surface` / `text-on-surface` | Base background, darkest |
| `on-surface` | `--color-on-surface` | `text-on-surface` | Text on `surface` |
| `on-surface-variant` | `--color-on-surface-variant` | `text-on-surface-variant` | Secondary/muted text (`color-mix(on-surface 70%, transparent)`) |
| `elevation-1` | `--color-elevation-1` | `bg-elevation-1` / `text-on-elevation-1` | Item on `surface` |
| `elevation-2` | `--color-elevation-2` | `bg-elevation-2` / `text-on-elevation-2` | Static panels above `elevation-1` |
| `float` | `--color-float` | `bg-float` / `text-on-float` | Floating chrome (translucent + blur) |
| `popover` | `--color-popover` | `bg-popover` / `text-on-popover` | Modal/floating overlay above `scrim` |
| `scrim` | `--color-scrim` | `bg-scrim` | 60% black overlay under dialog/menu/popover |

#### Primary / Secondary / Tertiary

| Role | CSS var | Tailwind | Description |
| --- | --- | --- | --- |
| `primary` | `--color-primary` | `bg-primary` / `text-on-primary` | Main CTA |
| `primary-container` | `--color-primary-container` | `bg-primary-container` / `text-on-primary-container` | Subtly tinted surface (`color-mix(primary 30%, surface)`) |
| `secondary` | `--color-secondary` | `bg-secondary` / `text-on-secondary` | Tonal MD3 role |
| `secondary-container` | `--color-secondary-container` | `bg-secondary-container` / `text-on-secondary-container` | Tonal surface |
| `tertiary` | `--color-tertiary` | `bg-tertiary` / `text-on-tertiary` | Tonal MD3 role |
| `tertiary-container` | `--color-tertiary-container` | `bg-tertiary-container` / `text-on-tertiary-container` | Tonal surface |

#### Outline

| Role | CSS var | Tailwind | Description |
| --- | --- | --- | --- |
| `outline` | `--color-outline` | `border-outline` | Stronger border (hover, focus) |
| `outline-variant` | `--color-outline-variant` | `border-outline-variant` | Subtler default border (TextField, Checkbox) |

#### States (error / success / info / warning)

| Role | CSS var | Tailwind | Description |
| --- | --- | --- | --- |
| `error` | `--color-error` | `bg-error` / `text-on-error` | Error / destructive |
| `error-container` | `--color-error-container` | `bg-error-container` / `text-on-error-container` | Muted error surface |
| `success` | `--color-success` | `bg-success` / `text-on-success` | Success |
| `success-container` | `--color-success-container` | `bg-success-container` / `text-on-success-container` | Muted success surface |
| `info` | `--color-info` | `bg-info` / `text-on-info` | Info |
| `info-container` | `--color-info-container` | `bg-info-container` / `text-on-info-container` | Muted info surface |
| `warning` | `--color-warning` | `bg-warning` / `text-on-warning` | Warning |
| `warning-container` | `--color-warning-container` | `bg-warning-container` / `text-on-warning-container` | Muted warning surface |

#### Ghost / Inverse

| Role | CSS var | Tailwind | Description |
| --- | --- | --- | --- |
| `ghost` | `--color-ghost` | `bg-ghost` / `text-on-ghost` | White background + dark text, high-contrast CTA on dark surface |
| `inverse-surface` | `--color-inverse-surface` | `bg-inverse-surface` / `text-on-inverse-surface` | Inverted pair (light background + dark text), e.g. snackbar |

#### Glass (for auth/landing — translucency + blur)

| Role | CSS var | Tailwind | Description |
| --- | --- | --- | --- |
| `glass` | `--color-glass` | `bg-glass` / `text-on-glass` | Base glass |
| `glass-elevation-1` | `--color-glass-elevation-1` | `bg-glass-elevation-1` / `text-on-glass-elevation-1` | Elevated glass 1 |
| `glass-elevation-2` | `--color-glass-elevation-2` | `bg-glass-elevation-2` / `text-on-glass-elevation-2` | Elevated glass 2 |
| `glass-outline` | `--color-glass-outline` | `border-glass-outline` | Glass border |
| `glass-outline-variant` | `--color-glass-outline-variant` | `border-glass-outline-variant` | Subtle glass border |
| `glass-error` | `--color-glass-error` | `bg-glass-error` / `text-on-glass-error` | Glass error (`color-mix(error 20%, glass)`) |
| `glass-success` | `--color-glass-success` | `bg-glass-success` / `text-on-glass-success` | Glass success |
| `glass-info` | `--color-glass-info` | `bg-glass-info` / `text-on-glass-info` | Glass info |

## 2. Elevation

### Principle

Do not use shadow in design/components unless explicitly required. If so — only `shadow-sm`/`shadow-md`/`shadow-lg`. All custom elevation shadow tokens and shadows on button/card/FAB/dialog have been removed.

Preserved exceptions: `select` popover (`shadow-md`), `menu` content (`shadow-md`).

Tonal elevation via color roles (lighter = higher), without decorative shadows. The hierarchy of "what is above what" is in the surface color, not in the shadow.

### Surface hierarchy (semantic — what is above what)

`surface` → `elevation-1` → `elevation-2` → `float` → `popover` → `scrim`

| Role | When to use |
| --- | --- |
| `surface` | Base background (darkest) — pages, sections, containers without elevation |
| `elevation-1` | Item on surface — cards, raised buttons, TopAppBar/NavBar on surface, FAB, lists |
| `elevation-2` | Item on elevation-1 — strongly elevated panels, active card over card (lightest L) |
| `float` | Floating chrome (translucent + `backdrop-blur`) — nav/top app bar, select dropdown, menu |
| `popover` | Modal/floating overlay — dialog, toast, popover (above scrim) |
| `scrim` | 60% black overlay — background under dialog/menu/popover |

- `bg-elevation-1` = raised content (elevated buttons, cards, FAB). `bg-elevation-2` = static panels above elevation-1. `bg-float` = floating chrome (TopAppBar, NavigationBar, dropdown) with `backdrop-blur`. `bg-popover` = modal overlay above scrim (Dialog, Toast, Popover).
- **DO NOT** use `bg-elevation-2` for Dialog/Toast/Popover → `bg-popover`. `elevation-2` is for static panels, not floating overlay.
- **DO NOT** use `bg-elevation-*` for Nav → `bg-float` (with `backdrop-blur`). For select/menu dropdown: `bg-float shadow-md`.
- **Selection rule:** `popover` = modal (appears above scrim, interrupts flow). `float` = chrome attached to an edge / emerging from an element (without scrim, with blur). `elevation-1/2` = static elevation in content (not floating).

## 3. State layers (MOST CRITICAL)

**#1 what distinguishes authentic MD3 from "inspired".** Every interactive element has a **state layer** — a semi-transparent overlay showing hover/focus/pressed through opacity change, NOT through bg change.

### Opacity

- MD3 spec: hovered 8%, focused 12%, pressed 12%.
- In our implementation we round all states to the nearest multiple of 5%: **`opacity-[0.1]`** for hover, focus-visible, and active.
- The "percentages multiples of 5" rule applies to `color-mix()` **and** raw `opacity-*` values.

### HTML structure

State layer is a **`<span>` child** (NOT `::after`), placed as the last (or before icons) in the component, with `aria-hidden="true"`:

```tsx
<span className="ui-btn__state-layer" aria-hidden="true" />
```

### CSS pattern (verified with `button.css`, `chip.css`, `menu.css`, `segmented-button.css`, `checkbox.css`)

```css
.ui-btn__state-layer {
  @apply absolute
    inset-0
    bg-current
    rounded-[inherit]
    opacity-0
    pointer-events-none
    transition-opacity
    duration-short-3
    ease-ui;
}

@media (hover: hover) {
  .ui-btn:hover .ui-btn__state-layer {
    @apply opacity-[0.1];
  }
}

.ui-btn:focus-visible .ui-btn__state-layer {
  @apply opacity-[0.1];
}

.ui-btn:active .ui-btn__state-layer {
  @apply opacity-[0.1];
}
```

State layer components:

- `bg-current` — inherits the component's text color. On `variant="primary"` the overlay is `on-primary`, on `variant="error"` → `on-error`. NOT `bg-on-surface` (that breaks variant semantics).
- `rounded-[inherit]` — inherits radius from parent, so changing the component radius doesn't require updating the overlay.
- `pointer-events-none` — doesn't block clicks on the component.
- `opacity-0` default + `opacity-[0.1]` on hover/focus/active.
- `transition-opacity duration-short-3 ease-ui` — smooth transition (see § 6).
- `aria-hidden="true"` — decorative, not in accessibility tree.

### Hover gating

Every raw `:hover` in `.css` MUST be in `@media (hover: hover) { ... }` — otherwise sticky hover on touch. Tailwind `hover:` in TSX is already gated by the v4 default. `:active` and `:focus-visible` are NOT gated. CSS mechanics details → `styling.md` § "Hover gating".

### Conditional state layer

Components with conditional state layer + uix-ripple render them ONLY when interactive. Example from `chip.tsx` (line 60–83):

```tsx
const interactive = Boolean(to || onClick);
// ...
{
  interactive && (
    <>
      <span ref={surfaceRef} className="ui-chip__ripple" aria-hidden="true">
        <span className="uix-ripple" />
      </span>
      <span className="ui-chip__state-layer" aria-hidden="true" />
    </>
  );
}
```

In CSS the condition is implemented via an extra class (e.g., `ui-chip--interactive`):

```css
@media (hover: hover) {
  .ui-chip--interactive:hover .ui-chip__state-layer {
    @apply opacity-[0.1];
  }
}
```

### DON'T — state layer

- **DO NOT** `hover:bg-*` on interactive elements — state layer does this. MD3 uses overlay, not bg change.
- **DO NOT** `bg-on-surface` on state layer — use `bg-current` (inherits the component's text).
- **DO NOT** `::after` for state layer — always `<span>` child.
- **DO NOT** `data-state` for hover/focus/pressed — these are interactive states (state layer), not logical.
- **DO NOT** hardcoded `rgba()` on overlay — use `bg-current` + opacity.

Exception: non-interactive cards may have `hover:bg-elevation-2` for subtle feedback.

## 4. Ripple (second most MD3-distinctive)

Ripple = **animated radial expansion** from the touch point (NOT from the center) — `getBoundingClientRect()` + pointer coords. Lasts ~600 ms (`RIPPLE_DURATION`), `ease-ui`, fade out.

### Structure

```tsx
<span ref={surfaceRef} className="ui-btn__ripple" aria-hidden="true">
  <span className="uix-ripple" />
</span>
```

- `{block}__ripple` is the surface (`overflow-hidden`, `position: absolute`, `rounded-[inherit]`, `pointer-events-none`, `z-below`) — `surfaceRef` is attached here.
- `useRipple` dynamically spawns `<span class="ripple__wave">` inside `.uix-ripple`.
- `.ripple__wave` is defined in `@layer components` in `app/styles/utilities/animations.css`:

```css
@layer components {
  .ripple__wave {
    position: absolute;
    background: color-mix(in oklch, var(--ripple-color, currentcolor) 60%, white);
    border-radius: 50%;
    opacity: 0.3;
    transform: scale(0);
    animation: ripple-anim 600ms var(--ease-ui) forwards;
  }
}

@keyframes ripple-anim {
  to {
    opacity: 0;
    transform: scale(4);
  }
}
```

### `--ripple-color`

MUST be set in every variant in `.css`:

```css
.ui-btn--primary {
  --ripple-color: var(--color-on-primary);
  @apply bg-primary text-on-primary;
}
```

`ripple__wave` uses it via `color-mix(in oklch, var(--ripple-color, currentcolor) 60%, white)`. Without this the fallback is `currentcolor` — often wrong color.

### `useRipple` contract

File: `app/lib/hooks/use-ripple.ts`.

```ts
const RIPPLE_DURATION = 600; // ms

export interface UseRippleReturn<T extends HTMLElement = HTMLSpanElement> {
  surfaceRef: RefObject<T | null>;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
  rippleState: {
    pressed: boolean;
    hovered: boolean;
  };
}

export function useRipple<T extends HTMLElement = HTMLSpanElement>(
  disabled = false
): UseRippleReturn<T>;
```

Where to connect:

1. `surfaceRef` → `<span class="{block}__ripple">` (element with `overflow-hidden`, `rounded-[inherit]`, `pointer-events-none`).
2. `handlers` → spread on the interactive element (button, link, checkbox, menu item, segmented button item).
3. `rippleState.pressed` → optional state class, e.g., `ui-btn--pressed` (used in `button.tsx`, `chip.tsx`, `menu.tsx`, `checkbox.tsx`).
4. `rippleState.hovered` is returned, but currently NOT consumed in UI components — all hover effects are implemented by state layer.

### SSR guard (Cloudflare Workers)

`typeof window === "undefined"` in `spawnRipple` (line 49) and in `useAutoRippleColor` in `PlayButton`. All DOM operations ONLY in handlers (after hydration). `prefers-reduced-motion` check also only in handlers.

### `prefers-reduced-motion`

In `useRipple.spawnRipple` (line 54–55): `window.matchMedia("(prefers-reduced-motion: reduce)").matches` → skip uix-ripple animation. State layer remains.

## 5. Shape / radius

Radius tokens in `@theme` (`app/styles/utilities/tokens.css`):

```css
--radius-unit: 1rem;
--radius-xs: calc(var(--radius-unit) * 1); /* 1rem */
--radius-sm: calc(var(--radius-unit) * 2); /* 2rem */
--radius-md: calc(var(--radius-unit) * 2.5); /* 2.5rem */
--radius-lg: calc(var(--radius-unit) * 3); /* 3rem */
--radius-xl: calc(var(--radius-unit) * 4); /* 4rem */
--radius-2xl: calc(var(--radius-unit) * 6); /* 6rem */
--radius-full: 9999px;
```

Every component type has an explicit radius — there is no "rounded-md as default".

| Component / element | Radius | Source |
| --- | --- | --- |
| Button, Chip, MenuItem, SegmentedButton item | `rounded-full` (pill) | `button.css`, `chip.css`, `menu.css`, `segmented-button.css` |
| Menu content | `rounded-md` | `menu.css` (`.ui-menu__content`) |
| TextField container | `rounded-lg` | `text-field.css` (`.ui-text-field`) |
| TextField input container | `rounded-[inherit]` | `text-field.css` (`.ui-text-field__container`) |
| Checkbox box | `rounded-xs` | `checkbox.css` (`.ui-checkbox`, `.ui-checkbox__box`) |
| Dialog content | `rounded-2xl` | `dialog.css` (`.ui-dialog__content`) |
| Alert | `rounded-lg` | `alert.tsx` (`className="... rounded-lg"`) |

`rounded-[inherit]` on state layer/uix-ripple ensures the overlay always has the same radius as the component.

## 6. Motion

### Easing

```css
--ease-ui: cubic-bezier(0.2, 0, 0, 1);
--ease-ui-decelerated: cubic-bezier(0, 0, 0, 1);
--ease-ui-accelerated: cubic-bezier(0.3, 0, 1, 1);
```

**FORBIDDEN** `ease-in`/`ease-out`/`linear`/`ease` and inline `ease-[cubic-bezier(...)]` — only `ease-ui*`.

### Duration

```css
--transition-duration-short-1: 75ms;
--transition-duration-short-2: 100ms;
--transition-duration-short-3: 150ms;
--transition-duration-medium-1: 200ms;
--transition-duration-medium-2: 250ms;
--transition-duration-medium-3: 300ms;
--transition-duration-long-1: 350ms;
--transition-duration-long-2: 400ms;
```

**FORBIDDEN** inline `duration-200` — use tokens. MD3 mapping:

- micro/short (75–150 ms) = small state changes (border, color, state layer);
- medium (200–300 ms) = standard transitions (button, chip, segmented button);
- long (350–400 ms) = large layout transformations.

### Patterns

- Standard: `transition-all duration-medium-2 ease-ui` (buttons/chips/segmented).
- Fast: `transition-colors duration-short-3 ease-ui` (menu items/checkbox/text-field border).
- State layer fade: `transition-opacity duration-short-3 ease-ui`.

### `prefers-reduced-motion`

Every CSS/JS animation must honor `prefers-reduced-motion: reduce`:

- `useRipple` skips the uix-ripple animation (state layer remains).
- Button spinner (`ui-btn__spinner`) in `@media (prefers-reduced-motion: reduce)` changes `animation-duration` to 1.5 s (`button.css`, line 210–214).
- Marquee and other continuous animations should have `motion-reduce:animate-none` in TSX.

## 7. Typography

Fonts, weights, fluid `clamp()`, `@layer base` defaults → `tokens.md` § "Typography".

Key rule: h1-h5 get `font-header font-semibold` in `@layer base` (`app/styles/base/typography.css`) — do not repeat in `className`/`@apply`. Full no-duplicate-styles rules → `styling.md` § "No-duplicate-styles".

## 8. Icons

`lucide-react` (24×24 viewBox, 2px stroke) + `simple-icons` (brand). `Icon` component with named exports (`Icon.Home`, …), `withConfig`/`withSimpleIcon`. `size`: `sm`/`md`/`lg`/`xl` (2.25/3/4/5rem). Do not mix icon sets. MUI Slider = only MUI component (custom wrapper).

Layout grid (`w-mod-unit-*`, `cont`, `px-site`) → `tokens.md` § "w-mod-unit". No global layout styles in `@layer base` → `styling.md` § "@layer cascade".

## 9. MD3 new component checklist

1. `import "./{component}.css"` at the top of TSX.
2. TSX structure (CVA, `useRipple`, `cn`, `data-state`, render spans) → `components.md` § "TSX — structure".
3. CSS in `@layer components`, sections in order, `@apply` with property order → `styling.md` § "@layer cascade" + "Property order".
4. State layer + uix-ripple (`bg-current`, `opacity-[0.1]`, `--ripple-color` in variant) → § 3 + § 4.
5. `h-{comp}-{size}` rem tokens (NOT `h-10`/`h-12`) — UI ALWAYS, custom when appropriate → `tokens.md` § "Size tokens".
6. `transition-* duration-* ease-ui` → § 6.
7. Keyframes top-level (OUTSIDE `@layer`) → `styling.md` § "Animations".
8. A11y: `aria-*`, `role`, keyboard, focus ring; `aria-hidden` on state layer/uix-ripple → `components.md` § "A11y".
9. SSR guard in `useRipple` → `components.md` § "SSR".
10. Named exports, no barrel exports → `components.md` § "Utility helpers".

## 10. Color role selection (cheatsheet)

- CTA: `bg-primary`/`text-on-primary`. Outline: `bg-transparent`/`text-on-surface`/`border-outline`. Ghost: `bg-ghost`/`text-on-ghost`.
- Chip tonal: `bg-primary-container`/`text-on-primary-container`.
- Card: `bg-elevation-1`/`text-on-surface`. Dialog/Toast/Popover: `bg-popover`/`text-on-popover`.
- Menu/Select dropdown: `bg-float`/`text-on-float`/`shadow-md`. Nav (TopAppBar/NavigationBar): `bg-float`/`text-on-float` (with `backdrop-blur`, without shadow).
- TextField: `bg-surface`/`text-on-surface`, border: `outline-variant` → `outline` (hover) → `primary` (focus). Full border scheme (hover/active/error) → `components.md` § "Hover/active border".
- Checkbox: `bg-transparent`/`text-on-primary` (check), border: `outline` → `primary` (checked).
- Error/success: `bg-error`/`text-on-error` · `bg-success`/`text-on-success`.

## 11. Key component API

- **Button**: `state` (`default`/`disabled`/`loading` — spinner + `cursor-progress`), `selected` (toggle icon, `data-state="selected"` → `bg-primary text-on-primary`), `iconButton` (square, `rounded-full`, larger touch target, `aria-label` required), `to` (Link), `Icon`, `IconPosition`.
- **SegmentedButton**: `direction` (`horizontal`/`vertical`), `selectMode` (`single`/`multiple`), `value`+`onValueChange`. Item: `enabled` = selected (works only outside group context), `iconButton`.
- **Chip**: `selected` (filter). Conditional state layer → § 3.
- **MenuItem**: `variant` (`default`/`destructive`), `selected`, `Icon`, `TrailingIcon`, `to`.
- **TextField/TextArea**: floating label, `label`, `error`, `errorMessage`/`helperText`, `showTogglePassword` (TextField).
- **Alert**: 10 variants (default/error/success/warning/info + glass-\*), variant = status (no `data-state`).
- **Select**: `value`/`onValueChange`/`label`/`error`/`placeholder`, item: `value`/`Icon`.
- **Dialog**: `open`/`onOpenChange`, scrim, ESC, `DialogContent(size)`, `DialogTrigger(asChild)`.

## 12. MD3 anti-patterns (FORBIDDEN)

- `hover:bg-*` on interactive elements → use state layer (§ 3).
- `bg-on-surface` on state layer → `bg-current` (inherits the component's text).
- `bg-elevation-2` for Dialog/Toast/Popover → `bg-popover`.
- `bg-elevation-*` for Nav → `bg-float` (with `backdrop-blur`).
- `::after` for state layer → `<span>` child.
- Ripple from the center → from the touch point.
- Missing `--ripple-color` in variant (fallback `currentcolor` is often wrong).
- Missing `prefers-reduced-motion`.
- `data-state` for hover/focus/pressed → these are interactive states (state layer), not logical.
- `variant="filled"`/`"tonal"`/`"text"` (textbook MD3) → our variants are color roles.
- Separate `IconButton` component → `<Button iconButton />`.
- Mixing `variant` with inline colors (`className="bg-red-500"`).
- Adding `variant` to components that don't have it (TextField, Checkbox, Select) — they get color from function/focus/checked.

CSS mechanics anti-patterns (raw `:hover`, `rgba()` with OKLCH, `h-10`/`h-12`, gating `:active`) → `styling.md` § "Don't". Component anti-patterns → `components.md` § "Don't".
