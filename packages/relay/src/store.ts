import type { EmergencyMessage } from "@tulonglink/protocol";

/**
 * Persistence-agnostic, same pattern as `SyncQueueStore` in
 * packages/sync: this package never touches IndexedDB or any concrete
 * storage engine. A real implementation is IndexedDB-backed on web and
 * native-storage-backed on Android; `inMemoryRelayStore.ts` is the
 * reference implementation this package's own tests run against.
 */
export interface RelayStore {
  hasMessage(messageId: string): Promise<boolean>;
  getMessage(messageId: string): Promise<EmergencyMessage | undefined>;
  saveMessage(message: EmergencyMessage): Promise<void>;
  listKnownIds(): Promise<string[]>;

  /**
   * Removes messages whose TTL (spec §25) has passed and returns their
   * IDs. Called as a side effect of building a message summary, so an
   * expired message stops being offered to peers without a separate
   * scheduler (§45's opportunistic philosophy) and storage doesn't grow
   * unbounded (§46).
   */
  pruneExpired(now: Date): Promise<string[]>;

  /**
   * Upload status is tracked separately from peer-sync knownIds:
   * uploading a message to the server must NOT remove it from what's
   * offered to future peers — other devices in the mesh may still need
   * it relayed to them. Only `pruneExpired` retires a message.
   */
  markUploaded(messageId: string): Promise<void>;
  isUploaded(messageId: string): Promise<boolean>;
}
