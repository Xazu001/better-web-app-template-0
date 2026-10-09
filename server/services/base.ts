import { CacheManager, QueueManager } from "$/cloudflare";
import { type RateLimitResult } from "$/cloudflare/rate-limit";

import {
  type FormErrors,
  type FormResponseError,
  type FormResponseSuccess,
  RateLimitFormResult,
  getMessage,
  responses
} from "../lib/response";

import type { Database } from "$/core";
import type { Compilable } from "kysely";

export {
  RateLimitFormResult,
  type FormErrors,
  type FormResponseError,
  type FormResponseSuccess,
  type FormResponseResult
} from "../lib/response";

interface D1Result {
  success: boolean;
  results?: unknown[];
  error?: string;
}

export interface ServiceContainer {
  readonly admin: import("./admin").AdminService;
  readonly auth: import("./auth").AuthService;
  readonly user: import("./user").UserService;
  readonly preferences: import("./preferences").PreferencesService;
}

export type ServiceContainerFactory = () => ServiceContainer;

export class BaseService {
  responses = responses;
  getMessage = getMessage;

  private _services: ServiceContainerFactory | null = null;
  protected _env: Env | null = null;
  protected _cache: CacheManager;
  protected _queue: QueueManager;

  constructor(
    public request: Request,
    public db: Database
  ) {
    const noopKV = {
      get: async () => null,
      getWithMetadata: async () => null,
      put: async () => {},
      delete: async () => {},
      list: async () => ({ keys: [], list_complete: true })
    } as unknown as KVNamespace<string>;

    const noopQueue = {
      send: async () => {},
      sendBatch: async () => {}
    } as unknown as Queue;

    this._cache = new CacheManager(noopKV);
    this._queue = new QueueManager(noopQueue);
  }

  public get cache(): CacheManager {
    return this._cache;
  }

  public get queue(): QueueManager {
    return this._queue;
  }

  public setServices(factory: ServiceContainerFactory): void {
    this._services = factory;
  }

  public initializeManagers(env: Env): void {
    this._env = env;
    if (env.kv) {
      this._cache = new CacheManager(env.kv);
    }
    if (env.QUEUE) {
      this._queue = new QueueManager(env.QUEUE);
    }
  }

  protected get env(): Env {
    if (!this._env) {
      throw new Error("Environment not initialized. Ensure route uses createRouteService.");
    }
    return this._env;
  }

  protected get services(): ServiceContainer {
    if (!this._services) {
      throw new Error("Services not initialized. Call setServices() first.");
    }
    return this._services();
  }

  protected get auth() {
    return this.services.auth;
  }

  protected get user() {
    return this.services.user;
  }

  protected get admin() {
    return this.services.admin;
  }

  protected get preferences() {
    return this.services.preferences;
  }

  protected get r2(): R2Bucket {
    if (!this._env?.r2) {
      throw new Error(
        "R2 not initialized. Ensure route uses createRouteService with cloudflare context."
      );
    }
    return this._env.r2;
  }

  public test() {
    return "Hi!";
  }

  public async rateLimit(options?: { time?: number; scope?: string }): Promise<void> {
    const rl = await this.rateLimitForm(options);

    if (rl.isError) {
      throw this.responses.getTooManyRequests(rl.getError().errors);
    }
  }

  public async rateLimitForm(options?: {
    time?: number;
    scope?: string;
  }): Promise<RateLimitFormResult> {
    const result = await this.checkRateLimit(options);

    if (result && !result.allowed) {
      return new RateLimitFormResult(false, {
        general: `RATE_LIMIT_EXCEEDED_RETRY|retryAfter=${result.retryAfter}`
      });
    }

    return new RateLimitFormResult(true);
  }

  /**
   * Atomic check against the RATE_LIMITER Durable Object (one instance per
   * identifier+path key). Returns null when the binding is absent (trimmed
   * config) — rate limiting then degrades to a no-op.
   */
  private async checkRateLimit(options?: {
    time?: number;
    scope?: string;
  }): Promise<RateLimitResult | null> {
    const namespace = this._env?.RATE_LIMITER;
    if (!namespace) {
      return null;
    }

    const timeInSeconds = options?.time ?? 0.5;
    const key = `${this.getRateLimitIdentifier()}:${this.getRateLimitKey(options?.scope)}`;
    const stub = namespace.get(namespace.idFromName(key));

    return stub.check(timeInSeconds * 1000, 1);
  }

  private getRateLimitIdentifier(): string {
    const request = this.request;
    return (
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"
    );
  }

  private getRateLimitPath(): string {
    const request = this.request;
    const url = new URL(request.url);
    return url.pathname;
  }

  private getRateLimitKey(scope?: string): string {
    const path = this.getRateLimitPath();
    return scope ? `${path}:${scope}` : path;
  }

  public getRequestTime(): number {
    return Date.now();
  }

  public async exDbOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error("[Database Error]", error);

      throw this.responses.getInternalError();
    }
  }

  public async exDbBatchOperation<T extends any[]>(queries: Compilable<unknown>[]): Promise<T> {
    try {
      const statements = queries.map((query) => this.prepareQuery(query));
      const batchResults = await this.db.cf.batch(statements);

      const results = batchResults.map((d1Result: D1Result) => d1Result.results?.[0]);

      return results as T;
    } catch (error) {
      console.error("[Batch Error]", error);

      throw this.responses.getInternalError();
    }
  }

  public ok<T>(data: T): T {
    return data;
  }

  public none(): null {
    return null;
  }

  public formSuccess<T>(result: T): FormResponseSuccess<T> {
    return {
      success: true,
      result
    };
  }

  public formError(errors: FormErrors): FormResponseError {
    return {
      success: false,
      errors
    };
  }

  public throw(input: FormErrors | Response): never {
    if (input instanceof Response) {
      throw input;
    }
    throw { fields: input };
  }

  protected prepareQuery(query: Compilable<unknown>): D1PreparedStatement {
    const compiled = query.compile();

    const parameters = compiled.parameters.map((param) => {
      if (param instanceof Date) {
        return param.getTime();
      }
      if (typeof param === "string") {
        const dateParsed = Date.parse(param);
        if (!isNaN(dateParsed)) {
          return dateParsed;
        }
      }
      return param;
    });

    return this.db.cf.prepare(compiled.sql).bind(...parameters);
  }
}
