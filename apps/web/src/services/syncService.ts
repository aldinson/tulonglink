import { processSyncQueue, type SyncQueueStore } from "@tulonglink/sync";
import type { CreateEmergencyInput, Emergency, EmergencyEvent } from "@tulonglink/shared";
import { getDb } from "../db/db.js";
import { authedFetch } from "./apiClient.js";
import { getNetworkState } from "./network.js";

const SYNC_INTERVAL_MS = 30_000;

const store: SyncQueueStore<CreateEmergencyInput> = {
  async list() {
    const db = await getDb();
    const items = await db.getAll("syncQueue");
    return items.map((i) => ({ id: i.incidentId, payload: i.payload, attempts: i.attempts }));
  },
  async recordAttempt(id, _error) {
    const db = await getDb();
    const item = await db.get("syncQueue", id);
    if (item) await db.put("syncQueue", { ...item, attempts: item.attempts + 1 });
  },
  async remove(id) {
    const db = await getDb();
    await db.delete("syncQueue", id);
  },
};

async function markServerReceived(incidentId: string, serverRecord: Emergency): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const tx = db.transaction(["emergencies", "emergencyEvents"], "readwrite");
  // The server response is authoritative — store it verbatim rather than
  // patching our local copy, so any server-side normalization wins.
  await tx.objectStore("emergencies").put(serverRecord);
  const event: EmergencyEvent = {
    id: crypto.randomUUID(),
    incidentId,
    state: "SERVER_RECEIVED",
    occurredAt: now,
  };
  await tx.objectStore("emergencyEvents").put(event);
  await tx.done;
}

let syncing = false;

/**
 * Device -> Server sync only (spec §32). The upload function and store
 * are the only Milestone-1-specific pieces; processSyncQueue itself
 * (packages/sync) is transport-agnostic so Phase 3/4 can drive the same
 * queue over BLE without redesigning this.
 */
export async function triggerSync(): Promise<void> {
  if (syncing) return;
  if (getNetworkState() === "OFFLINE") return;

  syncing = true;
  try {
    // A session that can't be refreshed (SessionExpiredError) surfaces
    // here the same as a dropped connection: processSyncQueue records it
    // as a retryable failure and leaves the item queued. Local data is
    // never touched by an auth failure; the next successful login (or
    // token refresh) picks the queue back up on the next tick.
    await processSyncQueue(
      store,
      (payload) => authedFetch<Emergency>("/api/incidents", { method: "POST", body: JSON.stringify(payload) }),
      async (item, result) => {
        await markServerReceived(item.id, result);
      }
    );
  } finally {
    syncing = false;
  }
}

export function startAutoSync(): () => void {
  const onOnline = () => void triggerSync();
  window.addEventListener("online", onOnline);
  const interval = window.setInterval(() => void triggerSync(), SYNC_INTERVAL_MS);
  void triggerSync();

  return () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(interval);
  };
}
