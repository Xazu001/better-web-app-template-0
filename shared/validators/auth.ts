import { z } from "zod";

import authRules from "./auth-rules.json";

// ──────────────────────────────────────────────────────────────
// 1. Login Schema
// ──────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .min(authRules.email.min, `Must be at least ${authRules.email.min} character(s) long`)
    .max(authRules.email.max, `Must be at most ${authRules.email.max} characters long`),
  password: z
    .string()
    .min(authRules.password.min, `Must be at least ${authRules.password.min} character(s) long`)
    .max(authRules.password.max, `Must be at most ${authRules.password.max} characters long`),
  remember: z.string().optional()
});

// ──────────────────────────────────────────────────────────────
// 2. Register Schema
// ──────────────────────────────────────────────────────────────

export const RegisterSchema = z
  .object({
    username: z
      .string()
      .min(authRules.username.min, `Must be at least ${authRules.username.min} character(s) long`)
      .max(authRules.username.max, `Must be at most ${authRules.username.max} characters long`)
      .regex(new RegExp(authRules.username.pattern), "Can't contain special characters"),
    email: z
      .string()
      .email("Invalid email format")
      .min(authRules.email.min, `Must be at least ${authRules.email.min} character(s) long`)
      .max(authRules.email.max, `Must be at most ${authRules.email.max} characters long`),
    password: z
      .string()
      .min(authRules.password.min, `Must be at least ${authRules.password.min} character(s) long`)
      .max(authRules.password.max, `Must be at most ${authRules.password.max} characters long`),
    confirmPassword: z
      .string()
      .min(authRules.password.min, `Must be at least ${authRules.password.min} character(s) long`)
      .max(authRules.password.max, `Must be at most ${authRules.password.max} characters long`)
      .optional(),
    terms: z.union([z.boolean(), z.string()]).optional()
  })
  .refine(
    (data) => {
      if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"]
    }
  )
  .refine(
    (data) => {
      // If confirmPassword is provided, we are on the web form.
      if (data.confirmPassword !== undefined) {
        return data.terms === "on";
      }
      // If we are on the API (confirmPassword is undefined)
      if (data.terms === undefined) return true;
      return data.terms === true;
    },
    {
      message: "TERMS_REQUIRED",
      path: ["general"]
    }
  )
  .transform((data) => {
    const termsBool =
      data.terms === undefined
        ? true
        : typeof data.terms === "boolean"
          ? data.terms
          : data.terms === "on";
    return {
      ...data,
      terms: termsBool
    };
  });
