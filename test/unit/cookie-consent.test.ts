import { describe, expect, it } from "vitest";

import {
  cookieConsentCookie,
  cookieHeaders,
  getCookieConsent,
  getRawCookieConsent,
  preferencesCookie,
  sessionCookie
} from "$/lib/cookies";
import { COOKIE_CONSENT_VERSION } from "@/constants";

describe("cookie consent versioning", () => {
  it("returns null from getCookieConsent when version mismatches, but getRawCookieConsent returns the data", async () => {
    const outdatedConsent = {
      hasConsented: true,
      preferences: {
        necessary: true,
        personalization: true,
        marketing: false,
        analytics: true
      },
      version: COOKIE_CONSENT_VERSION - 1
    };

    const cookieHeader = await cookieConsentCookie.serialize(outdatedConsent);
    const request = new Request("https://example.com/", {
      headers: { Cookie: cookieHeader }
    });

    const activeConsent = await getCookieConsent(request);
    const rawConsent = await getRawCookieConsent(request);

    // Active consent must be null so tracking doesn't execute with expired consent
    expect(activeConsent).toBeNull();

    // Raw consent preserves historical choices and version
    expect(rawConsent).not.toBeNull();
    expect(rawConsent?.version).toBe(COOKIE_CONSENT_VERSION - 1);
    expect(rawConsent?.hasConsented).toBe(true);
    expect(rawConsent?.preferences.personalization).toBe(true);

    // Policy updated flag logic
    const isPolicyUpdated = Boolean(
      rawConsent?.hasConsented && rawConsent.version !== COOKIE_CONSENT_VERSION
    );
    expect(isPolicyUpdated).toBe(true);
  });

  it("returns valid consent when version matches current COOKIE_CONSENT_VERSION", async () => {
    const currentConsent = {
      hasConsented: true,
      preferences: {
        necessary: true,
        personalization: true,
        marketing: true,
        analytics: true
      },
      version: COOKIE_CONSENT_VERSION
    };

    const cookieHeader = await cookieConsentCookie.serialize(currentConsent);
    const request = new Request("https://example.com/", {
      headers: { Cookie: cookieHeader }
    });

    const activeConsent = await getCookieConsent(request);
    const rawConsent = await getRawCookieConsent(request);

    expect(activeConsent).not.toBeNull();
    expect(activeConsent?.version).toBe(COOKIE_CONSENT_VERSION);
    expect(rawConsent).toEqual(activeConsent);

    const isPolicyUpdated = Boolean(
      rawConsent?.hasConsented && rawConsent.version !== COOKIE_CONSENT_VERSION
    );
    expect(isPolicyUpdated).toBe(false);
  });

  it("returns null for first-time visitors without cookie", async () => {
    const request = new Request("https://example.com/");

    const activeConsent = await getCookieConsent(request);
    const rawConsent = await getRawCookieConsent(request);

    expect(activeConsent).toBeNull();
    expect(rawConsent).toBeNull();

    const isPolicyUpdated = Boolean(
      rawConsent?.hasConsented && rawConsent.version !== COOKIE_CONSENT_VERSION
    );
    expect(isPolicyUpdated).toBe(false);
  });

  it("requires personalization consent even for authenticated users", async () => {
    const session = await sessionCookie.serialize({ token: "authenticated" });
    const prefs = await preferencesCookie.serialize({});
    const requestWithoutConsent = new Request("https://example.com/", {
      headers: { Cookie: `${session.split(";")[0]}; ${prefs.split(";")[0]}` }
    });

    const blockedHeaders = await cookieHeaders(requestWithoutConsent, [
      preferencesCookie,
      {}
    ] as const);
    expect(blockedHeaders.get("Set-Cookie")).toBeNull();

    const consent = await cookieConsentCookie.serialize({
      hasConsented: true,
      preferences: {
        necessary: true,
        personalization: true,
        marketing: false,
        analytics: false
      },
      version: COOKIE_CONSENT_VERSION
    });
    const requestWithConsent = new Request("https://example.com/", {
      headers: { Cookie: `${session.split(";")[0]}; ${consent.split(";")[0]}` }
    });

    const allowedHeaders = await cookieHeaders(requestWithConsent, [
      preferencesCookie,
      {}
    ] as const);
    expect(allowedHeaders.get("Set-Cookie")).toContain("preferences=");
  });
});
