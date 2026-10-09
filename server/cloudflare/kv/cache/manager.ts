import { CacheRegion } from "./region";

import type { CacheEntry } from "../types";

/**
 * Central manager for all cache and rate limiting operations.
 *
 * Wraps Cloudflare KV with JSON serialization and TTL support. Accessed via
 * `BaseService.cache`. For anything cache-like prefer a versioned
 * `CacheRegion` (`.region(name)`) — the raw get/set here is for transient,
 * non-cache KV records (e.g. OAuth state).
 *
 * @example
 * ```ts
 * // Region (versioned, invalidatable as a group)
 * const data = await this.cache.region("home").getOrSet("web", fetchHome, 600);
 * await this.cache.region("home").invalidate();
 *
 * // Raw KV record (transient state)
 * await this.cache.set(`oauth_state_${state}`, userId, 600);
 * ```
 */
export class CacheManager {
  constructor(private kv: KVNamespace<string>) {}

  private getKey(key: string): string {
    return `cache:${key}`;
  }

  // ──────────────────────────────────────────────────────────────
  // Cache Operations
  // ──────────────────────────────────────────────────────────────

  private serialize<T>(data: T, ttl?: number): string {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      _type: "cache",
      data,
      createdAt: now,
      expiresAt: ttl ? now + ttl * 1000 : null
    };
    return JSON.stringify(entry);
  }

  private deserialize<T>(raw: string): T | null {
    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;

      if (entry._type !== "cache") {
        return null;
      }

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Get a cached value by key.
   *
   * @returns Deserialized value or `null` if not found / expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const raw = await this.kv.get(fullKey, "text");
      if (!raw) return null;
      return this.deserialize<T>(raw);
    } catch (error) {
      console.error("[CacheManager] Get failed:", error);
      return null;
    }
  }

  /**
   * Set a cached value with optional TTL.
   *
   * @param key - Cache key
   * @param value - Value to cache (must be JSON-serializable)
   * @param ttlSeconds - Time-to-live in seconds (omit for no expiration)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      const serialized = this.serialize(value, ttlSeconds);
      await this.kv.put(fullKey, serialized, {
        expirationTtl: ttlSeconds
      });
    } catch (error) {
      console.error("[CacheManager] Set failed:", error);
      throw error;
    }
  }

  /** Delete a cached value by key. Silently ignores missing keys. */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      await this.kv.delete(fullKey);
    } catch (error) {
      console.error("[CacheManager] Delete failed:", error);
    }
  }

  /**
   * Get cached value or compute and cache it.
   *
   * If the key exists, returns the cached value.
   * Otherwise, calls `factory()`, caches the result, and returns it.
   *
   * @param key - Cache key
   * @param factory - Async function to compute the value if not cached
   * @param ttlSeconds - Time-to-live in seconds for the cached value
   */
  async getOrSet<R>(key: string, factory: () => Promise<R>, ttlSeconds?: number): Promise<R> {
    const cached = await this.get<R>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // ──────────────────────────────────────────────────────────────
  // Regions
  // ──────────────────────────────────────────────────────────────

  /**
   * Get a versioned cache region. Entries within a region can be
   * invalidated together without listing KV keys — see `CacheRegion`.
   */
  region(name: string): CacheRegion {
    return new CacheRegion(this, name);
  }
}
