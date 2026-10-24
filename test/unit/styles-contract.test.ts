// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const stylesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app/styles");
const read = (name: string) => readFileSync(path.join(stylesDir, name), "utf8");

const main = read("main.css");
const theme = read("theme.css");
const tokens = read("utilities/tokens.css");
const ui = read("utilities/ui.css");

describe("stylesheet layout", () => {
  it("has no leftover theme/ directory or utilities/theme.css", () => {
    expect(existsSync(path.join(stylesDir, "theme"))).toBe(false);
    expect(existsSync(path.join(stylesDir, "utilities/theme.css"))).toBe(false);
    expect(main).not.toContain("utilities/theme.css");
  });

  it("imports every local stylesheet exactly once and all resolve", () => {
    const imports = [...main.matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(imports).size).toBe(imports.length);
    for (const specifier of imports) {
      if (specifier === "tailwindcss") continue;
      expect(existsSync(path.resolve(stylesDir, specifier)), specifier).toBe(true);
    }
  });
});

describe("token ownership", () => {
  it("utilities/tokens.css keeps no component geometry declarations", () => {
    expect(tokens).not.toMatch(/--(size|height)-[a-z]/);
    // --width-checkbox-* mirrors moved out with the geometry section.
    expect(tokens).not.toMatch(/--width-checkbox-/);
    // General tokens stay.
    expect(tokens).toContain("--radius-md");
    expect(tokens).toContain("--z-index-modal");
    expect(tokens).toContain("--ease-ui");
  });

  it("utilities/ui.css owns the component geometry", () => {
    for (const name of [
      "--size-btn-md: 5.5rem",
      "--size-checkbox-md: 3.25rem",
      "--height-btn-md: var(--size-btn-md)",
      "--width-checkbox-md: var(--size-checkbox-md)"
    ]) {
      expect(ui).toContain(name);
    }
  });
});

describe("theme.css owns the whole palette", () => {
  it("keeps the dark defaults and the light override block", () => {
    expect(theme).toContain("--color-surface: oklch(16% 0.015 264deg)");
    expect(theme).toContain("--color-primary: oklch(65% 0.19 262deg)");
    expect(theme).toContain("--color-scrim: oklch(0% 0 0deg / 60%)");
    expect(theme).toMatch(/html\.dark\s*\{[^}]*color-scheme:\s*dark/);
    expect(theme).toMatch(/html\.light\s*\{[^}]*--color-surface:\s*oklch\(100% 0 0deg\)/);
    expect(theme).toMatch(/html\.light\s*\{[\s\S]*color-scheme:\s*light/);
  });
});
