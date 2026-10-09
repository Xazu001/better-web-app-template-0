import type { CacheManager } from "./manager";

/**
 * Fallback TTL for region writes — guarantees that entries orphaned by a
 * version bump always expire, even when the caller passes no TTL.
 */
const REGION_FALLBACK_TTL = 24 * 60 * 60;

/**
 * Versioned cache region — a logical namespace whose entries can be
 * invalidated together without listing KV keys.
 *
 * Each region stores a monotonically increasing version counter in KV
 * (`__ver:<region>`). Every data key embeds the current version, so
 * incrementing the version orphans all stale entries (they expire via TTL).
 *
 * - `invalidate()` (no key) → bumps the version, orphaning **all** entries
 *   in the region. One KV write, no listing needed.
 * - `invalidate(key)` → deletes only the single versioned entry, leaving
 *   siblings untouched.
 * - `update(key, updater)` → mutates the cached value **in place** — warm,
 *   no cold miss. No-op on miss; skips the write when the updater returns
 *   the same reference.
 *
 * @example
 * ```ts
 * // Single-entry region (one cached value per version)
 * await this.cache.region("home").getOrSet(undefined, () => fetchHome(), 600);
 * await this.cache.region("home").invalidate();
 *
 * // Keyed region (many entries, e.g. per-entry)
 * await this.cache.region("item").getOrSet(itemId, () => fetchItem(itemId), 3600);
 * await this.cache.region("item").invalidate(itemId);  // just one entry
 * await this.cache.region("item").invalidate();        // all entries
 * ```
 */
export class CacheRegion {
  constructor(
    private cache: CacheManager,
    private region: string
  ) {}

  private get versionKey(): string {
    return `__ver:${this.region}`;
  }

  private async currentVersion(): Promise<number> {
    const raw = await this.cache.get<string>(this.versionKey);
    return raw ? parseInt(raw, 10) : 1;
  }

  private dataKey(key: string | number | undefined, version: number): string {
    return key !== undefined ? `${this.region}:${key}:v${version}` : `${this.region}:v${version}`;
  }

  /**
   * Get a cached value, or compute and cache it.
   *
   * @param key - Sub-key within the region (omit for single-entry regions)
   * @param factory - Async function to compute the value if not cached
   * @param ttl - TTL in seconds (falls back to `REGION_FALLBACK_TTL`)
   */
  async getOrSet<T>(
    key: string | number | undefined,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const version = await this.currentVersion();
    return this.cache.getOrSet(this.dataKey(key, version), factory, ttl ?? REGION_FALLBACK_TTL);
  }

  /** Get a cached value, or `null` if not found / expired. */
  async get<T>(key?: string | number): Promise<T | null> {
    const version = await this.currentVersion();
    return this.cache.get<T>(this.dataKey(key, version));
  }

  /** Set a value in the region. */
  async set<T>(key: string | number | undefined, value: T, ttl?: number): Promise<void> {
    const version = await this.currentVersion();
    await this.cache.set(this.dataKey(key, version), value, ttl ?? REGION_FALLBACK_TTL);
  }

  /**
   * Apply an updater directly to the cached value — warm in-place mutation.
   *
   * No-op when the entry is missing (cold — the next read repopulates it);
   * skips the write when the updater returns the same reference.
   */
  async update<T>(
    key: string | number | undefined,
    updater: (value: T) => T,
    ttl?: number
  ): Promise<void> {
    const version = await this.currentVersion();
    const dataKey = this.dataKey(key, version);
    const current = await this.cache.get<T>(dataKey);

    if (current === null) return;

    const next = updater(current);
    if (next === current) return;

    await this.cache.set(dataKey, next, ttl ?? REGION_FALLBACK_TTL);
  }

  /**
   * Invalidate the entire region (bumps version — all entries orphaned).
   *
   * Pass a `key` to delete only that entry instead.
   */
  async invalidate(key?: string | number): Promise<void> {
    const version = await this.currentVersion();

    if (key === undefined) {
      await this.cache.set(this.versionKey, (version + 1).toString());
      return;
    }

    await this.cache.delete(this.dataKey(key, version));
  }
}
