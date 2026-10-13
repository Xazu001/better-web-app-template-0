import { Hono } from "hono";

import { getAllCronHandlers, getCronHandlers } from "$/cloudflare/crons";

import { APP_ENV, LOCAL_BINDINGS } from "@/constants";

import type { Services } from "$/core";
import type { Env } from "../setup";

const dev = new Hono<{ Bindings: Env; Variables: { services: Services } }>();

dev.use(async (c, next) => {
  if (!LOCAL_BINDINGS || APP_ENV !== "local") {
    return c.json({ error: "not found" }, 404);
  }
  await next();
});

dev.get("/cron", async (c) => {
  const isDev = __IS_DEV__;

  if (!isDev) {
    return c.json({ error: "Cron testing endpoint is only available in dev mode" }, 403);
  }

  if (c.req.query("all") === "true") {
    const allHandlers = await getAllCronHandlers();
    const results: Array<{ cron: string; success: boolean; error?: string }> = [];

    for (const { cron, handler } of allHandlers) {
      try {
        await handler(
          { cron, scheduledTime: Date.now() } as ScheduledController,
          c.env,
          c.executionCtx as ExecutionContext,
          c.get("services")
        );
        results.push({ cron, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ cron, success: false, error: errorMessage });
      }
    }

    return c.json({
      success: true,
      message: `Executed ${allHandlers.length} cron handlers`,
      results
    });
  }

  // Single handler mode
  const cron = c.req.query("cron") || "0 0 * * *";

  const cronHandlers = await getCronHandlers(cron);

  if (cronHandlers.length === 0) {
    return c.json({ error: `No handler found for cron: ${cron}` }, 404);
  }

  const results: Array<{ index: number; success: boolean; error?: string }> = [];

  for (let i = 0; i < cronHandlers.length; i++) {
    try {
      await cronHandlers[i].handler(
        { cron, scheduledTime: Date.now() } as ScheduledController,
        c.env,
        c.executionCtx as ExecutionContext,
        c.get("services")
      );
      results.push({ index: i, success: true });
    } catch (error) {
      console.error(`[Dev Cron] Handler ${i} execution failed:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ index: i, success: false, error: errorMessage });
    }
  }

  return c.json({
    success: results.every((r) => r.success),
    cron,
    message: `Executed ${cronHandlers.length} handler(s) - check console for logs`,
    results
  });
});

dev.get("/r2/*", async (c) => {
  const path = new URL(c.req.url).pathname;
  const marker = "/r2/";
  const start = path.indexOf(marker);
  const rawKey = start === -1 ? "" : path.slice(start + marker.length);
  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return c.json({ error: "invalid key encoding" }, 400);
  }
  if (!key || key.includes("..")) {
    return c.json({ error: "invalid key" }, 400);
  }
  const object = await c.env.r2.get(key);
  if (!object) {
    return c.json({ error: "not found" }, 404);
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
});

export default dev;
