/** Base interface for all KV entries with JSON serialization */
export interface KVEntry {
  readonly _type: string;
}

/** Options for KV put operations */
export interface KVPutOptions {
  expirationTtl?: number;
  expiration?: number;
  metadata?: Record<string, unknown>;
}

/** Options for KV get operations */
export interface KVGetOptions {
  cacheTtl?: number;
}

/** Cache entry wrapper for any cached content */
export interface CacheEntry<T> extends KVEntry {
  readonly _type: "cache";
  data: T;
  createdAt: number;
  expiresAt: number | null;
}
