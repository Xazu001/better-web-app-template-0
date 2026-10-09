import { DurableObject } from "cloudflare:workers";

import type { RateLimitResult } from "./types";

interface CounterState {
  count: number;
  firstRequest: number;
}

const STORAGE_KEY = "counter";

/**
 * Atomic sliding-window rate limiter.
 *
 * One Durable Object instance per key (`idFromName(identifier:path)`), so all
 * writes for a key are serialized by the DO — unlike KV, where concurrent
 * get→put cycles overwrite each other and reads are only eventually consistent.
 *
 * The storage record self-cleans via an alarm set one window past the last
 * write, so abandoned keys don't accumulate.
 */
export class RateLimiterDO extends DurableObject {
  async check(windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    const now = Date.now();
    const state = await this.ctx.storage.get<CounterState>(STORAGE_KEY);

    if (!state || now - state.firstRequest >= windowMs) {
      await this.ctx.storage.put(STORAGE_KEY, { count: 1, firstRequest: now });
      await this.ctx.storage.setAlarm(now + windowMs + 60_000);
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (state.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, Math.ceil((windowMs - (now - state.firstRequest)) / 1000))
      };
    }

    await this.ctx.storage.put(STORAGE_KEY, {
      count: state.count + 1,
      firstRequest: state.firstRequest
    });
    return { allowed: true, remaining: maxRequests - state.count - 1 };
  }

  async reset(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
