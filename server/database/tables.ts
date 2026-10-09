import type * as schema from "$/database/schema";
import type { Kyselify } from "drizzle-orm/kysely";
import type { ColumnType, Selectable } from "kysely";

/**
 * SQLite boolean column type for Kysely.
 *
 * SQLite stores booleans as integers (0/1) at runtime, but Drizzle
 * defines them as `integer("col", { mode: "boolean" })` which TypeScript
 * sees as `boolean`. This type correctly maps:
 * - SelectType: `number` (what SQLite actually returns)
 * - InsertType: `boolean | number | null` (flexible input)
 * - UpdateType: same as InsertType
 */
export type SQLiteBoolean = ColumnType<number, boolean | number | null, boolean | number | null>;

/**
 * Helper to replace boolean column types with SQLiteBoolean in a table type.
 * Kyselify wraps booleans in ColumnType<boolean, ...>, so we check the SelectType.
 */
export type WithSQLiteBooleans<T> = {
  [K in keyof T]: T[K] extends ColumnType<infer S, infer I, infer U>
    ? S extends boolean
      ? ColumnType<number, I, U>
      : T[K]
    : T[K];
};

/**
 * Kysely-compatible table types for the template database.
 *
 * Converts Drizzle schema types to Kysely-compatible types for use
 * with the Kysely query builder. Uses WithSQLiteBooleans to properly
 * handle SQLite's integer-based boolean storage.
 */
export type Tables = {
  users: WithSQLiteBooleans<Kyselify<typeof schema.users>>;
  user_rights: WithSQLiteBooleans<Kyselify<typeof schema.user_rights>>;
  logins: Kyselify<typeof schema.logins>;
  banned_emails: Kyselify<typeof schema.banned_emails>;
};

/**
 * Selectable entity types for database records.
 *
 * These types represent the shape of data when retrieved from the database.
 * They exclude auto-incrementing IDs and default values that are set by the database.
 */
export type User = Selectable<Tables["users"]>;
export type UserRight = Selectable<Tables["user_rights"]>;
export type Login = Selectable<Tables["logins"]>;
export type BannedEmail = Selectable<Tables["banned_emails"]>;
