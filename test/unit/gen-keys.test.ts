import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { writeJwtKeys } from "../../scripts/gen-keys";

describe("writeJwtKeys", () => {
  it("writes a pair into an allowed .dev.vars basename", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gen-keys-"));
    const file = join(cwd, ".dev.vars");
    try {
      writeJwtKeys(file);
      const content = readFileSync(file, "utf8");
      expect(content).toContain("JWT_PRIVATE_KEY=");
      expect(content).toContain("JWT_PUBLIC_KEY=");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("writes a pair into an absolute .dev.vars.dev path", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gen-keys-"));
    const file = join(cwd, ".dev.vars.dev");
    try {
      writeJwtKeys(file);
      expect(readFileSync(file, "utf8")).toContain("JWT_PRIVATE_KEY=");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it.each([".dev.vars.prod", ".dev.vars.local", ".env", "secrets.txt"])(
    "refuses %s before generation and leaves it untouched",
    (name) => {
      const cwd = mkdtempSync(join(tmpdir(), "gen-keys-"));
      const file = join(cwd, name);
      writeFileSync(file, "EXISTING=keep-me\n");
      try {
        expect(() => writeJwtKeys(file)).toThrow(/secret put/);
        expect(readFileSync(file, "utf8")).toBe("EXISTING=keep-me\n");
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }
  );

  it("refuses a non-existent .dev.vars.prod without creating it", () => {
    const cwd = mkdtempSync(join(tmpdir(), "gen-keys-"));
    const file = join(cwd, ".dev.vars.prod");
    try {
      expect(() => writeJwtKeys(file)).toThrow(/secret put/);
      expect(existsSync(file)).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
