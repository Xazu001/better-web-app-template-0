// @vitest-environment node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const stylesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app/styles");
const themeCss = () => readFile(path.join(stylesDir, "theme.css"), "utf8");
const colorsCss = () => readFile(path.join(stylesDir, "utilities/colors.css"), "utf8");

async function compileMain() {
  return compile(await readFile(path.join(stylesDir, "main.css"), "utf8"), {
    base: stylesDir,
    loadStylesheet: async (id: string, base: string) => {
      const resolved = id.startsWith(".")
        ? path.resolve(base, id)
        : require.resolve(`${id}/index.css`, { paths: [base] });
      return {
        path: resolved,
        content: await readFile(resolved, "utf8"),
        base: path.dirname(resolved)
      };
    }
  });
}

const toneDeclaration = (prop: string, token: string, n: string) =>
  `${prop}: oklch(from var(--color-${token}) clamp(0, calc(l * ${n} / 100), 1) c h)`;

async function compilePalette(candidates: string[], extra = "") {
  const input = `${await themeCss()}\n${await colorsCss()}\n@tailwind utilities;${extra}`;
  return (await compile(input)).build(candidates);
}

describe("tone utilities", () => {
  it("emit the correct property and lightness calc for all seven families", async () => {
    const css = await compilePalette([
      "bg-tone-primary/125",
      "text-tone-primary/50",
      "border-tone-primary/75",
      "outline-tone-primary/150",
      "ring-tone-primary/100",
      "fill-tone-primary/0",
      "stroke-tone-primary/200"
    ]);
    expect(css).toContain(toneDeclaration("background-color", "primary", "125"));
    expect(css).toContain(toneDeclaration("color", "primary", "50"));
    expect(css).toContain(toneDeclaration("border-color", "primary", "75"));
    expect(css).toContain(toneDeclaration("outline-color", "primary", "150"));
    expect(css).toContain(toneDeclaration("--tw-ring-color", "primary", "100"));
    expect(css).toContain(toneDeclaration("fill", "primary", "0"));
    expect(css).toContain(toneDeclaration("stroke", "primary", "200"));
  });

  it("scales lightness across the percentage range", async () => {
    const css = await compilePalette([
      "bg-tone-primary/0",
      "bg-tone-primary/50",
      "bg-tone-primary/100",
      "bg-tone-primary/125",
      "bg-tone-primary/200"
    ]);
    for (const n of ["0", "50", "100", "125", "200"]) {
      expect(css).toContain(toneDeclaration("background-color", "primary", n));
    }
  });

  it("resolves multi-part semantic tokens", async () => {
    const css = await compilePalette([
      "bg-tone-elevation-1/125",
      "text-tone-on-surface/75",
      "bg-tone-secondary-container/125"
    ]);
    expect(css).toContain(toneDeclaration("background-color", "elevation-1", "125"));
    expect(css).toContain(toneDeclaration("color", "on-surface", "75"));
    expect(css).toContain(toneDeclaration("background-color", "secondary-container", "125"));
  });

  it("keeps normal color opacity modifiers untouched", async () => {
    const css = await compilePalette(["bg-primary/50", "text-on-surface/70"]);
    expect(css).toContain("color-mix(in oklab, var(--color-primary) 50%, transparent)");
    expect(css).toContain("color-mix(in oklab, var(--color-on-surface) 70%, transparent)");
    expect(css).not.toContain("calc(l * 50");
    expect(css).not.toContain("calc(l * 70");
  });

  it("works with variants and @apply", async () => {
    const css = await compilePalette(
      ["hover:bg-tone-primary/125", "focus:text-tone-primary/75"],
      ".probe { @apply bg-tone-primary/150; }"
    );
    expect(css).toMatch(/@media \(hover: hover\)[\s\S]*?\.hover\\:bg-tone-primary\\\/125:hover/);
    expect(css).toMatch(/\.focus\\:text-tone-primary\\\/75:focus/);
    expect(css).toMatch(/\.probe \{\s*background-color: oklch\(from var\(--color-primary\)/);
  });

  it("emits nothing for unknown tokens or invalid modifiers", async () => {
    const css = await compilePalette([
      "bg-tone-missing/125",
      "bg-tone-primary",
      "bg-tone-primary/-50",
      "bg-tone-primary/nope",
      "bg-tone-primary/12.5",
      "bg-tone-primary/1.25"
    ]);
    expect(css).not.toContain("bg-tone");
    expect(css).not.toContain("calc(l *");
  });

  it("tones two properties on one element without shared state", async () => {
    const css = await compilePalette(["bg-tone-primary/125", "text-tone-on-primary/75"]);
    const bg = css.match(/\.bg-tone-primary\\\/125 \{([^}]+)\}/)?.[1] ?? "";
    const text = css.match(/\.text-tone-on-primary\\\/75 \{([^}]+)\}/)?.[1] ?? "";
    expect(bg).toContain(toneDeclaration("background-color", "primary", "125"));
    expect(bg).not.toContain("on-primary");
    expect(text).toContain(toneDeclaration("color", "on-primary", "75"));
    expect(text).not.toContain("background-color");
  });

  it("does not force origin alpha in the formula", async () => {
    const css = await compilePalette(["bg-tone-scrim/125"]);
    expect(css).toContain(toneDeclaration("background-color", "scrim", "125"));
    expect(css).not.toContain("1) c h /");
  });
});

describe("palette split preserves every role", () => {
  it("keeps all semantic roles usable as named tokens", async () => {
    const css = await compilePalette([
      "bg-secondary-container",
      "bg-elevation-1",
      "bg-glass-error",
      "text-on-secondary-container",
      "border-outline-variant",
      "bg-inverse-surface",
      "text-on-glass",
      "bg-popover",
      "bg-float"
    ]);
    expect(css).toContain("--color-secondary-container");
    expect(css).toContain("--color-elevation-1");
    expect(css).toContain("--color-glass-error");
    expect(css).toContain("--color-on-secondary-container");
    expect(css).toContain("--color-outline-variant");
    expect(css).toContain("--color-inverse-surface");
    expect(css).toContain("--color-on-glass");
    expect(css).toContain("--color-popover");
    expect(css).toContain("--color-float");
  });

  it("preserves representative exact declarations", async () => {
    const css = await compilePalette([
      "bg-primary",
      "bg-surface",
      "bg-elevation-1",
      "bg-secondary-container",
      "bg-glass-error",
      "text-on-ghost",
      "bg-scrim"
    ]);
    for (const decl of [
      "--color-primary: oklch(65% 0.19 262deg)",
      "--color-surface: oklch(16% 0.015 264deg)",
      "--color-elevation-1: oklch(21% 0.018 264deg)",
      "--color-on-primary: oklch(15% 0.03 264deg)",
      "--color-glass-error: color-mix(in oklch, var(--color-error) 20%, var(--color-glass))",
      "--color-on-ghost: var(--color-on-primary)",
      "--color-scrim: oklch(0% 0 0deg / 60%)"
    ]) {
      expect(css).toContain(decl);
    }
  });
});

describe("component geometry utilities", () => {
  it("emits size-*, h-* and the checkbox w-* mirror from utilities/ui.css tokens", async () => {
    const css = (await compileMain()).build(["size-btn-md", "h-btn-md", "w-checkbox-md"]);
    expect(css).toMatch(/\.size-btn-md \{[^}]*width: var\(--size-btn-md\)/);
    expect(css).toMatch(/\.size-btn-md \{[^}]*height: var\(--size-btn-md\)/);
    expect(css).toMatch(/\.h-btn-md \{[^}]*height: var\(--height-btn-md\)/);
    expect(css).toMatch(/\.w-checkbox-md \{[^}]*width: var\(--width-checkbox-md\)/);
  });

  it("emits nothing for w-btn-* (no button width mirror) or height-*/width-* class names", async () => {
    const css = (await compileMain()).build(["w-btn-md", "height-btn-md", "width-btn-md"]);
    expect(css).not.toMatch(/\.w-btn-md/);
    expect(css).not.toMatch(/\.height-btn-md/);
    expect(css).not.toMatch(/\.width-btn-md/);
  });

  it("keeps the html.light override block and dark color-scheme in the compiled output", async () => {
    const css = (await compileMain()).build(["bg-surface"]);
    expect(css).toMatch(/html\.light \{[^}]*--color-surface: oklch\(100% 0 0deg\)/);
    expect(css).toMatch(/html\.dark \{\s*color-scheme: dark/);
    expect(css).toContain("--color-surface: oklch(16% 0.015 264deg)");
  });
});

describe("main.css import graph", () => {
  it("compiles with real @apply usage across app stylesheets", async () => {
    const compiler = await compileMain();
    const css = compiler.build([
      "bg-tone-primary/125",
      "text-tone-on-surface/75",
      "bg-primary/50",
      "bg-secondary-container",
      "bg-tone-red-500/125"
    ]);
    expect(css).toContain(toneDeclaration("background-color", "primary", "125"));
    expect(css).toContain(toneDeclaration("background-color", "red-500", "125"));
    expect(css).toContain(toneDeclaration("color", "on-surface", "75"));
    expect(css).toContain("color-mix(in oklab, var(--color-primary) 50%, transparent)");
    expect(css).toContain("--color-secondary-container");
  });
});
