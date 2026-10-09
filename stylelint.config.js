/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  plugins: [
    "stylelint-order",
    "stylelint-declaration-block-no-ignored-properties",
    "@stylistic/stylelint-plugin",
    "./scripts/stylelint-apply-order.ts"
  ],
  rules: {
    "@stylistic/indentation": 2,
    "@stylistic/string-quotes": "double",
    "@stylistic/declaration-colon-space-after": "always-single-line",
    "@stylistic/declaration-colon-space-before": "never",
    "@stylistic/block-opening-brace-space-before": "always",
    "@stylistic/declaration-block-trailing-semicolon": "always",
    "declaration-property-value-disallowed-list": {},
    "plugin/declaration-block-no-ignored-properties": true,
    "order/order": [
      {
        type: "at-rule",
        name: "use"
      },
      {
        type: "at-rule",
        name: "forward"
      },
      {
        type: "at-rule",
        name: "include",
        hasBlock: false
      },
      "dollar-variables",
      "custom-properties",
      "declarations",
      "rules",
      {
        type: "at-rule",
        name: "include",
        hasBlock: true
      },
      "at-rules"
    ],
    "order/properties-order": [
      "display",
      "position",
      "inset",
      "top",
      "right",
      "bottom",
      "left",
      "z-index",
      "float",
      "clear",
      "visibility",
      "overflow",
      "overflow-x",
      "overflow-y",
      "clip-path",
      "flex",
      "flex-grow",
      "flex-shrink",
      "flex-basis",
      "flex-direction",
      "flex-wrap",
      "flex-flow",
      "order",
      "grid",
      "grid-template",
      "grid-template-columns",
      "grid-template-rows",
      "grid-template-areas",
      "grid-auto-columns",
      "grid-auto-rows",
      "grid-auto-flow",
      "grid-column",
      "grid-row",
      "grid-area",
      "place-items",
      "place-content",
      "place-self",
      "justify-content",
      "justify-items",
      "justify-self",
      "align-content",
      "align-items",
      "align-self",
      "gap",
      "row-gap",
      "column-gap",
      "container-type",
      "container-name",
      "box-sizing",
      "width",
      "min-width",
      "max-width",
      "height",
      "min-height",
      "max-height",
      "aspect-ratio",
      "padding",
      "padding-block",
      "padding-block-start",
      "padding-block-end",
      "padding-inline",
      "padding-inline-start",
      "padding-inline-end",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "background",
      "background-color",
      "background-image",
      "background-position",
      "background-size",
      "background-repeat",
      "background-clip",
      "background-origin",
      "backdrop-filter",
      "color",
      "border",
      "border-top",
      "border-right",
      "border-bottom",
      "border-left",
      "border-radius",
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-right-radius",
      "border-bottom-left-radius",
      "box-shadow",
      "outline",
      "opacity",
      "filter",
      "mix-blend-mode",
      "font",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "font-variant",
      "line-height",
      "letter-spacing",
      "word-spacing",
      "text-align",
      "text-transform",
      "text-decoration",
      "text-shadow",
      "white-space",
      "word-break",
      "overflow-wrap",
      "hyphens",
      "content",
      "cursor",
      "pointer-events",
      "user-select",
      "touch-action",
      "resize",
      "transform",
      "transform-origin",
      "perspective",
      "perspective-origin",
      "backface-visibility",
      "transition",
      "transition-property",
      "transition-duration",
      "transition-timing-function",
      "transition-delay",
      "animation",
      "animation-name",
      "animation-duration",
      "animation-timing-function",
      "animation-delay",
      "animation-iteration-count",
      "animation-direction",
      "animation-fill-mode",
      "animation-play-state",
      "will-change",
      "contain",
      "content-visibility",
      "scroll-behavior",
      "scroll-snap-type",
      "scroll-snap-align",
      "scroll-margin",
      "scroll-padding"
    ],
    "selector-class-pattern": null,
    "no-descending-specificity": null,
    "block-no-empty": null,
    "no-empty-source": null,
    "declaration-block-single-line-max-declarations": null,

    "rule-empty-line-before": [
      "always",
      {
        except: ["first-nested"]
      }
    ],
    "comment-empty-line-before": [
      "always",
      {
        except: ["first-nested"]
      }
    ],

    // Keep @import without url() — Tailwind v4 requires plain @import "..."
    "import-notation": "string",

    // Allow Tailwind v4 at-rules (don't flag as unknown)
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "apply",
          "theme",
          "utility",
          "variant",
          "custom-variant",
          "source",
          "reference",
          "config",
          "plugin",
          "import"
        ]
      }
    ],

    // Tailwind @theme blocks have custom properties — relax
    "custom-property-pattern": null,

    // custom-media-pattern for @custom-media --bp-*
    "custom-media-pattern": null,

    // Allow @keyframes names with any pattern
    "keyframes-name-pattern": null,

    // Tailwind v4: @import can follow @layer/@source directives
    "no-invalid-position-at-import-rule": [
      true,
      {
        ignoreAtRules: ["layer", "source"]
      }
    ],

    // Tailwind v4 at-rules have non-standard preludes (e.g. @apply <classes>)
    "at-rule-prelude-no-invalid": [
      true,
      {
        ignoreAtRules: [
          "apply",
          "theme",
          "utility",
          "variant",
          "custom-variant",
          "source",
          "reference",
          "config",
          "plugin"
        ]
      }
    ],

    // Tailwind v4 @utility blocks use `&:hover` / `&:focus` at top-level.
    // stylelint doesn't recognize @utility as a scoping root, so disable.
    "nesting-selector-no-missing-scoping-root": null,

    // Sort Tailwind utility classes inside @apply directives.
    // Uses the same ORDER_GROUPS as scripts/tw-order.ts (single source of truth).
    "apply-apply/order": true
  }
};
