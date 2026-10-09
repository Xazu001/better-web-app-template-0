import { type PreferencesValue, getCookieConsent, preferencesCookie } from "$/lib/cookies";

export const CUSTOMIZABLE_PREFS = {} as const;

export type Preferences = PreferencesValue;

export async function getPreferences(request: Request): Promise<Preferences> {
  const defaults: Preferences = {};
  const consent = await getCookieConsent(request);
  if (!consent?.preferences.personalization) return defaults;

  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return defaults;

  const prefs = await preferencesCookie.parse(cookieHeader);
  return { ...defaults, ...prefs };
}
