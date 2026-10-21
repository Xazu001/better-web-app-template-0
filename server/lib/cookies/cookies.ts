import { type Cookie, type CookieOptions, createCookie } from "react-router";

import { IS_DEV } from "@/constants";

export type ConsentCategory = "necessary" | "personalization" | "marketing" | "analytics";

export interface TypedCookie<T> {
  readonly cookie: Cookie;
  readonly category: ConsentCategory;
  readonly name: string;
  parse(cookieHeader: string | null): Promise<T | null>;
  serialize(value: T, options?: CookieOptions): Promise<string>;
}

function createTypedCookie<T>(
  name: string,
  options: CookieOptions,
  category: ConsentCategory
): TypedCookie<T> {
  const cookie = createCookie(name, options);
  return {
    cookie,
    category,
    name,
    parse: async (cookieHeader: string | null): Promise<T | null> => {
      if (!cookieHeader) return null;
      try {
        const value = await cookie.parse(cookieHeader);
        return value as T | null;
      } catch {
        return null;
      }
    },
    serialize: async (value: T, opts?: CookieOptions): Promise<string> => {
      return cookie.serialize(value, opts);
    }
  };
}

export const SESSION_COOKIE_NAME = "session";
export type SessionValue = { token: string };

export const sessionCookie = createTypedCookie<SessionValue>(
  SESSION_COOKIE_NAME,
  {
    httpOnly: true,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  },
  "necessary"
);

export const PREFERENCES_COOKIE_NAME = "preferences";
export type PreferencesValue = Record<string, never>;

export const preferencesCookie = createTypedCookie<PreferencesValue>(
  PREFERENCES_COOKIE_NAME,
  {
    httpOnly: false,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  },
  "personalization"
);

export const THEME_COOKIE_NAME = "theme";
export type ThemeValue = "light" | "dark" | "system";

export const themeCookie = createTypedCookie<ThemeValue>(
  THEME_COOKIE_NAME,
  {
    httpOnly: false,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  },
  "personalization"
);

export const COOKIE_CONSENT_COOKIE_NAME = "cookie_consent";
export type CookieConsentValue = {
  hasConsented: boolean;
  preferences: CookiePreferences;
  version: number;
};

export interface CookiePreferences {
  necessary: boolean;
  personalization: boolean;
  marketing: boolean;
  analytics: boolean;
}

export const cookieConsentCookie = createTypedCookie<CookieConsentValue>(
  COOKIE_CONSENT_COOKIE_NAME,
  {
    httpOnly: true,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  },
  "necessary"
);

export const ANALYTICS_CONSENT_COOKIE_NAME = "analytics_consent";

export const analyticsConsentCookie = createTypedCookie<boolean>(
  ANALYTICS_CONSENT_COOKIE_NAME,
  {
    httpOnly: false,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  },
  "necessary"
);

export const MARKETING_CONSENT_COOKIE_NAME = "marketing_consent";

export const marketingConsentCookie = createTypedCookie<boolean>(
  MARKETING_CONSENT_COOKIE_NAME,
  {
    httpOnly: false,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  },
  "necessary"
);
