import { afterEach, describe, expect, it, vi } from "vitest";

const importCookies = async (isDev: boolean) => {
  vi.resetModules();
  vi.doMock("@/constants", async (importOriginal) => {
    const orig = await importOriginal<typeof import("@/constants")>();
    return { ...orig, IS_DEV: isDev };
  });
  return import("$/lib/cookies");
};

afterEach(() => {
  vi.doUnmock("@/constants");
});

describe("cookie Secure flag", () => {
  it("is set in deployed (dev/prod) builds", async () => {
    const { sessionCookie } = await importCookies(false);
    const header = await sessionCookie.serialize({ token: "t" });
    expect(header).toContain("Secure");
  });

  it("is not set on the local dev server", async () => {
    const { sessionCookie } = await importCookies(true);
    const header = await sessionCookie.serialize({ token: "t" });
    expect(header).not.toContain("Secure");
  });
});
