/**
 * Successful queue handler result.
 *
 * @example
 * ```ts
 * return queueOk({ deleted: 5, failed: 0 });
 * ```
 */
export type QueueOk<T = void> = {
  success: true;
  data: T;
};

/**
 * Failed queue handler result.
 *
 * @example
 * ```ts
 * return queueFailed("Item not found", false);
 * ```
 */
export type QueueFailed = {
  success: false;
  error: string;
  retryable: boolean;
};

/**
 * Discriminated union for queue handler results.
 *
 * Queue handlers should return this instead of throwing or returning void.
 * The `retryable` flag on failures tells the queue manager whether to retry.
 */
export type QueueResult<T = void> = QueueOk<T> | QueueFailed;
export function queueOk(): QueueOk<void>;
export function queueOk<T>(data: T): QueueOk<T>;
export function queueOk<T>(data?: T): QueueOk<T> {
  return { success: true, data: data as T };
}
export function queueFailed(error: string, retryable: boolean = false): QueueFailed {
  return { success: false, error, retryable };
}
