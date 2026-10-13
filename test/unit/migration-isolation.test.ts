import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const drizzleKitBin = path.join(repoRoot, "node_modules", "drizzle-kit", "bin.cjs");

const schemaV1 = `import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const example = sqliteTable("example", { id: integer("id").primaryKey() });
`;

const schemaV2 = `import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const example = sqliteTable("example", {
  id: integer("id").primaryKey(),
  label: text("label")
});
`;

const configFor = (out: string) =>
  `export default { dialect: "sqlite", schema: "./schema.ts", out: "./${out}" };
`;

const dirs: string[] = [];
const fixture = () => {
  const dir = mkdtempSync(path.join(repoRoot, "test", ".geniso-"));
  dirs.push(dir);
  writeFileSync(path.join(dir, "schema.ts"), schemaV1);
  writeFileSync(path.join(dir, "dev.config.ts"), configFor("dev-out"));
  writeFileSync(path.join(dir, "prod.config.ts"), configFor("prod-out"));
  return dir;
};

const generate = (dir: string, config: string) =>
  execFileSync(process.execPath, [drizzleKitBin, "generate", `--config=${config}`], {
    cwd: dir,
    env: { ...process.env }
  });

const snapshot = (dir: string, out: string) => {
  const target = path.join(dir, out);
  const files: Record<string, string> = {};
  const walk = (p: string) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) walk(full);
      else files[path.relative(target, full)] = readFileSync(full, "utf8");
    }
  };
  walk(target);
  return files;
};

afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("dev/prod generation isolation", () => {
  it("dev generation never touches the prod history and vice versa", { timeout: 90000 }, () => {
    const dir = fixture();
    generate(dir, "dev.config.ts");
    generate(dir, "prod.config.ts");

    const devBaseline = snapshot(dir, "dev-out");
    const prodBaseline = snapshot(dir, "prod-out");
    const sqlOf = (files: Record<string, string>) =>
      Object.entries(files)
        .filter(([name]) => name.endsWith(".sql"))
        .map(([, sql]) => sql);
    expect(sqlOf(prodBaseline)).toEqual(sqlOf(devBaseline));

    writeFileSync(path.join(dir, "schema.ts"), schemaV2);

    generate(dir, "dev.config.ts");
    expect(snapshot(dir, "prod-out")).toEqual(prodBaseline);
    const devAfter = snapshot(dir, "dev-out");
    expect(Object.keys(devAfter).length).toBeGreaterThan(Object.keys(devBaseline).length);

    generate(dir, "prod.config.ts");
    expect(snapshot(dir, "dev-out")).toEqual(devAfter);
    const prodAfter = snapshot(dir, "prod-out");
    expect(Object.keys(prodAfter).length).toBeGreaterThan(Object.keys(prodBaseline).length);
  });
});
