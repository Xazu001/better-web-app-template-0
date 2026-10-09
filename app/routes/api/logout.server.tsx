import { data } from "react-router";

import { cookiesModify, getCookieConsent } from "$/lib/cookies";

import type { ActionFunctionArgs } from "react-router";

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  try {
    const consent = await getCookieConsent(request);
    const allowPersonalization = consent?.preferences.personalization;

    const headers = await cookiesModify(request, (m, c) => {
      m.clearCookie(c.session);
      if (allowPersonalization) {
        m.clearCookie(c.preferences);
      }
      return m.getHeaders(request);
    });

    return data({ success: true, message: "Logged out successfully" }, { headers });
  } catch (error) {
    console.error("Logout error:", error);
    return data({ error: "Failed to logout" }, { status: 500 });
  }
}
