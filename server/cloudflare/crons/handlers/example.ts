import type { CronConfig } from "../types";

/** Example cron handler - runs every minute */
export const exampleCronHandler: CronConfig = {
  cron: "* * * * *",
  handler: async (controller, _env, _ctx) => {
    console.log(`[Cron] Triggered at ${new Date(controller.scheduledTime).toISOString()}`);
    console.log(`[Cron] Pattern: ${controller.cron}`);
  }
};
