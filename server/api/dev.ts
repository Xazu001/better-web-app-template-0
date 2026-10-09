import { Hono } from "hono";

import { getAllCronHandlers, getCronHandlers } from "$/cloudflare/crons";

import type { Services } from "$/core";
import type { Env } from "../setup";

const dev = new Hono<{ Bindings: Env; Variables: { services: Services } }>();
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

export default dev;
