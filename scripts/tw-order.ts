// ──────────────────────────────────────────────────────────────
// tw-order.ts — Single source of truth for Tailwind class ordering.
//
// Used by:
//   • scripts/stylelint-apply-order.ts  (stylelint plugin for @apply)
//   • CLI:  tsx scripts/tw-order.ts
//   • pnpm fmt:style
//
// The order groups mirror `order/properties-order` from stylelint.config.js
// so that class sorting in TSX className and CSS @apply is consistent with
// CSS property sorting.
// ──────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ──────────────────────────────────────────────────────────────
// Ordered prefix groups — mirror stylelint.config.js properties-order.
// A class matches a key k if: class === k OR class.startsWith(k + "-").
// First matching group wins. Classes matching no group sort last (alpha).
// ──────────────────────────────────────────────────────────────
export const ORDER_GROUPS: string[][] = [
  // 1. Display & visibility
  [
    "block",
    "inline-block",
    "inline",
    "inline-flex",
    "inline-grid",
    "inline-table",
    "table",
    "table-caption",
    "table-cell",
    "table-column",
    "table-row",
    "flow-root",
    "contents",
    "list-item",
    "hidden",
    "visible",
    "invisible",
    "collapse"
  ],
  // 2. Position
  ["static", "fixed", "absolute", "relative", "sticky"],
  // 3. Inset / z-index / float / clear
  [
    "inset",
    "inset-x",
    "inset-y",
    "top",
    "right",
    "bottom",
    "left",
    "start",
    "end",
    "z",
    "float",
    "clear"
  ],
  // 4. Overflow / overscroll / clip
  ["overflow", "overflow-x", "overflow-y", "overscroll", "overscroll-x", "overscroll-y", "clip"],
  // 5. Flexbox
  ["flex", "order", "grow", "shrink"],
  // 6. Grid
  ["grid", "col", "row", "auto-cols", "auto-rows"],
  // 7. Alignment
  [
    "place-content",
    "place-items",
    "place-self",
    "justify",
    "justify-content",
    "justify-items",
    "justify-self",
    "align-content",
    "align-items",
    "align-self",
    "content-center",
    "content-start",
    "content-end",
    "content-between",
    "content-around",
    "content-evenly",
    "content-stretch",
    "content-normal",
    "items-start",
    "items-end",
    "items-center",
    "items-baseline",
    "items-stretch",
    "items-normal",
    "self-start",
    "self-end",
    "self-center",
    "self-stretch",
    "self-baseline",
    "self-auto"
  ],
  // 8. Gap / space
  [
    "gap",
    "gap-x",
    "gap-y",
    "row-gap",
    "column-gap",
    "space-x",
    "space-y",
    "space-x-reverse",
    "space-y-reverse"
  ],
  // 9. Box-sizing / container
  ["box-border", "box-content", "box-decoration", "container", "@container"],
  // 10. Sizing
  ["w", "min-w", "max-w", "h", "min-h", "max-h", "aspect", "size", "size-min", "size-max"],
  // 11. Padding
  ["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"],
  // 12. Margin
  ["m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me"],
  // 13. Background
  ["bg", "backdrop", "from", "via", "to"],
  // 14. Border + divide + rounded + ring + outline + shadow
  [
    "border",
    "border-x",
    "border-y",
    "border-t",
    "border-r",
    "border-b",
    "border-l",
    "border-s",
    "border-e",
    "divide",
    "divide-x",
    "divide-y",
    "rounded",
    "rounded-t",
    "rounded-r",
    "rounded-b",
    "rounded-l",
    "rounded-s",
    "rounded-e",
    "rounded-tl",
    "rounded-tr",
    "rounded-br",
    "rounded-bl",
    "ring",
    "inset-ring",
    "ring-offset",
    "outline",
    "shadow",
    "inset-shadow"
  ],
  // 15. Opacity / filter / blend
  [
    "opacity",
    "filter",
    "blur",
    "brightness",
    "contrast",
    "grayscale",
    "hue-rotate",
    "invert",
    "saturate",
    "sepia",
    "drop-shadow",
    "mix-blend"
  ],
  // 16. Font
  ["font", "leading", "tracking", "word-spacing"],
  // 17. Text — specific before catch-all
  [
    "text-center",
    "text-left",
    "text-right",
    "text-justify",
    "text-start",
    "text-end",
    "text-wrap",
    "text-nowrap",
    "text-pretty",
    "text-balance",
    "text-ellipsis",
    "text-clip",
    "text-shadow",
    "uppercase",
    "lowercase",
    "capitalize",
    "normal-case",
    "underline",
    "overline",
    "line-through",
    "no-underline",
    "decoration",
    "underline-offset",
    "antialiased",
    "subpixel-antialiased",
    "truncate"
  ],
  // 18. Text catch-all (color, font-size)
  ["text"],
  // 19. Whitespace / break / hyphens
  ["whitespace", "break", "hyphens", "word-break"],
  // 20. Content / cursor / interaction
  ["content-none", "cursor", "pointer-events", "select", "touch", "resize", "caret", "accent"],
  // 21. Transform
  ["transform", "rotate", "scale", "translate", "skew", "origin", "perspective", "backface"],
  // 22. Transition / animation / motion
  ["transition", "duration", "ease", "delay", "animate", "motion"],
  // 23. Will-change / contain / isolation
  ["will-change", "contain", "isolate", "isolation"],
  // 24. Scroll / snap
  ["scroll", "snap"],
  // 25. Columns / page-break
  ["columns", "column", "break-before", "break-after", "break-inside"],
  // 26. List
  ["list", "marker"],
  // 27. Fill / stroke
  ["fill", "stroke"],
  // 28. Object
  ["object"],
  // 29. Placeholder / indent / vertical-align
  [
    "placeholder",
    "indent",
    "align-middle",
    "align-baseline",
    "align-top",
    "align-bottom",
    "align-text-top",
    "align-text-bottom",
    "align-sub",
    "align-super"
  ],
  // 30. Misc
  [
    "appearance",
    "scheme",
    "forced-color",
    "mask",
    "tab",
    "ordinal",
    "slashed-zero",
    "lining",
    "oldstyle",
    "proportional",
    "stacked",
    "diagonal",
    "ring-offset"
  ]
];

// ──────────────────────────────────────────────────────────────
// Variant prefixes — stripped before lookup. Variants like hover:, md:, etc.
// ──────────────────────────────────────────────────────────────
export const VARIANT_PREFIXES: string[] = [
  "hover",
  "focus",
  "focus-visible",
  "focus-within",
  "active",
  "visited",
  "target",
  "first",
  "last",
  "only",
  "odd",
  "even",
  "first-of-type",
  "last-of-type",
  "only-of-type",
  "empty",
  "disabled",
  "enabled",
  "checked",
  "indeterminate",
  "default",
  "required",
  "valid",
  "invalid",
  "in-range",
  "out-of-range",
  "placeholder-shown",
  "autofill",
  "read-only",
  "read-write",
  "before",
  "after",
  "first-letter",
  "first-line",
  "marker",
  "selection",
  "file",
  "placeholder",
  "backdrop",
  "pointer",
  "coarse",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
  "phone",
  "tablet",
  "desktop",
  "large-desktop",
  "xlarge-desktop",
  "2xlarge-desktop",
  "huge",
  "dark",
  "light",
  "starting",
  "motion-safe",
  "motion-reduce",
  "print",
  "rtl",
  "ltr",
  "open",
  "in",
  "group",
  "peer",
  "has",
  "not",
  "aria",
  "data",
  "supports",
  "container",
  "@",
  "forced-colors",
  "prefers-contrast",
  "prefers-reduced-motion",
  "prefers-color-scheme",
  "orientation"
];

// ──────────────────────────────────────────────────────────────
// Canonical class renames — Tailwind v4 deprecated → canonical.
// Mirrors the `suggestCanonicalClasses` warnings from Tailwind CSS
// IntelliSense. Applied during sort so `pnpm fmt:style` (TSX) and
// `stylelint --fix` (@apply) autofix them in place.
//
// Each entry: [deprecatedPrefix, canonicalPrefix].
// A class is renamed if base === deprecatedPrefix OR base starts
// with deprecatedPrefix + "-". The suffix after the prefix is
// preserved (e.g. flex-shrink-0 → shrink-0).
// ──────────────────────────────────────────────────────────────
export const CANONICAL_PREFIXES: [deprecatedPrefix: string, canonicalPrefix: string][] = [
  ["flex-grow", "grow"],
  ["flex-shrink", "shrink"],
  ["overflow-ellipsis", "text-ellipsis"],
  ["overflow-clip", "text-clip"],
  ["decoration-clone", "box-decoration-clone"],
  ["decoration-slice", "box-decoration-slice"]
];

export function canonicalizeClass(cls: string): string {
  const base = stripVariants(cls);
  for (const [from, to] of CANONICAL_PREFIXES) {
    if (base === from || base.startsWith(from + "-")) {
      const suffix = base.slice(from.length);
      const variantPart = cls.slice(0, cls.length - base.length);
      return variantPart + to + suffix;
    }
  }
  return cls;
}

export function canonicalizeClasses(classes: string[]): string[] {
  return classes.map(canonicalizeClass);
}

// ──────────────────────────────────────────────────────────────
// Core sorting logic
// ──────────────────────────────────────────────────────────────

export function stripVariants(cls: string): string {
  let result = cls;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of VARIANT_PREFIXES) {
      const full = prefix + ":";
      if (result.startsWith(full)) {
        result = result.slice(full.length);
        changed = true;
        break;
      }
    }
    const arbMatch = result.match(/^\[[^\]]+\]:/);
    if (arbMatch) {
      result = result.slice(arbMatch[0].length);
      changed = true;
    }
  }
  return result;
}

export function getGroupIndex(cls: string): number {
  const base = stripVariants(cls);
  for (let i = 0; i < ORDER_GROUPS.length; i++) {
    for (const prefix of ORDER_GROUPS[i]) {
      if (base === prefix || base.startsWith(prefix + "-")) {
        return i;
      }
    }
  }
  return ORDER_GROUPS.length;
}

export function sortClasses(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const ga = getGroupIndex(a);
    const gb = getGroupIndex(b);
    if (ga !== gb) return ga - gb;
    return a.localeCompare(b);
  });
}

// ──────────────────────────────────────────────────────────────
// sortClassesInCode — find className="..." / cn("...") / clsx("...") etc.
// and sort the Tailwind classes inside each quoted string.
//
// Skips strings containing dynamic syntax: { } < ? (template literals,
// conditional expressions, JSX expressions).
// ──────────────────────────────────────────────────────────────

const CLASS_REGEX =
  /(?<=\s|{|}|^|\()((?:clsx|cva|cn|twMerge)\(|class=|className=)\s*\{?\s*("([^"?<>{}]*)"|'([^'?<>{}]*)'|`([^`?<>{}]*)`)/g;

export function sortClassesInCode(code: string): string {
  return code.replace(
    CLASS_REGEX,
    (match: string, prefix: string, _quoted: string, dq?: string, sq?: string, bt?: string) => {
      const classesStr = dq ?? sq ?? bt;
      if (!classesStr) return match;
      const classes = classesStr.split(/\s+/).filter(Boolean);
      if (classes.length === 0) return match;
      const canonical = canonicalizeClasses(classes);
      if (classes.length < 2) {
        const canonStr = canonical.join(" ");
        return canonStr !== classesStr ? match.replace(classesStr, canonStr) : match;
      }
      const sorted = sortClasses(canonical).join(" ");
      return match.replace(classesStr, sorted);
    }
  );
}

// ──────────────────────────────────────────────────────────────
// CLI: tsx scripts/tw-order.ts
// Sorts Tailwind classes in TSX/JSX/TS/JS files in place.
// ──────────────────────────────────────────────────────────────

function scanDir(dir: string, exts: string[], results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === ".build" ||
      entry.name === ".wrangler" ||
      entry.name === "extensions"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, exts, results);
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function isMainModule(): boolean {
  if (import.meta.url === `file://${process.argv[1]}`) return true;
  return !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const exts = [".tsx", ".jsx", ".ts", ".js"];
  const dirs = [path.join(ROOT, "app"), path.join(ROOT, "shared")];
  const files = dirs.flatMap((d) => (fs.existsSync(d) ? scanDir(d, exts) : []));

  let changed = 0;
  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    const sorted = sortClassesInCode(code);
    if (sorted !== code) {
      fs.writeFileSync(file, sorted, "utf8");
      changed++;
      console.log(`  sorted: ${path.relative(ROOT, file)}`);
    }
  }
  console.log(`\n  ${files.length} files scanned, ${changed} files sorted.`);
}
