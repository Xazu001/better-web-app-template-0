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

export const createConfig = (dbCredentials: D1Credentials) =>
  defineConfig({ ...baseConfig, driver: "d1-http", dbCredentials });

export default defineConfig(baseConfig);
