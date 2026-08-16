import type { EmergencyMessage } from "@tulonglink/protocol";
import type { RelayStore } from "./store.js";
import { isExpired } from "./ttl.js";

/** Reference `RelayStore` implementation for tests. Not used in the shipped app. */
export function createInMemoryRelayStore(seed: EmergencyMessage[] = []): RelayStore {
  const messages = new Map(seed.map((m) => [m.messageId, m]));
  const uploaded = new Set<string>();

  return {
    async hasMessage(messageId) {
      return messages.has(messageId);
    },
    async getMessage(messageId) {
      return messages.get(messageId);
    },
    async saveMessage(message) {
      messages.set(message.messageId, message);
    },
    async listKnownIds() {
      return [...messages.keys()];
    },
    async pruneExpired(now) {
      const prunedIds: string[] = [];
      for (const [id, message] of messages) {
        if (isExpired(message, now)) {
          messages.delete(id);
          uploaded.delete(id);
          prunedIds.push(id);
        }
      }
      return prunedIds;
    },
    async markUploaded(messageId) {
      uploaded.add(messageId);
    },
    async isUploaded(messageId) {
      return uploaded.has(messageId);
    },
  };
}
