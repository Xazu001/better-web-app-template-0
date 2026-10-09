import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { USER_STATUS_VALUES, type UserStatusType } from "@/enums";

// This file defines all database tables for the template.
// Uses Drizzle ORM with SQLite for Cloudflare D1 compatibility.

/**
 * Users table - Core user accounts and profiles
 *
 * Stores user authentication and profile information. Each user has a unique
 * namespace for URL-friendly identifiers and optional avatar.
 */
export const users = sqliteTable(
  "users",
  {
    user_id: text("user_id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => crypto.randomUUID()), // UUID for unique identification
    user_name: text("user_name").notNull(), // Display name for the user
    user_namespace: text("user_namespace").unique().notNull(), // URL-friendly unique identifier
    user_avatar_source: text("user_avatar_source"), // Path to avatar image file
    user_verified: integer("user_verified", { mode: "boolean" }).notNull(), // Email verification status
    user_status: text("user_status", { enum: USER_STATUS_VALUES })
      .$type<UserStatusType>()
      .notNull()
      .default("active"), // User account status
    user_created_on: integer("user_created_on")
      .notNull()
      .$defaultFn(() => Date.now()) // Account creation timestamp
  },
  (table) => ({
    // Index for user lookup by verification status
    verifiedIdx: index("idx_users_verified").on(table.user_verified),
    // Index for user search by name
    nameIdx: index("idx_users_name").on(table.user_name),
    // Index for user status filtering
    statusIdx: index("idx_users_status").on(table.user_status),
    // Index for sorting by creation date
    createdOnIdx: index("idx_users_created_on").on(table.user_created_on)
  })
);

/**
 * User rights table - Permission system for user capabilities
 *
 * Controls what actions users can perform. Implements a role-based
 * permission system.
 */
export const user_rights = sqliteTable(
  "user_rights",
  {
    user_right_id: integer("user_right_id").primaryKey({ autoIncrement: true }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.user_id), // Foreign key to users table
    user_admin: integer("user_admin", { mode: "boolean" }).default(false) // Admin privileges
  },
  (table) => ({
    // Index for fast user rights lookup
    userIdIdx: index("idx_user_rights_user_id").on(table.user_id)
  })
);

/**
 * Logins table - User authentication credentials
 *
 * Stores email/password combinations for user authentication.
 * Separate from users table to support multiple login methods.
 */
export const logins = sqliteTable(
  "logins",
  {
    login_id: integer("login_id").primaryKey({ autoIncrement: true }),
    user_id: text("user_id").references(() => users.user_id), // Link to user account
    login_email: text("login_email").unique(), // Unique email for login (nullable for deleted users)
    login_password: text("login_password"), // Hashed password
    login_created_on: integer("login_created_on").$defaultFn(() => Date.now()), // Timestamp for account creation
    login_verification_code: text("login_verification_code"), // Email verification token
    login_verification_code_expires_on: integer("login_verification_code_expires_on") // Verification token expiry (null = no expiry)
  },
  (table) => ({
    // Index for fast user login lookup
    userIdIdx: index("idx_logins_user_id").on(table.user_id),
    // Index for verification code lookup
    verificationCodeIdx: index("idx_logins_verification_code").on(table.login_verification_code)
  })
);

/**
 * Banned emails table - Registration blocklist
 *
 * Prevents registration with email addresses banned by administrators.
 */
export const banned_emails = sqliteTable(
  "banned_emails",
  {
    banned_email_id: integer("banned_email_id").primaryKey({
      autoIncrement: true
    }),
    email: text("email").unique().notNull(), // Banned email address
    reason: text("reason"), // Why the email was banned
    banned_by: text("banned_by"), // Admin user id that issued the ban
    banned_at: integer("banned_at")
      .notNull()
      .$defaultFn(() => Date.now()) // When the ban was issued
  },
  (table) => ({
    // Index for fast ban lookups
    emailIdx: index("idx_banned_emails_email").on(table.email)
  })
);
