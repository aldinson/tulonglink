import { describe, expect, it } from "vitest";
import type { CreateEmergencyInput } from "@tulonglink/shared";
import type { RelayFrame } from "@tulonglink/protocol";
import { buildEmergencyMessage } from "./message.js";
import { createInMemoryRelayStore } from "./inMemoryRelayStore.js";
import { createSimulatedPeerPair } from "./simulatedTransport.js";
import { runSync } from "./handshake.js";
import type { PeerConnection } from "./transport.js";

function makePayload(incidentId: string): CreateEmergencyInput {
  return {
    incidentId,
    originDeviceId: "device-a",
    communityId: "demo-community",
    category: "MEDICAL",
    description: "Person collapsed and needs assistance",
    priority: "CRITICAL",
    createdAt: "2026-08-16T08:00:00.000Z",
    originTimestamp: "2026-08-16T08:00:00.000Z",
    latitude: 10.123456,
    longitude: 123.123456,
    locationAccuracy: 12,
    altitude: null,
    locationTimestamp: null,
    manualLocation: false,
    messageVersion: 1,
    expiresAt: "2026-08-17T08:00:00.000Z",
  };
}

describe("runSync", () => {
  it("transfers a message A has and B doesn't, in one connection", async () => {
    const message = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z");
    const storeA = createInMemoryRelayStore([message]);
    const storeB = createInMemoryRelayStore([]);
    const [connA, connB] = createSimulatedPeerPair("device-a", "device-b");

    const [outcomeA, outcomeB] = await Promise.all([
      runSync(connA, storeA, "device-a", "INITIATOR"),
      runSync(connB, storeB, "device-b", "RESPONDER"),
    ]);

    expect(outcomeA.sentMessageIds).toEqual(["device-a:msg-1"]);
    expect(outcomeB.storedMessageIds).toEqual(["device-a:msg-1"]);
    expect(await storeB.hasMessage("device-a:msg-1")).toBe(true);
  });

  it("does nothing when both sides already know the same messages", async () => {
    const message = await buildEmergencyMessage(makePayload("device-a:msg-1"), "device-a", "2026-08-16T08:00:00.000Z");
    const storeA = createInMemoryRelayStore([message]);
    const storeB = createInMemoryRelayStore([message]);
    const [connA, connB] = createSimulatedPeerPair("device-a", "device-b");

    const [outcomeA, outcomeB] = await Promise.all([
      runSync(connA, storeA, "device-a", "INITIATOR"),
      runSync(connB, storeB, "device-b", "RESPONDER"),
    ]);

    expect(outcomeA.sentMessageIds).toEqual([]);
    expect(outcomeB.storedMessageIds).toEqual([]);
  });

  it("short-circuits on an unsupported protocol version without exchanging summaries", async () => {
    const sent: RelayFrame[] = [];
    const fakeConnection: PeerConnection = {
      peerId: "device-b",
      async send(frame) {
        sent.push(frame);
      },
      async receive() {
        return { type: "DEVICE_HELLO", hello: { deviceId: "device-b", protocolVersion: 99, capabilities: [] } };
      },
      async close() {},
    };

    const outcome = await runSync(fakeConnection, createInMemoryRelayStore(), "device-a", "INITIATOR");

    expect(outcome.incompatibleProtocolVersion).toBe(true);
    expect(outcome.storedMessageIds).toEqual([]);
    expect(sent).toEqual([
      { type: "DEVICE_HELLO", hello: { deviceId: "device-a", protocolVersion: 1, capabilities: [] } },
    ]);
  });
});
