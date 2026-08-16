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
}
