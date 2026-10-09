import type { CronConfig } from "./types";

/** Handler registry with lazy loading — supports multiple handlers per cron */
const handlers = new Map<string, CronConfig[]>();

/** Register a handler (multiple handlers per cron pattern are allowed) */
export function registerCron(config: CronConfig): void {
  const existing = handlers.get(config.cron) ?? [];
  existing.push(config);
  handlers.set(config.cron, existing);
}

/** Ensure handlers are loaded */
async function ensureHandlersLoaded(): Promise<void> {
  if (handlers.size === 0) {
    const { exampleCronHandler } = await import("./handlers/example");
    const { deleteUnverifiedUsersHandler } = await import("./handlers/delete-unverified-users");
    registerCron(exampleCronHandler);
    registerCron(deleteUnverifiedUsersHandler);
  }
}

/** Get all handlers for a cron expression */
export async function getCronHandlers(cron: string): Promise<CronConfig[]> {
  await ensureHandlersLoaded();
  return handlers.get(cron) ?? [];
}

/** Get all registered cron handlers */
export async function getAllCronHandlers(): Promise<CronConfig[]> {
  await ensureHandlersLoaded();
  return Array.from(handlers.values()).flat();
}
