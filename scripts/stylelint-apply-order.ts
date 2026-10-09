import stylelint, { type PostcssResult } from "stylelint";

import { canonicalizeClasses, sortClasses } from "./tw-order.js";

// Custom stylelint plugin: sorts Tailwind utility classes inside `@apply` directives.
// Uses the same ORDER_GROUPS as scripts/tw-order.ts (single source of truth).
//
// Registered in stylelint.config.js as rule `apply-apply/order`.
// Supports autofix (`stylelint --fix`).
import type { Root } from "postcss";

const ruleName = "apply-apply/order";
const messages = {
  expected: (unsorted: string, sorted: string): string =>
    `Expected @apply classes in canonical form and custom order: "${sorted}" (got "${unsorted}").`
};

function splitClasses(params: string): string[] {
  return params.split(/\s+/).filter(Boolean);
}

const rule = Object.assign(
  (primary: boolean) =>
    (root: Root, result: PostcssResult): void => {
      const validOptions = stylelint.utils.validateOptions(result, ruleName, {
        actual: primary,
        possible: [true, false]
      });
      if (!validOptions) return;

      root.walkAtRules("apply", (atRule) => {
        const original = atRule.params;
        const classes = splitClasses(original);
        if (classes.length === 0) return;

        const canonical = canonicalizeClasses(classes);
        const sorted = sortClasses(canonical);

        // Build the target string. For multi-line @apply, preserve the original
        // line structure (same number of classes per line) — only sort and
        // collapse extra spaces. For single-line, join with a single space.
        const hasNewline = /\r?\n/.test(original);
        let sortedStr: string;
        if (hasNewline) {
          // Detect the original line ending (CRLF on Windows, LF elsewhere)
          // so the rebuilt string matches the file's line endings. Using a
          // hardcoded "\n" here caused false-positive violations on CRLF
          // files and produced mixed line endings after --fix.
          const newline = original.includes("\r\n") ? "\r\n" : "\n";
          const indentMatch = original.match(/\r?\n([ \t]*)/);
          const indent = indentMatch ? indentMatch[1] : "";
          // Count classes per line in the original, then redistribute sorted
          // classes maintaining that structure.
          const lineCounts = original
            .split(/\r?\n/)
            .map((line) => splitClasses(line).length)
            .filter((c, i) => c > 0 || i === 0);
          const lines = [];
          let idx = 0;
          for (const count of lineCounts) {
            lines.push(sorted.slice(idx, idx + count).join(" "));
            idx += count;
          }
          sortedStr = lines.join(`${newline}${indent}`);
        } else {
          sortedStr = sorted.join(" ");
        }

        // Compare raw params against the target string so that extra whitespace
        // (double spaces, trailing spaces) is also detected and fixed — not just
        // wrong order or non-canonical class names.
        if (original === sortedStr) return;

        const originalNormalized = classes.join(" ");
        const sortedNormalized = sorted.join(" ");
        stylelint.utils.report({
          message: messages.expected(originalNormalized, sortedNormalized),
          node: atRule,
          result,
          ruleName,
          fix(): void {
            atRule.params = sortedStr;
          }
        });
      });
    },
  {
    ruleName,
    messages,
    meta: {
      fixable: true,
      url: "https://github.com/example/template/blob/main/scripts/stylelint-apply-order.ts"
    }
  }
);

export default stylelint.createPlugin(ruleName, rule);
