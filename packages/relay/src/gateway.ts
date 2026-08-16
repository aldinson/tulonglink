import type { EmergencyMessage } from "@tulonglink/protocol";
import type { RelayStore } from "./store.js";
import { isExpired } from "./ttl.js";

export interface GatewayUploadResult {
  uploadedMessageIds: string[];
  failedMessageIds: string[];
}

/**
 * Spec §30 (Gateway Behavior) + §48 Phase 4 ("relay queue," "retry,"
 * "server synchronization"): a device that holds relay messages —
 * whether self-originated or received from a peer — and currently has
 * Internet access uploads whatever hasn't reached the server yet.
 *
 * Deliberately not built on `packages/sync`'s `processSyncQueue`: that
 * queue removes an item once its upload succeeds, which is wrong here —
 * uploading a message must not stop this device from continuing to
 * relay it to peers that still need it (spec §45: keep advertising,
 * keep forwarding). Only TTL expiry (`RelayStore.pruneExpired`) retires
 * a message. "Retry" here is opportunistic, not backoff-scheduled: a
 * failed upload is simply eligible again the next time this runs,
 * matching §45's stated store-and-forward philosophy rather than adding
 * retry/backoff machinery `processSyncQueue` already owns for the
 * simpler single-device upload case.
 */
export async function runGatewayUpload(
  store: RelayStore,
  uploadFn: (message: EmergencyMessage) => Promise<void>,
  now: Date = new Date()
): Promise<GatewayUploadResult> {
  await store.pruneExpired(now);

  const uploadedMessageIds: string[] = [];
  const failedMessageIds: string[] = [];

  for (const id of await store.listKnownIds()) {
    if (await store.isUploaded(id)) continue;

    const message = await store.getMessage(id);
    if (!message || isExpired(message, now)) continue;

    try {
      await uploadFn(message);
      await store.markUploaded(id);
      uploadedMessageIds.push(id);
    } catch {
      failedMessageIds.push(id);
    }
  }

  return { uploadedMessageIds, failedMessageIds };
}
