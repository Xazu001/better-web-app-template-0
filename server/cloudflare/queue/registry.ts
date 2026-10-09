import type { HandlerConfig, QueueMessages } from "./types";

const handlers = new Map<keyof QueueMessages, HandlerConfig>();

export function registerHandler<T extends keyof QueueMessages>(config: HandlerConfig<T>): void {
  handlers.set(config.type, config as unknown as HandlerConfig);
}

export async function getHandler<T extends keyof QueueMessages>(
  type: T
): Promise<HandlerConfig<T> | undefined> {
  // Lazy load handlers on first access
  if (!handlers.has("delete-r2-objects")) {
    const { deleteR2ObjectsHandler } = await import("./handlers/delete-r2-objects");
    registerHandler(deleteR2ObjectsHandler);
  }

  return handlers.get(type) as HandlerConfig<T> | undefined;
}
