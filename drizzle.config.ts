import { defineConfig } from "drizzle-kit";

const baseConfig = {
  out: "./drizzle",
  schema: "./server/database/schema.ts",
  dialect: "sqlite"
} as const;

type D1Credentials = {
  accountId: string;
  databaseId: string;
  token: string;
};

const outDir = { dev: "./drizzle", prod: "./drizzle-prod" } as const;

export const createConfig = (
  dbCredentials: D1Credentials,
  env: "dev" | "prod" = "dev"
) =>
  defineConfig({
    ...baseConfig,
    out: outDir[env],
    driver: "d1-http",
    dbCredentials
  });

export default defineConfig(baseConfig);
