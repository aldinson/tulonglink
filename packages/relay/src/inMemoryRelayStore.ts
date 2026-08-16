import type { EmergencyMessage } from "@tulonglink/protocol";
import type { RelayStore } from "./store.js";

/** Reference `RelayStore` implementation for tests. Not used in the shipped app. */
export function createInMemoryRelayStore(seed: EmergencyMessage[] = []): RelayStore {
  const messages = new Map(seed.map((m) => [m.messageId, m]));

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
  };
}
