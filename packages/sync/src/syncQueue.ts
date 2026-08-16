/**
 * Persistence-agnostic sync orchestration (spec §32 sync directions).
 * Milestone 1 only drives Device -> Server uploads, but the retry/backoff
 * logic here doesn't know that — it just takes an upload function and a
 * store. Phase 3/4 can reuse this unchanged for Device -> Device relay by
 * swapping in a different store and upload function, instead of
 * redesigning the queue.
 *
 * Persistence itself is intentionally NOT owned by this package: the web
 * app already has an IndexedDB layer (spec §18), and a future native
 * relay layer will have its own. Duplicating a storage engine here would
 * just be a second source of truth to keep in sync.
 */
export interface QueuedItem<T> {
  id: string;
  payload: T;
  attempts: number;
}

export interface SyncQueueStore<T> {
  list(): Promise<QueuedItem<T>[]>;
  recordAttempt(id: string, error: string | null): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SyncResult {
  succeeded: string[];
  failed: string[];
}

export async function processSyncQueue<T, R>(
  store: SyncQueueStore<T>,
  upload: (payload: T) => Promise<R>,
  onSuccess: (item: QueuedItem<T>, result: R) => Promise<void>
): Promise<SyncResult> {
  const items = await store.list();
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const item of items) {
    try {
      const result = await upload(item.payload);
      await onSuccess(item, result);
      await store.remove(item.id);
      succeeded.push(item.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await store.recordAttempt(item.id, message);
      failed.push(item.id);
    }
  }

  return { succeeded, failed };
}
