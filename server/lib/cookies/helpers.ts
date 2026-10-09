import { COOKIE_CONSENT_VERSION } from "@/constants";

import {
  type CookieConsentValue,
  type CookiePreferences,
  type PreferencesValue,
  type SessionValue,
  type ThemeValue,
  type TypedCookie,
  analyticsConsentCookie,
  cookieConsentCookie,
  marketingConsentCookie,
  preferencesCookie,
  sessionCookie,
  themeCookie
} from "./cookies";

import type { CookieSerializeOptions } from "react-router";

export type { CookiePreferences, CookieConsentValue };

export interface CookieConsentData extends CookieConsentValue {}

export type CookieEntry<T> = readonly [
  cookie: TypedCookie<T>,
  value: T | null,
  options?: CookieSerializeOptions
];

export async function cookieHeaders<T>(
  request: Request,
  ...entries: CookieEntry<T>[]
): Promise<Headers> {
  const headers = new Headers();
  if (entries.length === 0) return headers;

  const cookieHeader = request.headers.get("Cookie");

  let consentChecked = false;
  let consentData: CookieConsentValue | null = null;

  for (const [cookie, value, options] of entries) {
    if (value === null) {
      headers.append("Set-Cookie", await serializeClear(cookie, options));
      continue;
    }

    if (cookie.category !== "necessary") {
      if (!consentChecked) {
        consentData = await getCookieConsent(request);
        consentChecked = true;
      }
      if (consentData?.preferences[cookie.category] !== true) continue;
    }

    if (await cookieAlreadyEquals(cookie, cookieHeader, value)) continue;

    headers.append("Set-Cookie", await cookie.serialize(value, options));
  }

  return headers;
}

export async function getCookieConsent(request: Request): Promise<CookieConsentValue | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  try {
    const data = await cookieConsentCookie.parse(cookieHeader);
    if (data?.version !== COOKIE_CONSENT_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getRawCookieConsent(request: Request): Promise<CookieConsentValue | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  try {
    const data = await cookieConsentCookie.parse(cookieHeader);
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Check whether the caller has explicitly consented to analytics cookies.
 *
 * Two consent channels are accepted:
 *  - Web: the consent cookie (parsed via getCookieConsent).
 *  - API clients: the `X-Analytics-Consent: 1` header (they can't use cookies).
 */
export async function hasAnalyticsConsent(request: Request): Promise<boolean> {
  const consent = await getCookieConsent(request);
  if (consent?.preferences.analytics === true) return true;
  return request.headers.get("X-Analytics-Consent") === "1";
}

export async function getTheme(request: Request): Promise<ThemeValue> {
  const cookieHeader = request.headers.get("Cookie");
  const value = await themeCookie.parse(cookieHeader);
  return value === "light" || value === "dark" ? value : "system";
}

// ──────────────────────────────────────────────────────────────
// Cookie Modifier API
// ──────────────────────────────────────────────────────────────

export const cookies = {
  session: sessionCookie,
  preferences: preferencesCookie,
  theme: themeCookie,
  consent: cookieConsentCookie,
  analytics: analyticsConsentCookie,
  marketing: marketingConsentCookie
} as const;

export type Cookies = typeof cookies;

type CookieValueMap = {
  session: SessionValue;
  preferences: PreferencesValue;
  theme: ThemeValue;
  consent: CookieConsentValue;
  analytics: boolean;
  marketing: boolean;
};

type CookieKey = keyof CookieValueMap;

type CookieOperation =
  | {
      cookie: TypedCookie<unknown>;
      value: unknown;
      options?: CookieSerializeOptions;
      isPatch?: false;
    }
  | {
      cookie: TypedCookie<unknown>;
      value: Record<string, unknown>;
      options?: CookieSerializeOptions;
      isPatch: true;
    };

class CookieModifier {
  private operations: CookieOperation[] = [];

  clear<K extends CookieKey>(key: K): this {
    const cookie = cookies[key];
    this.operations.push({
      cookie: cookie as TypedCookie<unknown>,
      value: null
    });
    return this;
  }

  clearCookie<T>(cookie: TypedCookie<T>): this {
    this.operations.push({
      cookie: cookie as TypedCookie<unknown>,
      value: null
    });
    return this;
  }

  set<K extends CookieKey>(
    key: K,
    value: CookieValueMap[K],
    options?: CookieSerializeOptions
  ): this {
    const cookie = cookies[key];
    this.operations.push({
      cookie: cookie as TypedCookie<unknown>,
      value,
      options
    });
    return this;
  }

  setCookie<T>(cookie: TypedCookie<T>, value: T, options?: CookieSerializeOptions): this {
    this.operations.push({
      cookie: cookie as TypedCookie<unknown>,
      value,
      options
    });
    return this;
  }

  patch<K extends CookieKey>(
    key: K,
    partialValue: Partial<CookieValueMap[K]>,
    options?: CookieSerializeOptions
  ): this {
    const cookie = cookies[key];
    this.operations.push({
      cookie: cookie as TypedCookie<unknown>,
      value: partialValue as Record<string, unknown>,
      options,
      isPatch: true
    });
    return this;
  }

  patchCookie<T extends Record<string, unknown>>(
    cookie: TypedCookie<T>,
    partialValue: Partial<T>,
    options?: CookieSerializeOptions
  ): this {
    this.operations.push({
      cookie: cookie as TypedCookie<unknown>,
      value: partialValue as Record<string, unknown>,
      options,
      isPatch: true
    });
    return this;
  }

  clearAll(): this {
    for (const cookie of Object.values(cookies)) {
      this.operations.push({
        cookie: cookie as TypedCookie<unknown>,
        value: null
      });
    }
    return this;
  }

  async getHeaders(request: Request): Promise<Headers> {
    const cookieHeader = request.headers.get("Cookie");
    const entries: CookieEntry<unknown>[] = [];

    for (const op of this.operations) {
      if (op.isPatch) {
        const existing = await op.cookie.parse(cookieHeader);
        const merged = {
          ...(existing || ({} as Record<string, unknown>)),
          ...op.value
        };
        entries.push([op.cookie, merged, op.options]);
      } else {
        entries.push([op.cookie, op.value, op.options]);
      }
    }

    return cookieHeaders(request, ...entries);
  }
}

export async function cookiesModify(
  request: Request,
  modify: (m: CookieModifier, c: Cookies) => Promise<Headers> | Headers
): Promise<Headers> {
  const modifier = new CookieModifier();
  return modify(modifier, cookies);
}

async function serializeClear<T>(
  cookie: TypedCookie<T>,
  options?: CookieSerializeOptions
): Promise<string> {
  return cookie.serialize(null as T, {
    ...options,
    expires: new Date(0),
    maxAge: 0
  });
}

async function cookieAlreadyEquals<T>(
  cookie: TypedCookie<T>,
  cookieHeader: string | null,
  value: T
): Promise<boolean> {
  if (!cookieHeader) return false;
  try {
    const existing = await cookie.parse(cookieHeader);
    if (existing === null || existing === undefined) return false;
    return jsonEqual(existing, value);
  } catch {
    return false;
  }
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
