import { PROTOCOL_VERSION, isProtocolVersionSupported, type EmergencyMessage } from "@tulonglink/protocol";
import { buildMessageSummary, diffKnownIds } from "./messageSummary.js";
import type { RelayStore } from "./store.js";
import type { PeerConnection } from "./transport.js";
import { validateEmergencyMessage } from "./validation.js";

export interface SyncOutcome {
  incompatibleProtocolVersion: boolean;
  sentMessageIds: string[];
  storedMessageIds: string[];
  rejectedMessageIds: string[];
}

const INCOMPATIBLE: SyncOutcome = {
  incompatibleProtocolVersion: true,
  sentMessageIds: [],
  storedMessageIds: [],
  rejectedMessageIds: [],
};

/**
 * Drives one full peer sync (spec §21): hello -> version check -> summary
 * exchange -> diff -> transfer -> validate -> store. The sequence in §21
 * stops at "Store" — there is no wire-level ack step here; that's the
 * Phase 4 ack-propagation concept (§30-31), layered on top of this, not
 * part of it.
 *
 * `role` exists because summary exchange needs one side to send first —
 * the BLE central (the device that opened the connection) is always
 * INITIATOR. Both roles run the identical validate/store/dedup logic.
 */
export async function runSync(
  connection: PeerConnection,
  store: RelayStore,
  localDeviceId: string,
  role: "INITIATOR" | "RESPONDER"
): Promise<SyncOutcome> {
  await connection.send({
    type: "DEVICE_HELLO",
    hello: { deviceId: localDeviceId, protocolVersion: PROTOCOL_VERSION, capabilities: [] },
  });

  const helloFrame = await connection.receive();
  if (helloFrame.type !== "DEVICE_HELLO") {
    throw new Error(`expected DEVICE_HELLO, got ${helloFrame.type}`);
  }
  if (!isProtocolVersionSupported(helloFrame.hello.protocolVersion)) {
    return INCOMPATIBLE;
  }

  const localSummary = await buildMessageSummary(store);
  const remoteSummary = await (async () => {
    if (role === "INITIATOR") {
      await connection.send({ type: "SYNC_REQUEST", request: localSummary });
      const responseFrame = await connection.receive();
      if (responseFrame.type !== "SYNC_RESPONSE") {
        throw new Error(`expected SYNC_RESPONSE, got ${responseFrame.type}`);
      }
      return responseFrame.response;
    }
    const requestFrame = await connection.receive();
    if (requestFrame.type !== "SYNC_REQUEST") {
      throw new Error(`expected SYNC_REQUEST, got ${requestFrame.type}`);
    }
    await connection.send({ type: "SYNC_RESPONSE", response: localSummary });
    return requestFrame.request;
  })();

  const { toSend, toRequest } = diffKnownIds(localSummary, remoteSummary);

  // Both directions run concurrently — they're independent channels
  // (see simulatedTransport.ts), so there's no ordering dependency
  // between "the messages I'm sending" and "the messages I'm expecting."
  const sendLoop = (async () => {
    for (const id of toSend) {
      const message = await store.getMessage(id);
      if (message) await connection.send({ type: "EMERGENCY_MESSAGE", message });
    }
  })();

  const receiveLoop = (async () => {
    const received: EmergencyMessage[] = [];
    for (let i = 0; i < toRequest.length; i++) {
      const frame = await connection.receive();
      if (frame.type === "EMERGENCY_MESSAGE") received.push(frame.message);
    }
    return received;
  })();

  const [, receivedMessages] = await Promise.all([sendLoop, receiveLoop]);

  const storedMessageIds: string[] = [];
  const rejectedMessageIds: string[] = [];
  for (const message of receivedMessages) {
    // Defense in depth for spec §24 ("DO NOT DUPLICATE, DO NOT PROCESS
    // AGAIN") — the summary diff already should have excluded known
    // IDs, but this is the actual enforcement point regardless of why a
    // duplicate arrived (e.g. a second connection racing this one).
    if (await store.hasMessage(message.messageId)) continue;

    const result = await validateEmergencyMessage(message);
    if (result.valid) {
      await store.saveMessage(message);
      storedMessageIds.push(message.messageId);
    } else {
      rejectedMessageIds.push(message.messageId);
    }
  }

  return { incompatibleProtocolVersion: false, sentMessageIds: toSend, storedMessageIds, rejectedMessageIds };
}
