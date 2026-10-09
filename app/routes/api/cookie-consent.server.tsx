import { type ActionFunctionArgs, data } from "react-router";

import { type CookiePreferences, cookiesModify } from "$/lib/cookies";
import { COOKIE_CONSENT_VERSION } from "@/constants";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const consent = formData.get("consent") as string;
  const preferencesJson = formData.get("preferences") as string;

  const ALL_ENABLED: CookiePreferences = {
    necessary: true,
    personalization: true,
    marketing: true,
    analytics: true
  };
  const NECESSARY_ONLY: CookiePreferences = {
    necessary: true,
    personalization: false,
    marketing: false,
    analytics: false
  };

  let preferences: CookiePreferences;

  try {
    preferences = { ...NECESSARY_ONLY, ...JSON.parse(preferencesJson || "{}") };
  } catch {
    preferences = NECESSARY_ONLY;
  }

  preferences.necessary = true;

  switch (consent) {
    case "all":
      preferences = ALL_ENABLED;
      break;
    case "decline":
      preferences = NECESSARY_ONLY;
      break;
    case "custom":
      break;
    default:
      return data({ error: "Invalid consent type" }, { status: 400 });
  }

  const consentData = {
    hasConsented: true,
    preferences,
    version: COOKIE_CONSENT_VERSION
  };

  const headers = await cookiesModify(request, (m, c) => {
    m.setCookie(c.consent, consentData);
    m.setCookie(c.analytics, preferences.analytics);
    m.setCookie(c.marketing, preferences.marketing);
    return m.getHeaders(request);
  });

  return data(
    {
      consent: true,
      preferences,
      version: COOKIE_CONSENT_VERSION,
      message: "Cookie preferences saved successfully"
    },
    { headers }
  );
}
