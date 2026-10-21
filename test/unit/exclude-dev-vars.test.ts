import { describe, expect, it } from "vitest";

import { excludeDevVars } from "../../scripts/lib/exclude-dev-vars";

type OutputBundle = Record<string, unknown>;

const fakeBundle = (): OutputBundle =>
  ({
    "index.js": { type: "chunk", fileName: "index.js" },
    "assets/app.css": { type: "asset", fileName: "assets/app.css" },
    ".dev.vars": { type: "asset", fileName: ".dev.vars" },
    "nested/.dev.vars.dev": { type: "asset", fileName: "nested/.dev.vars.dev" },
    ".dev.vars.prod": { type: "asset", fileName: ".dev.vars.prod" },
    "dev.vars-notes.txt": { type: "asset", fileName: "dev.vars-notes.txt" }
  }) as unknown as OutputBundle;

describe("excludeDevVars vite plugin", () => {
  it("is a build-only post plugin", () => {
    const plugin = excludeDevVars();
    expect(plugin.apply).toBe("build");
    expect(plugin.enforce).toBe("post");
    expect(plugin.name).toBe("exclude-dev-vars");
  });

  it("removes only emitted .dev.vars* assets and keeps unrelated files", () => {
    const plugin = excludeDevVars();
    const bundle = fakeBundle();
    const hook = plugin.generateBundle as unknown as (
      options: unknown,
      bundle: OutputBundle
    ) => void;
    hook({}, bundle);

    const remaining = Object.keys(bundle).sort();
    expect(remaining).toEqual(["assets/app.css", "dev.vars-notes.txt", "index.js"]);
  });
});
