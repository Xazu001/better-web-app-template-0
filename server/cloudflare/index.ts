// Cache — KV-backed (CacheManager + versioned regions)
export { CacheManager, CacheRegion } from "./kv/index";

export type { KVEntry, KVPutOptions, KVGetOptions, CacheEntry } from "./kv/index";

// Rate limiting — Durable Object (atomic per-key counters)
export { RateLimiterDO } from "./rate-limit";

export type { RateLimitResult } from "./rate-limit";

// QueueManager - Queue Management
export {
  // Core class
  QueueManager,
  // Registry
  getHandler,
  registerHandler,
  // Handlers
  deleteR2ObjectsHandler,
  // Result helpers
  queueOk,
  queueFailed
} from "./queue/index";

export type {
  QueueMessage,
  QueueMessages,
  QueueHandler,
  HandlerConfig,
  QueueSendOptions,
  QueueStats,
  QueueOk,
  QueueFailed,
  QueueResult
} from "./queue/index";

// CronManager - Scheduled Tasks
export { registerCron, getCronHandlers } from "./crons/index";

export type { CronHandler, CronConfig } from "./crons/index";
