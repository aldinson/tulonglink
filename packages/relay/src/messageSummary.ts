import type { SyncRequest, SyncResponse } from "@tulonglink/protocol";
import type { RelayStore } from "./store.js";

/**
 * Deliberately the simplest thing that satisfies spec §22: a plain
 * known-ID list, no Bloom filter or Merkle sync. Revisit only if field
 * testing (Phase 7) shows a real device's message count makes this too
 * large — not before, per CLAUDE.md's "smallest correct solution."
 */
export async function buildMessageSummary(store: RelayStore): Promise<{ knownIds: string[] }> {
  return { knownIds: await store.listKnownIds() };
}

export interface KnownIdsDiff {
  /** IDs the local side has and the remote side is missing — what to send. */
  toSend: string[];
  /** IDs the remote side has and the local side is missing — what to expect. */
  toRequest: string[];
}

export function diffKnownIds(local: SyncRequest | SyncResponse, remote: SyncRequest | SyncResponse): KnownIdsDiff {
  const localSet = new Set(local.knownIds);
  const remoteSet = new Set(remote.knownIds);
  return {
    toSend: local.knownIds.filter((id) => !remoteSet.has(id)),
    toRequest: remote.knownIds.filter((id) => !localSet.has(id)),
  };
}
