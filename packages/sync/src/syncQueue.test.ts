import { describe, expect, it } from "vitest";
import { processSyncQueue, type QueuedItem, type SyncQueueStore } from "./syncQueue.js";

function makeInMemoryStore<T>(initial: QueuedItem<T>[]): SyncQueueStore<T> & { items: QueuedItem<T>[] } {
  const items = [...initial];
  return {
    items,
    async list() {
      return [...items];
    },
    async recordAttempt(id, error) {
      const item = items.find((i) => i.id === id);
      if (item) item.attempts += 1;
      void error;
    },
    async remove(id) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) items.splice(idx, 1);
    },
  };
}

describe("processSyncQueue", () => {
  it("removes an item from the queue and fires onSuccess when upload succeeds", async () => {
    const store = makeInMemoryStore([{ id: "A1", payload: { foo: "bar" }, attempts: 0 }]);
    const uploaded: string[] = [];

    const result = await processSyncQueue(
      store,
      async (payload) => ({ ok: true, payload }),
      async (item) => {
        uploaded.push(item.id);
      }
    );

    expect(result.succeeded).toEqual(["A1"]);
    expect(result.failed).toEqual([]);
    expect(uploaded).toEqual(["A1"]);
    expect(store.items).toHaveLength(0);
  });

  it("leaves a failed item queued and increments its attempt count, without calling onSuccess", async () => {
    const store = makeInMemoryStore([{ id: "A1", payload: {}, attempts: 2 }]);
    let onSuccessCalled = false;

    const result = await processSyncQueue(
      store,
      async () => {
        throw new Error("network unavailable");
      },
      async () => {
        onSuccessCalled = true;
      }
    );

    expect(result.failed).toEqual(["A1"]);
    expect(result.succeeded).toEqual([]);
    expect(onSuccessCalled).toBe(false);
    expect(store.items).toHaveLength(1);
    expect(store.items[0]?.attempts).toBe(3);
  });

  it("processes each item independently — one failure doesn't block another from succeeding", async () => {
    const store = makeInMemoryStore([
      { id: "OK", payload: { fail: false }, attempts: 0 },
      { id: "FAIL", payload: { fail: true }, attempts: 0 },
    ]);

    const result = await processSyncQueue(
      store,
      async (payload: { fail: boolean }) => {
        if (payload.fail) throw new Error("nope");
        return "done";
      },
      async () => {}
    );

    expect(result.succeeded).toEqual(["OK"]);
    expect(result.failed).toEqual(["FAIL"]);
  });
});
