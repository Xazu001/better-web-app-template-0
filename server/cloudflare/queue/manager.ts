import { getHandler } from "./registry";

import type { Services } from "$/core";
import type { Env } from "../../setup";
import type { QueueMessage, QueueMessages, QueueSendOptions, QueueStats } from "./types";

/** Max keys per delete-r2-objects message — stays well under the 128 KB queue message limit */
const R2_KEYS_CHUNK_SIZE = 1000;
/** Cloudflare Queues sendBatch accepts at most 100 messages per call */
const SEND_BATCH_LIMIT = 100;

/**
 * Central manager for all queue operations.
 *
 * Wraps Cloudflare Queue with typed message sending and batch processing.
 * Accessed via `BaseService.queue` or directly from `QueueManager` instance.
 *
 * @example
 * ```ts
 * // In a service method:
 * await this.queue.send("delete-r2-objects", { keys: ["file1.png"] });
 * ```
 */
export class QueueManager {
  constructor(private _queue: Queue<QueueMessage>) {}

  /**
   * Create a queue message with auto-generated metadata.
   */
  createMessage<T extends keyof QueueMessages>(
    type: T,
    payload: QueueMessages[T]
  ): QueueMessage<T> {
    return {
      ...payload,
      type,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };
  }

  /**
   * Send a typed message to the queue.
   *
   * @param type - Message type key from `QueueMessages` registry
   * @param payload - Message-specific data
   * @param options - Optional delay before processing
   */
  async send<T extends keyof QueueMessages>(
    type: T,
    payload: QueueMessages[T],
    options?: QueueSendOptions
  ): Promise<void> {
    const message = this.createMessage(type, payload);
    await this._queue.send(message, {
      delaySeconds: options?.delaySeconds
    });
  }

  /**
   * Send a pre-created message to the queue.
   */
  async sendMessage<T extends keyof QueueMessages>(
    message: QueueMessage<T>,
    options?: QueueSendOptions
  ): Promise<void> {
    await this._queue.send(message, {
      delaySeconds: options?.delaySeconds
    });
  }

  /**
   * Send R2 object keys for deletion, automatically chunked to stay under
   * the Cloudflare Queue message size limit (~128 KB per message).
   *
   * @param keys - R2 object keys to delete
   * @param options - Optional delay before processing
   */
  async sendR2Keys(keys: string[], options?: QueueSendOptions): Promise<void> {
    if (keys.length === 0) return;

    const chunks: string[][] = [];
    for (let i = 0; i < keys.length; i += R2_KEYS_CHUNK_SIZE) {
      chunks.push(keys.slice(i, i + R2_KEYS_CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i += SEND_BATCH_LIMIT) {
      const messages = chunks
        .slice(i, i + SEND_BATCH_LIMIT)
        .map((chunk) => ({ body: this.createMessage("delete-r2-objects", { keys: chunk }) }));

      await this._queue.sendBatch(messages, {
        delaySeconds: options?.delaySeconds
      });
    }
  }

  /**
   * Send multiple messages to the queue in batch.
   */
  async sendBatch(
    messages: Array<{
      type: keyof QueueMessages;
      payload: QueueMessages[keyof QueueMessages];
    }>,
    options?: QueueSendOptions
  ): Promise<void> {
    const queueMessages = messages.map(({ type, payload }) => ({
      body: this.createMessage(type, payload)
    }));

    await this._queue.sendBatch(queueMessages, {
      delaySeconds: options?.delaySeconds
    });
  }

  /**
   * Process a batch of queue messages.
   *
   * Called by the Cloudflare Worker queue consumer. Dispatches each
   * message to its registered handler and returns aggregate stats.
   */
  async processBatch(
    batch: MessageBatch,
    env: Env,
    ctx: ExecutionContext,
    services: Services
  ): Promise<QueueStats> {
    let processed = 0;
    let failed = 0;

    for (const message of batch.messages) {
      try {
        const msg = message.body as QueueMessage;
        const handler = await getHandler(msg.type);

        if (!handler) {
          console.error(`[Queue] No handler for: ${msg.type}`);
          failed++;
          continue;
        }

        await handler.handler(msg, env, ctx, services);
        processed++;
      } catch (error) {
        failed++;
        console.error(`[Queue] Failed:`, error);
      }
    }

    return { success: failed === 0, processed, failed };
  }
}
