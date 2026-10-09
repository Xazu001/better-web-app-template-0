import { RouterContextProvider, createRequestHandler } from "react-router";

import { getCronHandlers } from "$/cloudflare/crons";
import { QueueManager } from "$/cloudflare/queue";
import { RateLimiterDO } from "$/cloudflare/rate-limit";
import { cloudflareContext, servicesContext } from "$/load-context";
import { createApp, createServices } from "$/setup";

import type { Env } from "$/setup";

// Durable Object classes must be exported from the main module
export { RateLimiterDO };

// Create a Hono app with services middleware
const app = createApp();

/* React Router Handler */
app.all("*", async (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build" as any),
    import.meta.env.MODE
  );

  const loadContext = new RouterContextProvider();
  loadContext.set(cloudflareContext, {
    env: c.env,
    ctx: c.executionCtx as ExecutionContext,
    ASSETS: c.env.ASSETS!
  });
  loadContext.set(servicesContext, c.get("services"));

  return requestHandler(c.req.raw, loadContext);
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.QUEUE) {
      console.error("[Queue] Queue binding not configured");
      return;
    }
    const services = await createServices(env);
    const queue = new QueueManager(env.QUEUE);
    await queue.processBatch(batch, env, ctx, services);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const handlers = await getCronHandlers(controller.cron);
    if (handlers.length === 0) {
      console.log(`[Cron] No handler registered for: ${controller.cron}`);
      return;
    }
    const services = await createServices(env);
    for (const handler of handlers) {
      await handler.handler(controller, env, ctx, services);
    }
  }
};
