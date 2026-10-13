import { afterEach, describe, expect, it, vi } from "vitest";

const importDevRouter = async (localBindings: boolean, appEnv: string = "local") => {
  vi.resetModules();
  vi.doMock("@/constants", async (importOriginal) => {
    const orig = await importOriginal<typeof import("@/constants")>();
    return { ...orig, LOCAL_BINDINGS: localBindings, APP_ENV: appEnv };
  });
  return (await import("$/api/dev")).default;
};

const fakeEnv = () => ({
  r2: { get: vi.fn() }
});

afterEach(() => {
  vi.doUnmock("@/constants");
});

describe("/api/_dev router guard", () => {
  it("denies remote bindings before touching the R2 bucket", async () => {
    const dev = await importDevRouter(false);
    const env = fakeEnv();
    const res = await dev.request("/r2/avatars/x.webp", {}, env);
    expect(res.status).toBe(404);
    expect(env.r2.get).not.toHaveBeenCalled();
  });

  it("denies remote cron before running any handler", async () => {
    const dev = await importDevRouter(false);
    const res = await dev.request("/cron?all=true", {}, fakeEnv());
    expect(res.status).toBe(404);
  });

  it("denies local bindings when APP_ENV is not local", async () => {
    const dev = await importDevRouter(true, "prod");
    const env = fakeEnv();
    const res = await dev.request("/r2/avatars/x.webp", {}, env);
    expect(res.status).toBe(404);
    expect(env.r2.get).not.toHaveBeenCalled();
  });

  it("serves a local object with metadata and ETag", async () => {
    const dev = await importDevRouter(true);
    const env = fakeEnv();
    env.r2.get.mockResolvedValue({
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("hello"));
          controller.close();
        }
      }),
      httpEtag: '"abc123"',
      writeHttpMetadata(headers: Headers) {
        headers.set("Content-Type", "image/webp");
      }
    });
    const res = await dev.request("/r2/avatars/x.webp", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("ETag")).toBe('"abc123"');
    expect(await res.text()).toBe("hello");
    expect(env.r2.get).toHaveBeenCalledWith("avatars/x.webp");
  });

  it("returns 404 for a missing local object", async () => {
    const dev = await importDevRouter(true);
    const env = fakeEnv();
    env.r2.get.mockResolvedValue(null);
    const res = await dev.request("/r2/none.webp", {}, env);
    expect(res.status).toBe(404);
  });

  it("returns 400 for malformed percent encoding", async () => {
    const dev = await importDevRouter(true);
    const env = fakeEnv();
    const res = await dev.request("/r2/bad%ZZkey", {}, env);
    expect(res.status).toBe(400);
    expect(env.r2.get).not.toHaveBeenCalled();
  });
});
